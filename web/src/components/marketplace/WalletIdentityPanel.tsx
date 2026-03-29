import { useEffect, useMemo, useState } from "react";
import bs58 from "bs58";

type AuthState = "signed_out" | "guest" | "connecting_wallet" | "awaiting_signature" | "authenticated" | "auth_failed" | "restoring_session";
type WalletChain = "evm" | "solana";
type WalletProvider = "metamask" | "phantom" | "walletconnect";

type ChallengeResponse = { challengeId: string; message: string; expiresAt: string };
type VerifyResponse = { sessionToken: string; authState: AuthState; userId: string; wallet: { chain: WalletChain; displayAddress: string; provider: WalletProvider } };
type SessionResponse = { authState: AuthState; userId?: string; wallets?: Array<{ displayAddress: string; provider: WalletProvider; chain: WalletChain }> };

const API_BASE = import.meta.env.PUBLIC_API_BASE_URL || "";
const SESSION_KEY = "perbug.auth.session";

export default function WalletIdentityPanel() {
  const [authState, setAuthState] = useState<AuthState>("restoring_session");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Array<{ displayAddress: string; provider: WalletProvider; chain: WalletChain }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY);
    if (!token) {
      setAuthState("signed_out");
      return;
    }
    setSessionToken(token);
    fetch(`${API_BASE}/v1/auth/session`, { headers: { "x-session-token": token } })
      .then((r) => r.json() as Promise<SessionResponse>)
      .then((body) => {
        if (body.authState === "authenticated") {
          setAuthState("authenticated");
          setUserId(body.userId ?? null);
          setWallets(body.wallets ?? []);
          return;
        }
        localStorage.removeItem(SESSION_KEY);
        setSessionToken(null);
        setAuthState("signed_out");
      })
      .catch(() => setAuthState("signed_out"));
  }, []);

  const walletConnectHint = useMemo(() => "WalletConnect flow is enabled on backend and can be attached to mobile deep-links in app shell.", []);

  const signInWithMetamask = async () => {
    setError(null);
    const ethereum = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!ethereum) {
      setError("MetaMask not found on this device.");
      return;
    }
    setAuthState("connecting_wallet");
    const accounts = await ethereum.request({ method: "eth_requestAccounts" }) as string[];
    const address = accounts[0];
    if (!address) throw new Error("No account selected");
    const challengeRes = await fetch(`${API_BASE}/v1/auth/wallet/challenge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chain: "evm", provider: "metamask", address })
    });
    const challenge = await challengeRes.json() as ChallengeResponse;
    setAuthState("awaiting_signature");
    const signature = await ethereum.request({ method: "personal_sign", params: [challenge.message, address] }) as string;
    const verifyRes = await fetch(`${API_BASE}/v1/auth/wallet/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ challengeId: challenge.challengeId, signature, address })
    });
    const verified = await verifyRes.json() as VerifyResponse;
    localStorage.setItem(SESSION_KEY, verified.sessionToken);
    setSessionToken(verified.sessionToken);
    setAuthState("authenticated");
    setUserId(verified.userId);
    setWallets([{ displayAddress: verified.wallet.displayAddress, provider: verified.wallet.provider, chain: verified.wallet.chain }]);
  };

  const signInWithPhantom = async () => {
    setError(null);
    const solana = (window as Window & { solana?: { isPhantom?: boolean; connect: () => Promise<{ publicKey: { toBase58(): string } }>; signMessage: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array }> } }).solana;
    if (!solana?.isPhantom) {
      setError("Phantom not found on this device.");
      return;
    }
    setAuthState("connecting_wallet");
    const connected = await solana.connect();
    const address = connected.publicKey.toBase58();
    const challengeRes = await fetch(`${API_BASE}/v1/auth/wallet/challenge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chain: "solana", provider: "phantom", address })
    });
    const challenge = await challengeRes.json() as ChallengeResponse;
    setAuthState("awaiting_signature");
    const signed = await solana.signMessage(new TextEncoder().encode(challenge.message), "utf8");
    const signature = bs58.encode(signed.signature);
    const verifyRes = await fetch(`${API_BASE}/v1/auth/wallet/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ challengeId: challenge.challengeId, signature, address })
    });
    const verified = await verifyRes.json() as VerifyResponse;
    localStorage.setItem(SESSION_KEY, verified.sessionToken);
    setSessionToken(verified.sessionToken);
    setAuthState("authenticated");
    setUserId(verified.userId);
    setWallets([{ displayAddress: verified.wallet.displayAddress, provider: verified.wallet.provider, chain: verified.wallet.chain }]);
  };

  const logout = async () => {
    if (sessionToken) await fetch(`${API_BASE}/v1/auth/logout`, { method: "POST", headers: { "x-session-token": sessionToken } });
    localStorage.removeItem(SESSION_KEY);
    setSessionToken(null);
    setUserId(null);
    setWallets([]);
    setAuthState("signed_out");
  };

  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/80 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Expedition Identity</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-100">Enter the world with your wallet</h3>
      <p className="mt-2 text-sm text-slate-400">Wallet sign-in creates or restores your Perbug account. Guests can still browse market intel before linking.</p>

      {authState === "authenticated" ? (
        <div className="mt-4 space-y-2 text-sm text-slate-300">
          <p>Commander ID: <span className="font-medium text-slate-100">{userId}</span></p>
          {wallets.map((wallet) => (
            <p key={`${wallet.chain}:${wallet.displayAddress}`}>{wallet.provider} · {wallet.chain} · {wallet.displayAddress}</p>
          ))}
          <button onClick={logout} className="mt-2 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200">Sign out</button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => signInWithMetamask().catch((err) => { setError(String(err)); setAuthState("auth_failed"); })} className="rounded-lg border border-emerald-400/70 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-200">MetaMask</button>
            <button onClick={() => signInWithPhantom().catch((err) => { setError(String(err)); setAuthState("auth_failed"); })} className="rounded-lg border border-violet-400/70 bg-violet-500/20 px-3 py-2 text-sm text-violet-200">Phantom</button>
            <button onClick={() => setAuthState("guest")} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300">Continue as Guest</button>
          </div>
          <p className="text-xs text-slate-500">{walletConnectHint}</p>
          {authState === "awaiting_signature" ? <p className="text-xs text-amber-300">Awaiting signature confirmation…</p> : null}
          {authState === "guest" ? <p className="text-xs text-cyan-300">Guest mode active. Link a wallet anytime in profile settings.</p> : null}
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
        </div>
      )}

      {wallets.length > 0 ? <p className="mt-3 text-xs text-slate-500">Primary wallet: {wallets[0]!.displayAddress}</p> : null}
    </div>
  );
}
