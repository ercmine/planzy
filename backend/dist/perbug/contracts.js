export const PERBUG_CONTRACTS = {
    chain: "ethereum-mainnet",
    chainId: 1,
    explorerBaseUrl: "https://etherscan.io",
    perbugTokenAddress: "0x3ce1a70b2fa66bddc7d2e870af47838863915051",
    groveNftAddress: "0x24858795997a0d9c7686451c010fa78de2a9584d",
};
export function asExplorerAddressUrl(address) {
    return `${PERBUG_CONTRACTS.explorerBaseUrl}/address/${address}`;
}
