import { createServer as createNodeServer } from "node:http";
import { createRoutes } from "./routes.js";
export function matchPath(pattern, pathname) {
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = pathname.split("/").filter(Boolean);
    if (patternParts.length !== pathParts.length) {
        return null;
    }
    const params = {};
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
export function createHttpServer(service, merchantService, deps) {
    const route = createRoutes(service, merchantService, deps);
    return createNodeServer((req, res) => {
        void route(req, res);
    });
}
