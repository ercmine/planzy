import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { privateKeyToAccount } from "viem/accounts";
import { AccountsService } from "../../accounts/service.js";
import { MemoryAccountsStore } from "../../accounts/memoryStore.js";
import { MemoryWalletAuthStore } from "../store.js";
import { WalletAuthService } from "../service.js";
describe("WalletAuthService", () => {
    it("issues challenge and verifies EVM signatures with session restore", async () => {
        const service = new WalletAuthService(new MemoryWalletAuthStore(), new AccountsService(new MemoryAccountsStore()));
        const account = privateKeyToAccount("0x59c6995e998f97a5a0044966f094538f5d7497f91fd75f4f53f71ff6f0f8f5c4");
        const challenge = service.createChallenge({ chain: "evm", provider: "metamask", address: account.address });
        const signature = await account.signMessage({ message: challenge.message });
        const verified = await service.verifyChallenge({ challengeId: challenge.challengeId, signature, address: account.address });
        expect(verified.authState).toBe("authenticated");
        expect(verified.sessionToken).toBeTruthy();
        expect(service.restoreSession(verified.sessionToken).authState).toBe("authenticated");
    });
    it("rejects replay for consumed challenge", async () => {
        const service = new WalletAuthService(new MemoryWalletAuthStore(), new AccountsService(new MemoryAccountsStore()));
        const keypair = nacl.sign.keyPair();
        const address = bs58.encode(keypair.publicKey);
        const challenge = service.createChallenge({ chain: "solana", provider: "phantom", address });
        const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(challenge.message), keypair.secretKey));
        await service.verifyChallenge({ challengeId: challenge.challengeId, signature, address });
        await expect(service.verifyChallenge({ challengeId: challenge.challengeId, signature, address })).rejects.toThrow();
    });
    it("supports link intent for existing authenticated session", async () => {
        const service = new WalletAuthService(new MemoryWalletAuthStore(), new AccountsService(new MemoryAccountsStore()));
        const first = privateKeyToAccount("0x8b3a350cf5c34c9194ca3a545d4d6e4f9e26e6ddf8b8c8a8869f0d0c7f8f7a14");
        const firstChallenge = service.createChallenge({ chain: "evm", provider: "metamask", address: first.address });
        const firstSig = await first.signMessage({ message: firstChallenge.message });
        const login = await service.verifyChallenge({ challengeId: firstChallenge.challengeId, signature: firstSig, address: first.address });
        const second = privateKeyToAccount("0x0f4b7ff1bd204f76e94f8fe8f8f42adf7528cf6f3cbf8c9655f15ad1c9d5407f");
        const linkChallenge = service.createChallenge({ chain: "evm", provider: "walletconnect", address: second.address, intent: "link", sessionToken: login.sessionToken });
        const secondSig = await second.signMessage({ message: linkChallenge.message });
        const linked = await service.verifyChallenge({ challengeId: linkChallenge.challengeId, signature: secondSig, address: second.address, sessionToken: login.sessionToken });
        expect(linked.userId).toBe(login.userId);
        expect(service.listWalletsForSession(login.sessionToken)).toHaveLength(2);
    });
});
