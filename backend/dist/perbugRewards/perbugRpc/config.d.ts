import type { PerbugRpcConfig } from "./types.js";
export declare function loadPerbugRpcConfig(env?: NodeJS.ProcessEnv): PerbugRpcConfig;
export declare function buildPerbugRpcUrl(config: PerbugRpcConfig): string;
