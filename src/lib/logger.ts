// Logging levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Log entry interface
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

// Logger configuration
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  enableLocalStorage: boolean;
  maxLocalStorageEntries: number;
}

class Logger {
  private config: LoggerConfig;
  private sessionId: string;
  private userId?: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableRemote: process.env.NODE_ENV === 'production',
      enableLocalStorage: true,
      maxLocalStorageEntries: 1000,
      ...config,
    };
    
    this.sessionId = this.generateSessionId();
    this.initializeUserId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeUserId(): void {
    // In a real app, you might get this from auth context or localStorage
    try {
      const storedUserId = localStorage.getItem('smartspend_userId');
      if (storedUserId) {
        this.userId = storedUserId;
      }
    } catch (error) {
      // localStorage might not be available (SSR)
    }
  }

  setUserId(userId: string): void {
    this.userId = userId;
    try {
      localStorage.setItem('smartspend_userId', userId);
    } catch (error) {
      // localStorage might not be available
    }
  }

  clearUserId(): void {
    this.userId = undefined;
    try {
      localStorage.removeItem('smartspend_userId');
    } catch (error) {
      // localStorage might not be available
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
      userId: this.userId,
      sessionId: this.sessionId,
    };
  }

  private formatLogMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const sessionInfo = `[${entry.sessionId}]${entry.userId ? `[${entry.userId}]` : ''}`;
    
    let message = `${timestamp} ${levelName} ${sessionInfo} ${entry.message}`;
    
    if (entry.context) {
      message += `\nContext: ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    if (entry.error) {
      message += `\nError: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\nStack: ${entry.error.stack}`;
      }
    }
    
    return message;
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const message = this.formatLogMessage(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
        console.error(message);
        break;
    }
  }

  private logToLocalStorage(entry: LogEntry): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const storageKey = 'smartspend_logs';
      const existingLogs = localStorage.getItem(storageKey);
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      // Add new log entry
      logs.push({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        error: entry.error ? {
          message: entry.error.message,
          stack: entry.error.stack,
          name: entry.error.name,
        } : undefined,
      });
      
      // Trim logs if exceeding max entries
      if (logs.length > this.config.maxLocalStorageEntries) {
        logs.splice(0, logs.length - this.config.maxLocalStorageEntries);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(logs));
    } catch (error) {
      // localStorage might be full or unavailable
      console.warn('Failed to save log to localStorage:', error);
    }
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entry,
          timestamp: entry.timestamp.toISOString(),
          error: entry.error ? {
            message: entry.error.message,
            stack: entry.error.stack,
            name: entry.error.name,
          } : undefined,
        }),
      });
    } catch (error) {
      console.warn('Failed to send log to remote endpoint:', error);
    }
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, error);
    
    this.logToConsole(entry);
    this.logToLocalStorage(entry);
    
    // Send to remote endpoint asynchronously (don't wait for it)
    if (this.config.enableRemote) {
      this.logToRemote(entry).catch(() => {
        // Ignore remote logging errors to prevent infinite loops
      });
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  // Convenience methods for common use cases
  logAuthEvent(event: string, context?: Record<string, any>): void {
    this.info(`Auth: ${event}`, context);
  }

  logFirebaseOperation(operation: string, success: boolean, context?: Record<string, any>, error?: Error): void {
    if (success) {
      this.info(`Firebase: ${operation} successful`, context);
    } else {
      this.error(`Firebase: ${operation} failed`, error, context);
    }
  }

  logUserAction(action: string, context?: Record<string, any>): void {
    this.info(`User Action: ${action}`, context);
  }

  logFormValidation(formName: string, isValid: boolean, errors?: Record<string, string>): void {
    this.debug(`Form Validation: ${formName}`, { isValid, errors });
  }

  logPageNavigation(from: string, to: string): void {
    this.debug('Page Navigation', { from, to });
  }

  // Get logs from localStorage for debugging
  getLogs(): LogEntry[] {
    try {
      const storageKey = 'smartspend_logs';
      const existingLogs = localStorage.getItem(storageKey);
      if (existingLogs) {
        const logs = JSON.parse(existingLogs);
        return logs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
          error: log.error ? new Error(log.error.message) : undefined,
        }));
      }
    } catch (error) {
      console.warn('Failed to retrieve logs from localStorage:', error);
    }
    return [];
  }

  // Clear all logs from localStorage
  clearLogs(): void {
    try {
      localStorage.removeItem('smartspend_logs');
    } catch (error) {
      console.warn('Failed to clear logs from localStorage:', error);
    }
  }

  // Export logs as JSON for debugging or support
  exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }
}

// Create a singleton logger instance
export const logger = new Logger({
  // You can override config here or via environment variables
  remoteEndpoint: process.env.NEXT_PUBLIC_LOGGING_ENDPOINT,
});

// Export the logger as default for convenience
export default logger;

// Utility function to wrap async operations with logging
export const withLogging = async <T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> => {
  logger.debug(`Starting: ${operation}`, context);
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    logger.info(`Completed: ${operation}`, { ...context, duration: `${duration}ms` });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Failed: ${operation}`, error as Error, { ...context, duration: `${duration}ms` });
    throw error;
  }
};
