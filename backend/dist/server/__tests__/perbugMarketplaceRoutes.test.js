import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../index.js";
const serversToClose = [];
afterEach(async () => {
    await Promise.all(serversToClose.splice(0).map((server) => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
});
async function boot() {
    const server = createServer();
    serversToClose.push(server);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string")
        throw new Error("expected tcp address");
    return `http://127.0.0.1:${address.port}`;
}
describe("perbug marketplace routes", () => {
    it("supports listing browse, filtering, search, and detail inspection", async () => {
        const baseUrl = await boot();
        const listings = await fetch(`${baseUrl}/v1/perbug/marketplace/listings?category=character&sort=price_desc`);
        expect(listings.status).toBe(200);
        const listJson = await listings.json();
        expect(listJson.total).toBeGreaterThan(0);
        expect(listJson.items[0]?.assetType).toBe("character");
        const search = await fetch(`${baseUrl}/v1/perbug/marketplace/search?q=forge`);
        expect(search.status).toBe(200);
        const searchJson = await search.json();
        expect(searchJson.items.some((item) => item.listingId === "mk_relic_aurora_core")).toBe(true);
        const detail = await fetch(`${baseUrl}/v1/perbug/marketplace/listings/mk_map_lumin_keep`);
        expect(detail.status).toBe(200);
        const detailJson = await detail.json();
        expect(detailJson.listing.metadata.mapLink?.regionId).toBe("emberfront");
        expect(detailJson.listing.provenance.tags).toContain("map_linked");
    });
});
