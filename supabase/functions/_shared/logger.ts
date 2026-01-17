/**
 * Shared structured logging for Edge Functions
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  function?: string;
  data?: unknown;
  duration_ms?: number;
  request_id?: string;
}

/**
 * Create a logger instance for a function
 */
export function createLogger(functionName: string) {
  const formatLog = (level: LogLevel, message: string, data?: unknown): LogEntry => {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      function: functionName,
    };
    if (data !== undefined) {
      entry.data = data;
    }
    return entry;
  };

  return {
    debug: (message: string, data?: unknown) => {
      console.log(JSON.stringify(formatLog('debug', message, data)));
    },
    
    info: (message: string, data?: unknown) => {
      console.log(JSON.stringify(formatLog('info', message, data)));
    },
    
    warn: (message: string, data?: unknown) => {
      console.warn(JSON.stringify(formatLog('warn', message, data)));
    },
    
    error: (message: string, error?: unknown) => {
      const errorData = error instanceof Error 
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
      console.error(JSON.stringify(formatLog('error', message, errorData)));
    },

    /**
     * Log with timing information
     */
    timed: async <T>(
      operation: string,
      fn: () => Promise<T>
    ): Promise<T> => {
      const start = performance.now();
      try {
        const result = await fn();
        const duration = Math.round(performance.now() - start);
        console.log(JSON.stringify({
          ...formatLog('info', `${operation} completed`),
          duration_ms: duration,
        }));
        return result;
      } catch (error) {
        const duration = Math.round(performance.now() - start);
        console.error(JSON.stringify({
          ...formatLog('error', `${operation} failed`),
          duration_ms: duration,
          data: error instanceof Error ? error.message : error,
        }));
        throw error;
      }
    },
  };
}

/**
 * Simple log helpers for quick logging
 */
export const log = {
  info: (message: string, data?: unknown) => {
    const entry: { level: string; message: string; timestamp: string; data?: unknown } = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
    };
    if (data !== undefined) {
      entry.data = data;
    }
    console.log(JSON.stringify(entry));
  },
  
  error: (message: string, error?: unknown) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      data: error instanceof Error ? error.message : error,
    }));
  },
};
