export declare function createWalletLoginNonce(): string;
export declare function formatWalletSignInMessage(input: {
    publicKey: string;
    nonce: string;
    timestamp: string;
}): string;
export declare function verifyWalletSignature(input: {
    publicKey: Uint8Array;
    message: string;
    signatureBase58: string;
}): boolean;
export declare function stableIdempotencyKey(parts: Array<string>): string;
