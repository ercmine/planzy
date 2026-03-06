import { redactObject } from "./redact.js";
import type { Logger, LogEventBase, LogLevel } from "./loggerTypes.js";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export class JsonLogger implements Logger {
  private readonly minLevel: LogLevel;
  private readonly sink: (line: string) => void;
  private readonly shouldRedact: boolean;

  constructor(opts?: { minLevel?: LogLevel; sink?: (line: string) => void; redact?: boolean }) {
    this.minLevel = opts?.minLevel ?? "info";
    this.sink = opts?.sink ?? ((line: string) => console.log(line));
    this.shouldRedact = opts?.redact ?? true;
  }

  public log(level: LogLevel, event: string, data: Record<string, unknown> = {}): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.minLevel]) {
      return;
    }

    const payloadData = this.shouldRedact ? redactObject(data) : data;
    const payload: LogEventBase & Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      event,
      ...payloadData
    };

    this.sink(JSON.stringify(payload));
  }

  public debug(event: string, data: Record<string, unknown> = {}): void {
    this.log("debug", event, data);
  }

  public info(event: string, data: Record<string, unknown> = {}): void {
    this.log("info", event, data);
  }

  public warn(event: string, data: Record<string, unknown> = {}): void {
    this.log("warn", event, data);
  }

  public error(event: string, data: Record<string, unknown> = {}): void {
    this.log("error", event, data);
  }
}

export function createDefaultLogger(): Logger {
  const level = (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";
  const minLevel: LogLevel = LEVEL_WEIGHT[level] ? level : "info";
  return new JsonLogger({ minLevel });
}

export const defaultLogger: Logger = createDefaultLogger();
