import type { IncomingMessage } from "node:http";

export function assertGeoAuth(req: IncomingMessage, expectedSecret: string | undefined): void {
  if (!expectedSecret) return;
  const actual = req.headers["x-dryad-geo-service"];
  if (actual !== expectedSecret) {
    throw new Error("unauthorized_geo_service_call");
  }
}

export function shouldProtectGeoEndpoint(pathname: string): boolean {
  return pathname.startsWith("/v1/");
}
