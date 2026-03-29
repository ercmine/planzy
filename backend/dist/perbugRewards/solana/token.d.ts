export declare function isValidSolanaPublicKey(value: string): boolean;
export declare function deriveAssociatedTokenAddress(owner: string, mint: string): string;
export declare function amountToAtomicUnits(amountDisplay: number, decimals: number): bigint;
export declare function amountToDisplay(amountAtomic: bigint, decimals: number): string;
export declare function explorerLink(signature: string, cluster: string, customBaseUrl?: string): string;
