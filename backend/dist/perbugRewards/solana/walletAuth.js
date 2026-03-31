import { createHash, randomBytes } from "node:crypto";
import bs58 from "bs58";
import nacl from "tweetnacl";
export function createWalletLoginNonce() {
    return randomBytes(18).toString("base64url");
}
export function formatWalletSignInMessage(input) {
    return [
        "Sign this message to authenticate with Perbug.",
        `Wallet: ${input.publicKey}`,
        `Nonce: ${input.nonce}`,
        `Timestamp: ${input.timestamp}`,
        "Purpose: login"
    ].join("\n");
}
export function verifyWalletSignature(input) {
    const signature = bs58.decode(input.signatureBase58);
    return nacl.sign.detached.verify(new TextEncoder().encode(input.message), signature, input.publicKey);
}
export function stableIdempotencyKey(parts) {
    return createHash("sha256").update(parts.join(":"), "utf8").digest("hex");
}
