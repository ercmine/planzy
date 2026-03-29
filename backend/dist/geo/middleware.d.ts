import type { IncomingMessage } from "node:http";
export declare function assertGeoAuth(req: IncomingMessage, expectedSecret: string | undefined): void;
export declare function shouldProtectGeoEndpoint(pathname: string): boolean;
