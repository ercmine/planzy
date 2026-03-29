export type SupportedChain = "ethereum-mainnet";
export interface DryadContracts {
    readonly chain: SupportedChain;
    readonly chainId: number;
    readonly explorerBaseUrl: string;
    readonly dryadTokenAddress: `0x${string}`;
    readonly groveNftAddress: `0x${string}`;
}
export declare const DRYAD_CONTRACTS: DryadContracts;
export declare function asExplorerAddressUrl(address: string): string;
