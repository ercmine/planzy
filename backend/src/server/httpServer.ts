import { createServer as createNodeServer, type Server } from "node:http";

import { createRoutes } from "./routes.js";
import type { VenueClaimsService } from "../venues/claims/claimsService.js";

export function createHttpServer(service: VenueClaimsService): Server {
  const route = createRoutes(service);
  return createNodeServer((req, res) => {
    void route(req, res);
  });
}
