const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Simple logger wrapper for Electron main process.
 * Provides consistent formatting and potential for file logging.
 */
class Logger {
  constructor() {
    this.logsPath = null;

    // Attempt to set logs path if app is available (it might not be during early initialization)
    try {
      if (app) {
        this.logsPath = path.join(app.getPath('userData'), 'app.log');
      }
    } catch (e) {
      // Ignore if app is not ready
    }
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level}] ${message}`;
    if (args.length > 0) {
      const argsStr = args.map(arg => {
        if (arg instanceof Error) {
          return arg.stack || arg.message;
        }
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      formattedMessage += ` ${argsStr}`;
    }
    return formattedMessage;
  }

  writeToFile(message) {
    if (this.logsPath) {
      try {
        fs.appendFileSync(this.logsPath, message + '\n');
      } catch (e) {
        // Fallback if file write fails, print to stderr
        process.stderr.write(`Failed to write to log file: ${e.message}\n`);
      }
    }
  }

  info(message, ...args) {
    const formatted = this.formatMessage('INFO', message, ...args);
    console.log(formatted);
    this.writeToFile(formatted);
  }

  warn(message, ...args) {
    const formatted = this.formatMessage('WARN', message, ...args);
    console.warn(formatted);
    this.writeToFile(formatted);
  }

  error(message, ...args) {
    const formatted = this.formatMessage('ERROR', message, ...args);
    console.error(formatted);
    this.writeToFile(formatted);
  }
}

const logger = new Logger();

module.exports = logger;
