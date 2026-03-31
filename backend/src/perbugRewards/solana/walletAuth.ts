import { createHash, randomBytes } from "node:crypto";

import bs58 from "bs58";
import nacl from "tweetnacl";

export function createWalletLoginNonce(): string {
  return randomBytes(18).toString("base64url");
}

export function formatWalletSignInMessage(input: { publicKey: string; nonce: string; timestamp: string }): string {
  return [
    "Sign this message to authenticate with Perbug.",
    `Wallet: ${input.publicKey}`,
    `Nonce: ${input.nonce}`,
    `Timestamp: ${input.timestamp}`,
    "Purpose: login"
  ].join("\n");
}

export function verifyWalletSignature(input: { publicKey: Uint8Array; message: string; signatureBase58: string }): boolean {
  const signature = bs58.decode(input.signatureBase58);
  return nacl.sign.detached.verify(new TextEncoder().encode(input.message), signature, input.publicKey);
}

export function stableIdempotencyKey(parts: Array<string>): string {
  return createHash("sha256").update(parts.join(":"), "utf8").digest("hex");
}
