import { fileURLToPath } from "node:url";

import { MemoryMerchantStore } from "../merchant/memoryStore.js";
import { MerchantService } from "../merchant/service.js";
import { VenueClaimsService } from "../venues/claims/claimsService.js";
import { MemoryVenueClaimStore } from "../venues/claims/memoryStore.js";
import { createHttpServer } from "./httpServer.js";

export function createServer() {
  const service = new VenueClaimsService(new MemoryVenueClaimStore());
  const merchantService = new MerchantService(new MemoryMerchantStore());
  return createHttpServer(service, merchantService);
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
