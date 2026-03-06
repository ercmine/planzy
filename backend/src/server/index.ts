import { fileURLToPath } from "node:url";

import { VenueClaimsService } from "../venues/claims/claimsService.js";
import { MemoryVenueClaimStore } from "../venues/claims/memoryStore.js";
import { createHttpServer } from "./httpServer.js";

export function createServer() {
  const service = new VenueClaimsService(new MemoryVenueClaimStore());
  return createHttpServer(service);
}

export function main(): void {
  const server = createServer();
  const port = Number(process.env.PORT ?? 8080);
  server.listen(port, () => {
    // Run after build with: node dist/server/index.js
    console.log(`Server listening on :${port}`);
  });
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1] === currentFilePath) {
  main();
}
