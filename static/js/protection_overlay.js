/**
 * Screen overlay displayed while no authorized card is present at the station.
 * The clock and color-switching behavior are adapted from the OEE station.
 */
export class ProtectionOverlay {
  constructor() {
    this.overlay = null;
    this.background = null;
    this.clock = null;
    this.message = null;
    this.clockInterval = null;
    this.colorToggleInterval = null;
    this.colorResetTimeout = null;
    this.isLight = false;
    this.oneHourMs = 60 * 60 * 1000;
    this.tenMinutesMs = 10 * 60 * 1000;
  }

  init() {
    this.overlay = document.getElementById('protectionOverlay');
    this.background = this.overlay.querySelector('.overlay-background');
    this.clock = this.overlay.querySelector('.overlay-clock');
    this.message = this.overlay.querySelector('.overlay-message');
    this.setVisible(true);
    this.startClock();
    this.startColorToggle();
  }

  handleStatusUpdate(data) {
    const authorized = Boolean(data?.status);
    this.message.textContent = authorized
      ? ''
      : (data?.message || 'Novietojiet kartiņu uz lasītāja');
    this.overlay.classList.toggle('unauthorized', data?.reason === 'unauthorized');
    this.setVisible(!authorized);
  }

  setVisible(visible) {
    this.overlay.classList.toggle('auth-hidden', !visible);
    this.overlay.classList.toggle('visible', visible);
    if (visible) {
      this.startClock();
    } else {
      this.stopClock();
    }
  }

  startClock() {
    if (this.clockInterval) return;
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  stopClock() {
    if (!this.clockInterval) return;
    clearInterval(this.clockInterval);
    this.clockInterval = null;
  }

  updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    this.clock.textContent = `${hours}:${minutes}:${seconds}`;
  }

  startColorToggle() {
    this.updateColors();
    this.colorToggleInterval = setInterval(() => {
      this.isLight = true;
      this.updateColors();
      this.colorResetTimeout = setTimeout(() => {
        this.isLight = false;
        this.updateColors();
      }, this.tenMinutesMs);
    }, this.oneHourMs + this.tenMinutesMs);
  }

  updateColors() {
    this.background.classList.toggle('light', this.isLight);
    this.clock.classList.toggle('dark', this.isLight);
    this.message.classList.toggle('dark', this.isLight);
  }

  destroy() {
    this.stopClock();
    clearInterval(this.colorToggleInterval);
    clearTimeout(this.colorResetTimeout);
  }
}
