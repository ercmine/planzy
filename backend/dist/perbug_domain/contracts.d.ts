export type SupportedChain = "ethereum-mainnet";
export interface PerbugContracts {
    readonly chain: SupportedChain;
    readonly chainId: number;
    readonly explorerBaseUrl: string;
    readonly perbugTokenAddress: `0x${string}`;
    readonly groveNftAddress: `0x${string}`;
}
export declare const PERBUG_CONTRACTS: PerbugContracts;
export declare function asExplorerAddressUrl(address: string): string;
