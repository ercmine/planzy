import { redactObject } from "./redact.js";
const LEVEL_WEIGHT = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40
};
export class JsonLogger {
    minLevel;
    sink;
    shouldRedact;
    constructor(opts) {
        this.minLevel = opts?.minLevel ?? "info";
        this.sink = opts?.sink ?? ((line) => console.log(line));
        this.shouldRedact = opts?.redact ?? true;
    }
    log(level, event, data = {}) {
        if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.minLevel]) {
            return;
        }
        const payloadData = this.shouldRedact ? redactObject(data) : data;
        const payload = {
            ts: new Date().toISOString(),
            level,
            event,
            ...payloadData
        };
        this.sink(JSON.stringify(payload));
    }
    debug(event, data = {}) {
        this.log("debug", event, data);
    }
    info(event, data = {}) {
        this.log("info", event, data);
    }
    warn(event, data = {}) {
        this.log("warn", event, data);
    }
    error(event, data = {}) {
        this.log("error", event, data);
    }
}
export function createDefaultLogger() {
    const level = process.env.LOG_LEVEL ?? "info";
    const minLevel = LEVEL_WEIGHT[level] ? level : "info";
    return new JsonLogger({ minLevel });
}
export const defaultLogger = createDefaultLogger();
