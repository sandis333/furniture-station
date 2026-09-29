import { WebSocketService } from './websocket.js';
import { ProtectionOverlay } from './protection_overlay.js';


export class App {
  constructor() {
    this.webSocketService = new WebSocketService();
    this.protectionOverlay = new ProtectionOverlay();
    this.isAuthenticated = false;
    this.cardId = null;
    this.currentView = 'order-types';
    this.selectedOrderType = null;
    this.selectedOrder = null;
    this.selectedArticle = null;
    this.options = null;
    this.selectedOptionIndex = null;
    this.selectedKids = new Set();
    this.messageTimer = null;
    this.elements = {
      backButton: document.getElementById('backButton'),
      breadcrumb: document.getElementById('breadcrumb'),
      connectionIndicator: document.getElementById('connectionIndicator'),
      scannerStatus: document.getElementById('scannerStatus'),
      userStatus: document.getElementById('userStatus'),
      contentArea: document.getElementById('contentArea'),
      messageBox: document.getElementById('messageBox'),
    };
  }

  init() {
    this.protectionOverlay.init();
    this.webSocketService.onConnectionChange(this.handleConnectionChange.bind(this));
    this.webSocketService.onScannerStatusChange(this.handleScannerStatusChange.bind(this));
    this.webSocketService.onAuthStatusChange(this.handleAuthStatusChange.bind(this));
    this.webSocketService.onTerminalDataChange(this.handleTerminalDataChange.bind(this));
    this.elements.backButton.addEventListener('click', () => this.goBack());
  }

