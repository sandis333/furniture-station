/**
 * @typedef {Object} ScannerStatus
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {Object} AuthStatus
 * @property {boolean} status
 * @property {number|null} code
 * @property {string|null} username
 * @property {string} message
 * @property {string} reason
 */

/**
 * @typedef {Object} TerminalData
 * @property {string|null} matrix
 * @property {string|null} message
 * @property {string} message_type
 * @property {string} status
 * @property {Object|null} session
 */

/**
 * @typedef {Object} InitialState
 * @property {ScannerStatus} scanner_status - Initial scanner status
 * @property {AuthStatus} auth_status - Initial card authorization status
 * @property {TerminalData} terminal_update - Initial terminal data
 */

/**
 * @typedef {Object} WebSocketMessage
 * @property {'scanner_status'|'terminal_update'|'auth_status'|'initial_state'} type - Message type
 * @property {ScannerStatus|TerminalData|AuthStatus|InitialState} data - Message data
 */

export {};
