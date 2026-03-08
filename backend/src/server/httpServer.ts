import { createServer as createNodeServer, type Server } from "node:http";

import type { SessionDeckHandler } from "../api/sessions/deckHandler.js";
import type { SessionIdeasHandlers } from "../api/sessions/ideasHandler.js";
import type { MerchantService } from "../merchant/service.js";
import type { TelemetryService } from "../telemetry/telemetryService.js";
import type { ReviewsStore } from "../reviews/store.js";
import type { VenueClaimsService } from "../venues/claims/claimsService.js";
import { createRoutes } from "./routes.js";

export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];

    if (!patternPart || !pathPart) {
      return null;
    }

    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }

    if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

export function createHttpServer(
  service: VenueClaimsService,
  merchantService: MerchantService,
  deps?: { deckHandler?: SessionDeckHandler; ideasHandlers?: SessionIdeasHandlers; telemetryService?: TelemetryService; reviewsStore?: ReviewsStore }
): Server {
  const route = createRoutes(service, merchantService, deps);
  return createNodeServer((req, res) => {
    void route(req, res);
  });
}
