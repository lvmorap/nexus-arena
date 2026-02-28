type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private _level: LogLevel = 'info';

  public setLevel(level: LogLevel): void {
    this._level = level;
  }

  public debug(message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[this._level] <= LOG_LEVELS.debug) {
      console.warn(`[DEBUG] ${message}`, ...args);
    }
  }

  public info(message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[this._level] <= LOG_LEVELS.info) {
      console.warn(`[INFO] ${message}`, ...args);
    }
  }

  public warn(message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[this._level] <= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  public error(message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[this._level] <= LOG_LEVELS.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}

export const logger = new Logger();
