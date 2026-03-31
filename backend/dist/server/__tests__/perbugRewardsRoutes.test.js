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
describe("perbug reward routes", () => {
    it("supports reward previews, review approval ladder, and idempotent claims", async () => {
        const baseUrl = await boot();
        const preview = await fetch(`${baseUrl}/v1/places/place-1/reward-preview`);
        expect(preview.status).toBe(200);
        expect((await preview.json()).nextBaseRewardAmount).toBe(200);
        const review1 = await fetch(`${baseUrl}/v1/reviews`, { method: "POST", headers: { "content-type": "application/json", "x-user-id": "u1" }, body: JSON.stringify({ placeId: "place-1", videoUrl: "https://cdn/1.mp4", contentHash: "1" }) });
        const review2 = await fetch(`${baseUrl}/v1/reviews`, { method: "POST", headers: { "content-type": "application/json", "x-user-id": "u2" }, body: JSON.stringify({ placeId: "place-1", videoUrl: "https://cdn/2.mp4", contentHash: "2" }) });
        const review6Ids = [];
        const firstId = (await review1.json()).review.id;
        const secondId = (await review2.json()).review.id;
        await fetch(`${baseUrl}/v1/admin/reviews/${firstId}/approve`, { method: "POST", headers: { "content-type": "application/json", "x-user-id": "admin" }, body: JSON.stringify({ qualityRating: "standard" }) });
        await fetch(`${baseUrl}/v1/admin/reviews/${secondId}/approve`, { method: "POST", headers: { "content-type": "application/json", "x-user-id": "admin" }, body: JSON.stringify({ qualityRating: "standard" }) });
        for (let i = 3; i <= 6; i += 1) {
            const review = await fetch(`${baseUrl}/v1/reviews`, { method: "POST", headers: { "content-type": "application/json", "x-user-id": `u${i}` }, body: JSON.stringify({ placeId: "place-1", videoUrl: `https://cdn/${i}.mp4`, contentHash: `${i}` }) });
            const id = (await review.json()).review.id;
            review6Ids.push(id);
            await fetch(`${baseUrl}/v1/admin/reviews/${id}/approve`, { method: "POST", headers: { "content-type": "application/json", "x-user-id": "admin" }, body: JSON.stringify({ qualityRating: i === 6 ? "standard" : "standard" }) });
        }
        const keypairModule = await import("@solana/web3.js");
        const bs58 = (await import("bs58")).default;
        const nacl = (await import("tweetnacl")).default;
        const keypair = keypairModule.Keypair.generate();
        const publicKey = keypair.publicKey.toBase58();
        const nonceResponse = await fetch(`${baseUrl}/v1/wallet-auth/nonce`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicKey }) });
        const nonceBody = await nonceResponse.json();
        const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(nonceBody.message), keypair.secretKey));
        const verify = await fetch(`${baseUrl}/v1/wallet-auth/verify`, { method: "POST", headers: { "content-type": "application/json", "x-user-id": "u1" }, body: JSON.stringify({ publicKey, signature }) });
        expect(verify.status).toBe(200);
        const claimFirst = await fetch(`${baseUrl}/v1/rewards/reviews/${firstId}/claim`, { method: "POST", headers: { "content-type": "application/json", "x-user-id": "u1" }, body: JSON.stringify({ walletPublicKey: publicKey, idempotencyKey: "same-key" }) });
        const claimSecond = await fetch(`${baseUrl}/v1/rewards/reviews/${firstId}/claim`, { method: "POST", headers: { "content-type": "application/json", "x-user-id": "u1" }, body: JSON.stringify({ walletPublicKey: publicKey, idempotencyKey: "same-key" }) });
        const claimA = await claimFirst.json();
        const claimB = await claimSecond.json();
        expect(claimA.claim.transactionSignature).toBe(claimB.claim.transactionSignature);
        const dashboard = await fetch(`${baseUrl}/v1/creator/rewards/dashboard`, { headers: { "x-user-id": "u1" } });
        expect(dashboard.status).toBe(200);
        const dashboardBody = await dashboard.json();
        expect(dashboardBody.history[0]?.review.rewardStatus).toBe("claimed");
    });
});
