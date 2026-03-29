import type { Logger, LogLevel } from "./loggerTypes.js";
export declare class JsonLogger implements Logger {
    private readonly minLevel;
    private readonly sink;
    private readonly shouldRedact;
    constructor(opts?: {
        minLevel?: LogLevel;
        sink?: (line: string) => void;
        redact?: boolean;
    });
    log(level: LogLevel, event: string, data?: Record<string, unknown>): void;
    debug(event: string, data?: Record<string, unknown>): void;
    info(event: string, data?: Record<string, unknown>): void;
    warn(event: string, data?: Record<string, unknown>): void;
    error(event: string, data?: Record<string, unknown>): void;
}
export declare function createDefaultLogger(): Logger;
export declare const defaultLogger: Logger;
