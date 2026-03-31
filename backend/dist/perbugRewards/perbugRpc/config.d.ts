import type { PerbugRpcConfig } from "./types.js";
export declare function loadPerbugRpcConfig(env?: NodeJS.ProcessEnv): PerbugRpcConfig;
export declare function buildPerbugRpcNodeUrl(config: PerbugRpcConfig): string;
export declare function buildPerbugRpcWalletUrl(config: PerbugRpcConfig, walletName?: string): string;
export declare const buildPerbugRpcUrl: typeof buildPerbugRpcWalletUrl;
