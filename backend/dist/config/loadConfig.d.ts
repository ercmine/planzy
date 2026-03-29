import { RemoteConfigClient } from "./remoteConfig.js";
import { type AppConfig } from "./schema.js";
export declare function mergeConfig(base: AppConfig, overlay: Partial<AppConfig>): AppConfig;
export declare function loadConfig(params?: {
    env?: NodeJS.ProcessEnv;
    remoteClient?: RemoteConfigClient;
    fetchRemote?: boolean;
    now?: () => number;
}): Promise<{
    config: AppConfig;
    warnings: string[];
}>;
