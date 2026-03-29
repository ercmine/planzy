import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
export function isValidSolanaPublicKey(value) {
    try {
        void new PublicKey(value);
        return true;
    }
    catch {
        return false;
    }
}
export function deriveAssociatedTokenAddress(owner, mint) {
    return getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(owner), false).toBase58();
}
export function amountToAtomicUnits(amountDisplay, decimals) {
    const factor = 10 ** decimals;
    return BigInt(Math.round(amountDisplay * factor));
}
export function amountToDisplay(amountAtomic, decimals) {
    const factor = BigInt(10 ** decimals);
    const whole = amountAtomic / factor;
    const frac = (amountAtomic % factor).toString().padStart(decimals, "0").replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : whole.toString();
}
export function explorerLink(signature, cluster, customBaseUrl) {
    if (customBaseUrl)
        return `${customBaseUrl.replace(/\/$/, "")}/${signature}`;
    const url = new URL(`https://explorer.solana.com/tx/${signature}`);
    if (cluster !== "mainnet-beta")
        url.searchParams.set("cluster", cluster === "custom" ? "devnet" : cluster);
    return url.toString();
}
