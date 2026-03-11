import type { IncomingMessage } from "node:http";

export function assertGeoAuth(req: IncomingMessage, expectedSecret: string | undefined): void {
  if (!expectedSecret) return;
  const actual = req.headers["x-perbug-geo-service"];
  if (actual !== expectedSecret) {
    throw new Error("unauthorized_geo_service_call");
  }
}
