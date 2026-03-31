import { amountToDisplay } from "../solana/token.js";
import { PERBUG_DECIMALS } from "../defaults.js";
import { PerbugRpcClient, PerbugRpcRequestError } from "./client.js";
export async function collectPerbugRpcStartupDiagnostics() {
    const client = new PerbugRpcClient();
    const safe = client.getSafeConnectionDetails();
    const selectedEndpoint = safe.walletName ? "wallet" : "root";
    const snapshot = {
        configured: safe,
        node: {
            reachable: false
        },
        wallet: {
            methodsAvailable: false,
            selectedEndpoint,
            selectedWalletName: safe.walletName
        }
    };
    try {
        const chain = await client.getBlockchainInfo();
        snapshot.node.reachable = true;
        snapshot.node.chain = chain.chain;
        snapshot.node.blocks = chain.blocks;
    }
    catch (error) {
        const reason = error instanceof PerbugRpcRequestError ? error : null;
        snapshot.node.errorKind = reason?.details.kind;
        snapshot.node.error = reason?.message ?? (error instanceof Error ? error.message : "unknown_error");
        return snapshot;
    }
    try {
        const walletDiscovery = await client.detectWalletSupport();
        snapshot.wallet.methodsAvailable = walletDiscovery.listWalletsAvailable || walletDiscovery.listWalletDirAvailable;
        snapshot.wallet.loadedWallets = walletDiscovery.loadedWallets;
        snapshot.wallet.walletDirectories = walletDiscovery.walletDirectories;
    }
    catch (error) {
        const reason = error instanceof PerbugRpcRequestError ? error : null;
        snapshot.wallet.errorKind = reason?.details.kind;
        snapshot.wallet.error = reason?.message ?? (error instanceof Error ? error.message : "unknown_error");
        return snapshot;
    }
    try {
        const balance = await client.getBalance();
        snapshot.wallet.balance = balance;
    }
    catch (error) {
        const reason = error instanceof PerbugRpcRequestError ? error : null;
        snapshot.wallet.errorKind = reason?.details.kind;
        snapshot.wallet.error = reason?.message ?? (error instanceof Error ? error.message : "unknown_error");
    }
    return snapshot;
}
export async function logPerbugRpcStartupDiagnostics() {
    const snapshot = await collectPerbugRpcStartupDiagnostics();
    const level = snapshot.node.reachable && !snapshot.wallet.error ? "info" : "warn";
    const output = {
        ...snapshot,
        wallet: {
            ...snapshot.wallet,
            balanceDisplay: typeof snapshot.wallet.balance === "number"
                ? amountToDisplay(BigInt(Math.round(snapshot.wallet.balance * 10 ** PERBUG_DECIMALS)), PERBUG_DECIMALS)
                : undefined
        }
    };
    console[level]("[perbug.rpc.startup]", output);
}
