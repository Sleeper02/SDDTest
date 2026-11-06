export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function formatLog(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  };
  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    console.info(formatLog('info', message, context));
  },
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(formatLog('warn', message, context));
  },
  error(message: string, context?: Record<string, unknown>): void {
    console.error(formatLog('error', message, context));
  },
};
