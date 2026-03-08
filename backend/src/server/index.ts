import { fileURLToPath } from "node:url";

import { ClickTracker, MemoryClickStore } from "../analytics/clicks/index.js";
import { createDeckHandler } from "../api/sessions/deckHandler.js";
import { createIdeasHandlers } from "../api/sessions/ideasHandler.js";
import type { AppConfig } from "../config/schema.js";
import type { Logger } from "../logging/loggerTypes.js";
import { MemoryMerchantStore } from "../merchant/memoryStore.js";
import { MerchantService } from "../merchant/service.js";
import { BringYourOwnProvider, MemoryIdeasStore } from "../plans/bringYourOwn/index.js";
import type { IdeasStore } from "../plans/bringYourOwn/storage.js";
import { CuratedProvider } from "../plans/curated/index.js";
import { ProviderRouter } from "../plans/router/providerRouter.js";
import type { ProviderRouter as ProviderRouterType } from "../plans/router/providerRouter.js";
import { MemoryTelemetryStore } from "../telemetry/memoryStore.js";
import { MemoryReviewsStore } from "../reviews/memoryStore.js";
import { TelemetryService } from "../telemetry/telemetryService.js";
import { VenueClaimsService } from "../venues/claims/claimsService.js";
import { MemoryVenueClaimStore } from "../venues/claims/memoryStore.js";
import { createHttpServer } from "./httpServer.js";

export interface CreateServerOptions {
  deckRouter?: ProviderRouterType;
  ideasStore?: IdeasStore;
  logger?: Logger;
  config?: AppConfig;
}

function createDefaultDeckRouter(sharedIdeasStore: IdeasStore): ProviderRouter {
  return new ProviderRouter({
    providers: [new BringYourOwnProvider(sharedIdeasStore), new CuratedProvider()],
    includeDebug: true,
    cache: {
      enabled: false
    },
    neverEmpty: {
      enabled: true,
      curatedProviderName: "curated"
    }
  });
}

export function createServer(options?: CreateServerOptions) {
  const service = new VenueClaimsService(new MemoryVenueClaimStore());
  const merchantService = new MerchantService(new MemoryMerchantStore());
  const ideasStore = options?.ideasStore ?? new MemoryIdeasStore();
  const deckRouter = options?.deckRouter ?? createDefaultDeckRouter(ideasStore);

  const clickStore = new MemoryClickStore();
  const clickTracker = new ClickTracker(clickStore);
  const telemetryStore = new MemoryTelemetryStore();
  const telemetryService = new TelemetryService(telemetryStore, { clickTracker });
  const reviewsStore = new MemoryReviewsStore();

  const deckHandler = createDeckHandler({
    router: deckRouter,
    logger: options?.logger,
    config: options?.config
  });

  const ideasHandlers = createIdeasHandlers({
    ideasStore,
    logger: options?.logger
  });

  return createHttpServer(service, merchantService, { deckHandler, ideasHandlers, telemetryService, reviewsStore });
}

export function main(): void {
  const server = createServer();
  const port = Number(process.env.PORT ?? 8080);
  server.listen(port, () => {
    console.log(`Server listening on :${port}`);
  });
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1] === currentFilePath) {
  main();
}
