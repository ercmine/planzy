import { createServer as createNodeServer, type Server } from "node:http";

import type { MerchantService } from "../merchant/service.js";
import type { VenueClaimsService } from "../venues/claims/claimsService.js";
import { createRoutes } from "./routes.js";

export function createHttpServer(service: VenueClaimsService, merchantService: MerchantService): Server {
  const route = createRoutes(service, merchantService);
  return createNodeServer((req, res) => {
    void route(req, res);
  });
}
