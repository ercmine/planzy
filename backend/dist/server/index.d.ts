import type { AppConfig } from "../config/schema.js";
import type { Logger } from "../logging/loggerTypes.js";
import type { IdeasStore } from "../plans/bringYourOwn/storage.js";
import type { ProviderRouter as ProviderRouterType } from "../plans/router/providerRouter.js";
export interface CreateServerOptions {
    deckRouter?: ProviderRouterType;
    ideasStore?: IdeasStore;
    logger?: Logger;
    config?: AppConfig;
}
export declare function createServer(options?: CreateServerOptions): import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
export declare function main(): void;