  async request(endpoint, options = {}) {
    const response = await fetch(endpoint, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    let body;
    try {
      body = await response.json();
    } catch (_) {
      body = { status: '0', message: 'Servera atbilde nav nolasāma' };
    }
    if (!response.ok) {
      throw new Error(body.message || 'Neizdevās sazināties ar serveri');
    }
    return body;
  }

  async restoreWorkflow() {
    if (!this.isAuthenticated) return;
    this.showLoading('Pārbauda jau aktīvu izņemšanu…');
    try {
      const state = await this.request('/api/workflow');
      if (state.session) {
        this.renderSession(state.session);
      } else {
        this.renderOrderTypes();
      }
    } catch (error) {
      this.renderError(error.message, () => this.restoreWorkflow());
    }
  }

  renderOrderTypes() {
    if (!this.isAuthenticated) return;
    this.currentView = 'order-types';
    this.selectedOrderType = null;
    this.selectedOrder = null;
    this.selectedArticle = null;
    this.options = null;
    this.selectedOptionIndex = null;
    this.selectedKids.clear();
    this.updateHeader('Izvēlieties MBK vai KPA', false);
    this.elements.contentArea.innerHTML = `
      <section class="view-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Darba uzdevuma tips</p>
            <h2>Ko vēlaties apstrādāt?</h2>
          </div>
        </div>
        <div class="choice-grid">
          <button class="choice-card order-type-card" type="button" data-type="MBK">
            <span class="choice-type">MBK</span>
            <strong>MBK saraksts</strong>
          </button>
          <button class="choice-card order-type-card" type="button" data-type="KPA">
            <span class="choice-type">KPA</span>
            <strong>KPA saraksts</strong>
          </button>
        </div>
      </section>
    `;
    this.elements.contentArea.querySelectorAll('.order-type-card').forEach((button) => {
      button.addEventListener('click', () => this.loadOrders(button.dataset.type));
    });
  }

  async loadOrders(orderType) {
    if (!this.isAuthenticated) return;
    this.currentView = 'orders';
    this.selectedOrderType = orderType;
    this.selectedOrder = null;
    this.selectedArticle = null;
    this.options = null;
    this.selectedOptionIndex = null;
    this.selectedKids.clear();
    this.showLoading(`Ielādē ${orderType}…`);
    try {
      const response = await this.request(
        `/api/orders?order_type=${encodeURIComponent(orderType)}`,
      );
      if (response.active_session) {
        this.renderSession(response.active_session);
        return;
      }
      this.renderOrders(response.data || []);
    } catch (error) {
      this.renderError(error.message, () => this.loadOrders(orderType));
    }
  }

  renderOrders(orders) {
    this.currentView = 'orders';
    this.updateHeader(`Izvēlieties ${this.selectedOrderType}`, true);
    const cards = orders.map((order) => `
      <button class="choice-card order-card" type="button"
              data-type="${this.escapeHtml(order.order_type)}"
              data-number="${this.escapeHtml(order.order_number)}">
        <span class="choice-type">${this.escapeHtml(order.order_type)}</span>
        <strong>${this.escapeHtml(order.order_number)}</strong>
      </button>
    `).join('');
    this.elements.contentArea.innerHTML = `
      <section class="view-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">1. solis</p>
            <h2>Darba uzdevums</h2>
          </div>
          <input id="searchInput" class="search-input" type="search" placeholder="Meklēt ${this.selectedOrderType}">
        </div>
        <div id="choiceGrid" class="choice-grid">
          ${cards || '<p class="empty-state">Pašlaik nav izņemšanai pieejamu komplektu.</p>'}
        </div>
      </section>
    `;
    this.elements.contentArea.querySelectorAll('.order-card').forEach((button) => {
      button.addEventListener('click', () => this.selectOrder({
        order_type: button.dataset.type,
        order_number: button.dataset.number,
      }));
    });
    this.bindSearch();
  }

  async selectOrder(order) {
    this.selectedOrder = order;
    this.showLoading('Ielādē artikulus…');
    try {
      const response = await this.request('/api/articles', {
        method: 'POST',
        body: JSON.stringify(order),
      });
      this.renderArticles(response.data || []);
    } catch (error) {
      this.renderError(error.message, () => this.selectOrder(order));
    }
  }

  renderArticles(articles) {
    this.currentView = 'articles';
    this.updateHeader(
      `${this.selectedOrder.order_type} ${this.selectedOrder.order_number} · izvēlieties artikulu`,
      true,
    );
    const cards = articles.map((article) => `
      <button class="choice-card article-card" type="button"
              data-article="${this.escapeHtml(article.article)}">
        <strong>${this.escapeHtml(article.article)}</strong>
        <span>Pieprasīti: ${article.requested_count}</span>
        <span>Izņemti: ${article.extracted_count}</span>
        <span class="remaining">Atlikuši: ${article.remaining_count}</span>
      </button>
    `).join('');
    this.elements.contentArea.innerHTML = `
      <section class="view-section">
        <div class="section-heading">
          <div><p class="eyebrow">2. solis</p><h2>Artikuls</h2></div>
          <input id="searchInput" class="search-input" type="search" placeholder="Meklēt artikulu">
        </div>
        <div id="choiceGrid" class="choice-grid">
          ${cards || '<p class="empty-state">Šim uzdevumam nav izņemšanai pieejamu artikulu.</p>'}
        </div>
      </section>
    `;
    this.elements.contentArea.querySelectorAll('.article-card').forEach((button) => {
      button.addEventListener('click', () => this.selectArticle(button.dataset.article));
    });
    this.bindSearch();
  }

  async selectArticle(article) {
    this.selectedArticle = article;
    this.selectedOptionIndex = null;
    this.selectedKids.clear();
    this.showLoading('Aprēķina pieejamos komplektus…');
    try {
      const response = await this.request('/api/options', {
        method: 'POST',
        body: JSON.stringify({ ...this.selectedOrder, article }),
      });
      this.options = response.data;
      this.renderOptions();
    } catch (error) {
      this.renderError(error.message, () => this.selectArticle(article));
    }
  }

  renderOptions() {
    this.currentView = 'options';
    this.updateHeader(
      `${this.selectedOrder.order_number} · ${this.selectedArticle}`,
      true,
    );
    const selectedCount = this.getSelectedCount();
    const options = this.options.options.map((option, optionIndex) => {
      const selected = this.selectedOptionIndex === optionIndex;
      const locations = option.kids
        .map((kid) => `${kid.cabinet}:${kid.shelf}`)
        .join(', ');
      return `
        <button class="kit-option ${selected ? 'selected' : ''}" type="button"
                data-option-index="${optionIndex}">
          <span class="kit-number">${option.kit_count}</span>
          <span class="kit-label">komplekti</span>
          <span class="kid-label">${option.kids.length} KID</span>
          <span class="location-label">${this.escapeHtml(locations)}</span>
        </button>
      `;
    }).join('');
    this.elements.contentArea.innerHTML = `
      <section class="view-section options-view">
        <div class="section-heading">
          <div><p class="eyebrow">3. solis</p><h2>Cik komplektus izņemt?</h2></div>
        </div>
        <div class="summary-strip">
          <div><span>Pieprasīti</span><strong>${this.options.requested_count}</strong></div>
          <div><span>Jau izņemti</span><strong>${this.options.extracted_count}</strong></div>
          <div><span>Vēl nepieciešami</span><strong>${this.options.remaining_count}</strong></div>
          <div class="selected-summary"><span>Izvēlēti</span><strong>${selectedCount}</strong></div>
        </div>
        <p class="selection-help">Izvēlieties komplektu skaitu. Katra opcija automātiski iekļauj visus tai nepieciešamos KID.</p>
        <div class="kit-grid">${options || '<p class="empty-state">Nav pieejamas pilnu komplektu KID kombinācijas.</p>'}</div>
        <button id="confirmSelection" class="primary-button confirm-button" type="button"
                ${selectedCount === 0 ? 'disabled' : ''}>
          Izņemt izvēlētos komplektus
        </button>
      </section>
    `;
    this.elements.contentArea.querySelectorAll('.kit-option').forEach((button) => {
      button.addEventListener('click', () => this.selectOption(Number(button.dataset.optionIndex)));
    });
    document.getElementById('confirmSelection').addEventListener('click', () => this.startSession());
  }

  selectOption(optionIndex) {
    const option = this.options?.options?.[optionIndex];
    if (!option) return;
    this.selectedOptionIndex = optionIndex;
    this.selectedKids = new Set(option.kids.map((kid) => kid.kid));
    this.renderOptions();
  }

  getSelectedCount() {
    if (this.selectedOptionIndex === null) return 0;
    return this.options?.options?.[this.selectedOptionIndex]?.kit_count || 0;
  }

  async startSession() {
    if (this.selectedKids.size === 0) return;
    this.showLoading('Sagatavo KID skenēšanu…');
    try {
      const response = await this.request('/api/start-session', {
        method: 'POST',
        body: JSON.stringify({
          ...this.selectedOrder,
          article: this.selectedArticle,
          selected_kids: Array.from(this.selectedKids),
        }),
      });
      if (response.status !== '1' || !response.session) {
        throw new Error(response.message || 'Sesiju neizdevās sākt');
      }
      this.showMessage(response.message, 'info');
      this.renderSession(response.session);
    } catch (error) {
      this.renderError(error.message, () => this.selectArticle(this.selectedArticle));
    }
  }

  renderSession(session) {
    if (session.status === 'COMPLETED') {
      this.renderComplete(session);
      return;
    }
    this.currentView = 'scanning';
    this.updateHeader(`${session.order_number} · ${session.article}`, false);
    const rows = session.kids.map((kid) => `
      <li class="scan-item ${kid.scanned ? 'scanned' : ''}">
        <span class="scan-check">${kid.scanned ? '✓' : '○'}</span>
        <div><strong>KID ${kid.kid}</strong><span>${this.escapeHtml(kid.cabinet)}:${this.escapeHtml(kid.shelf)}</span></div>
        <span class="scan-count">obligāts</span>
      </li>
    `).join('');
    this.elements.contentArea.innerHTML = `
      <section class="view-section scan-view">
        <p class="eyebrow">4. solis</p>
        <h2>Paņemiet konteinerus un skenējiet KID</h2>
        <div class="scan-progress">
          <strong>${session.kids.length - session.remaining_kids.length}/${session.kids.length}</strong>
          <span>KID noskenēti</span>
        </div>
        <ul class="scan-list">${rows}</ul>
        <button id="cancelSession" class="danger-button" type="button">Atcelt izņemšanu</button>
      </section>
    `;
    document.getElementById('cancelSession').addEventListener('click', () => this.cancelSession(session.session_id));
  }

  renderComplete(session) {
    this.currentView = 'complete';
    this.updateHeader(`${session.order_number} · ${session.article}`, false);
    const headline = session.order_complete
      ? 'Visa nepieciešamā furnitūra ir izņemta'
      : 'Visi izvēlētie komplekti ir izņemti';
    this.elements.contentArea.innerHTML = `
      <section class="complete-view">
        <div class="success-icon">✓</div>
        <p class="eyebrow">Process pabeigts</p>
        <h2>${headline}</h2>
        <p>Šajā reizē noskenēti ${session.scanned_count} komplekti.</p>
        <button id="newProcess" class="primary-button" type="button">Jauna izņemšana</button>
      </section>
    `;
    document.getElementById('newProcess').addEventListener('click', () => this.renderOrderTypes());
  }

  async cancelSession(sessionId) {
    if (!window.confirm('Vai tiešām atcelt atlikušo KID izņemšanu?')) return;
    try {
      const response = await this.request('/api/cancel-session', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (response.status !== '1') throw new Error(response.message);
      this.showMessage(response.message, 'info');
      this.renderOrderTypes();
    } catch (error) {
      this.showMessage(error.message, 'error');
    }
  }

  handleConnectionChange(isConnected) {
    this.elements.connectionIndicator.textContent = isConnected ? '● Stacija darbojas' : '● Stacija nedarbojas';
    this.elements.connectionIndicator.className = `indicator ${isConnected ? 'connected' : 'disconnected'}`;
  }

  handleScannerStatusChange(status) {
    this.elements.scannerStatus.textContent = `Skeneris: ${status.message.toLowerCase()}`;
    this.elements.scannerStatus.className = `indicator ${status.status === 1 ? 'scanner-connected' : 'scanner-waiting'}`;
  }

  handleAuthStatusChange(status) {
    const wasAuthenticated = this.isAuthenticated;
    const previousCardId = this.cardId;
    this.isAuthenticated = Boolean(status?.status);
    this.cardId = this.isAuthenticated ? status.code : null;
    this.protectionOverlay.handleStatusUpdate(status);

    this.elements.userStatus.textContent = this.isAuthenticated
      ? `Darbinieks: ${status.username || 'autorizēts'}`
      : 'Darbinieks: nav autorizēts';
    this.elements.userStatus.className = `indicator ${this.isAuthenticated ? 'authorized' : 'unauthorized'}`;

    if (!this.isAuthenticated) {
      this.currentView = 'locked';
      this.selectedOrderType = null;
      this.selectedOrder = null;
      this.selectedArticle = null;
      this.options = null;
      this.selectedOptionIndex = null;
      this.selectedKids.clear();
      return;
    }

    if (!wasAuthenticated || previousCardId !== this.cardId) {
      this.restoreWorkflow();
    }
  }

  handleTerminalDataChange(data) {
    if (!data || (!data.message && !data.session)) return;
    if (data.message) {
      this.showMessage(data.message, data.message_type === 'ERROR' ? 'error' : 'success');
    }
    if (data.session) this.renderSession(data.session);
  }

  goBack() {
    if (this.currentView === 'orders') {
      this.renderOrderTypes();
    } else if (this.currentView === 'articles') {
      this.loadOrders(this.selectedOrderType);
    } else if (this.currentView === 'options') {
      this.selectOrder(this.selectedOrder);
    }
  }

  bindSearch() {
    const search = document.getElementById('searchInput');
    if (!search) return;
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      document.querySelectorAll('#choiceGrid .choice-card').forEach((card) => {
        card.classList.toggle('hidden', !card.textContent.toLowerCase().includes(query));
      });
    });
  }

  updateHeader(text, showBack) {
    this.elements.breadcrumb.textContent = text;
    this.elements.backButton.classList.toggle('hidden', !showBack);
  }

  showLoading(message) {
    this.elements.contentArea.innerHTML = `<div class="loading-card"><span class="spinner"></span>${this.escapeHtml(message)}</div>`;
  }

  renderError(message, retry) {
    this.updateHeader('Radās kļūda', false);
    this.elements.contentArea.innerHTML = `
      <section class="error-view"><h2>${this.escapeHtml(message)}</h2><button class="primary-button" id="retryButton">Mēģināt vēlreiz</button></section>
    `;
    document.getElementById('retryButton').addEventListener('click', retry);
  }

  showMessage(message, type) {
    clearTimeout(this.messageTimer);
    this.elements.messageBox.textContent = message;
    this.elements.messageBox.className = `message-box ${type}`;
    this.messageTimer = setTimeout(() => this.elements.messageBox.classList.add('hidden'), 6000);
  }

  escapeHtml(value) {
    const element = document.createElement('div');
    element.textContent = String(value ?? '');
    return element.innerHTML;
  }

  destroy() {
    this.webSocketService.disconnect();
    this.protectionOverlay.destroy();
  }
}
