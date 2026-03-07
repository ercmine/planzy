import { fileURLToPath } from "node:url";

import { createDeckHandler } from "../api/sessions/deckHandler.js";
import type { AppConfig } from "../config/schema.js";
import type { Logger } from "../logging/loggerTypes.js";
import { MemoryMerchantStore } from "../merchant/memoryStore.js";
import { MerchantService } from "../merchant/service.js";
import type { ProviderRouter } from "../plans/router/providerRouter.js";
import { VenueClaimsService } from "../venues/claims/claimsService.js";
import { MemoryVenueClaimStore } from "../venues/claims/memoryStore.js";
import { createHttpServer } from "./httpServer.js";

export interface CreateServerOptions {
  deckRouter?: ProviderRouter;
  logger?: Logger;
  config?: AppConfig;
}

export function createServer(options?: CreateServerOptions) {
  const service = new VenueClaimsService(new MemoryVenueClaimStore());
  const merchantService = new MerchantService(new MemoryMerchantStore());
  const deckHandler = options?.deckRouter
    ? createDeckHandler({
      router: options.deckRouter,
      logger: options.logger,
      config: options.config
    })
    : undefined;

  return createHttpServer(service, merchantService, { deckHandler });
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
