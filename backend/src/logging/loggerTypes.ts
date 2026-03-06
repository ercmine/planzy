export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEventBase {
  ts: string;
  level: LogLevel;
  event: string;
  requestId?: string;
  provider?: string;
  module?: string;
  message?: string;
}

export interface Logger {
  log(level: LogLevel, event: string, data: Record<string, unknown>): void;
  debug(event: string, data?: Record<string, unknown>): void;
  info(event: string, data?: Record<string, unknown>): void;
  warn(event: string, data?: Record<string, unknown>): void;
  error(event: string, data?: Record<string, unknown>): void;
}
