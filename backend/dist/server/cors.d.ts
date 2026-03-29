import type { IncomingMessage, ServerResponse } from "node:http";
export interface CorsResult {
    origin: string | null;
    originAllowed: boolean;
}
export declare function applyCors(req: IncomingMessage, res: ServerResponse): CorsResult;
export declare function handleCorsPreflight(req: IncomingMessage, res: ServerResponse, corsResult: CorsResult): boolean;
