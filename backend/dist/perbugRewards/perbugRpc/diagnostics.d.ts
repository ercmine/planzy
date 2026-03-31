import type { PerbugRpcHealthSnapshot } from "./types.js";
export declare function collectPerbugRpcStartupDiagnostics(): Promise<PerbugRpcHealthSnapshot>;
export declare function logPerbugRpcStartupDiagnostics(): Promise<void>;
