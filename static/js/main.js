import { App } from './app.js';

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    app.destroy();
  });
});
