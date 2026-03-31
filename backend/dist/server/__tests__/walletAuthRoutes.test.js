import { afterEach, describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
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
describe("wallet auth routes", () => {
    it("creates challenge, verifies signature, restores session, and logs out", async () => {
        const baseUrl = await boot();
        const wallet = privateKeyToAccount("0x59c6995e998f97a5a0044966f094538f5d7497f91fd75f4f53f71ff6f0f8f5c4");
        const challengeRes = await fetch(`${baseUrl}/v1/auth/wallet/challenge`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ chain: "evm", provider: "metamask", address: wallet.address })
        });
        expect(challengeRes.status).toBe(200);
        const challenge = await challengeRes.json();
        const signature = await wallet.signMessage({ message: challenge.message });
        const verifyRes = await fetch(`${baseUrl}/v1/auth/wallet/verify`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ challengeId: challenge.challengeId, signature, address: wallet.address })
        });
        expect(verifyRes.status).toBe(200);
        const verified = await verifyRes.json();
        expect(verified.authState).toBe("authenticated");
        const restore = await fetch(`${baseUrl}/v1/auth/session`, { headers: { "x-session-token": verified.sessionToken } });
        expect(restore.status).toBe(200);
        expect((await restore.json()).authState).toBe("authenticated");
        const logout = await fetch(`${baseUrl}/v1/auth/logout`, { method: "POST", headers: { "x-session-token": verified.sessionToken } });
        expect(logout.status).toBe(200);
        const after = await fetch(`${baseUrl}/v1/auth/session`, { headers: { "x-session-token": verified.sessionToken } });
        expect((await after.json()).authState).toBe("signed_out");
    });
});
