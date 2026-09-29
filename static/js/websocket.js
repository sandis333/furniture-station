/**
 * WebSocket service for managing connection to the backend
 * Provides observable-like pattern for state updates
 */
export class WebSocketService {
  constructor() {
    /** @type {WebSocket|null} */
    this.ws = null;

    /** @type {boolean} */
    this.isConnected = false;

    /** @type {import('./models.js').ScannerStatus} */
    this.scannerStatus = { status: 0, message: 'GAIDA SAVIENOJUMU' };

    /** @type {import('./models.js').AuthStatus} */
    this.authStatus = {
      status: false,
      code: null,
      username: null,
      message: 'Novietojiet kartiņu uz lasītāja',
      reason: 'waiting'
    };

    /** @type {import('./models.js').TerminalData} */
    this.terminalData = {
      matrix: null,
      message: null,
      message_type: 'INFO',
      status: '0',
      session: null
    };

    // Event listeners for state changes
    this.listeners = {
      isConnected: [],
      scannerStatus: [],
      authStatus: [],
      terminalData: []
    };

    // Auto-connect on initialization
    this.connect();
  }

  /**
   * Subscribe to connection status changes
   * @param {Function} callback - Called with boolean when connection status changes
   * @returns {Function} Unsubscribe function
   */
  onConnectionChange(callback) {
    this.listeners.isConnected.push(callback);
    // Immediately call with current value
    callback(this.isConnected);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.isConnected.indexOf(callback);
      if (index > -1) {
        this.listeners.isConnected.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to scanner status changes
   * @param {Function} callback - Called with ScannerStatus when it changes
   * @returns {Function} Unsubscribe function
   */
  onScannerStatusChange(callback) {
    this.listeners.scannerStatus.push(callback);
    // Immediately call with current value
    callback(this.scannerStatus);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.scannerStatus.indexOf(callback);
      if (index > -1) {
        this.listeners.scannerStatus.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to card authorization changes.
   * @param {Function} callback - Called with AuthStatus when it changes
   * @returns {Function} Unsubscribe function
   */
  onAuthStatusChange(callback) {
    this.listeners.authStatus.push(callback);
    // Immediately call with current value
    callback(this.authStatus);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.authStatus.indexOf(callback);
      if (index > -1) {
        this.listeners.authStatus.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to terminal data changes
   * @param {Function} callback - Called with TerminalData when it changes
   * @returns {Function} Unsubscribe function
   */
  onTerminalDataChange(callback) {
    this.listeners.terminalData.push(callback);
    // Immediately call with current value
    callback(this.terminalData);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.terminalData.indexOf(callback);
      if (index > -1) {
        this.listeners.terminalData.splice(index, 1);
      }
    };
  }

  /**
   * Update connection status and notify listeners
   * @param {boolean} connected
   */
  setConnected(connected) {
    this.isConnected = connected;
    this.listeners.isConnected.forEach(callback => callback(connected));
  }

  /**
   * Update scanner status and notify listeners
   * @param {import('./models.js').ScannerStatus} status
   */
  setScannerStatus(status) {
    this.scannerStatus = status;
    this.listeners.scannerStatus.forEach(callback => callback(status));
  }

  /**
   * Update card authorization status and notify listeners
   * @param {import('./models.js').AuthStatus} status
   */
  setAuthStatus(status) {
    this.authStatus = status;
    this.listeners.authStatus.forEach(callback => callback(status));
  }

  /**
   * Update terminal data and notify listeners
   * @param {import('./models.js').TerminalData} data
   */
  setTerminalData(data) {
    this.terminalData = data;
    this.listeners.terminalData.forEach(callback => callback(data));
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    const wsUrl = `ws://${window.location.host}/ws`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.setConnected(true);
    };

    this.ws.onclose = () => {
      this.setConnected(false);
      // Reconnect after 3 seconds
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this.setConnected(false);
    };

    this.ws.onmessage = (event) => {
      try {
        /** @type {import('./models.js').WebSocketMessage} */
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   * @param {import('./models.js').WebSocketMessage} message
   */
  handleMessage(message) {
    switch (message.type) {
      case 'scanner_status':
        this.setScannerStatus(message.data);
        break;
      case 'terminal_update':
        this.setTerminalData(message.data);
        break;
      case 'auth_status':
        this.setAuthStatus(message.data);
        break;
      case 'initial_state':
        this.setScannerStatus(message.data.scanner_status);
        this.setAuthStatus(message.data.auth_status);
        this.setTerminalData(message.data.terminal_update);
        break;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
