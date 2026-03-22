import { useMemo, useState } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import '@solana/wallet-adapter-react-ui/styles.css';

type Dashboard = {
  wallet?: { publicKey: string };
  claimable: Array<{ review: { id: string; finalRewardAmount?: number; rewardStatus: string }, place: { name: string }, claim?: { explorerUrl?: string } }>;
  history: Array<{ review: { id: string; rewardStatus: string; finalRewardAmount?: number }, place: { name: string }, claim?: { explorerUrl?: string } }>;
  totals: { claimableDisplay: string; claimedDisplay: string; pendingCount: number };
};

function RewardsConsoleInner({ apiBaseUrl, cluster }: { apiBaseUrl: string; cluster: string }) {
  const wallet = useWallet();
  const [userId, setUserId] = useState('demo-creator');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [status, setStatus] = useState<string>('Connect Phantom to claim PERBUG');

  async function signIn() {
    if (!wallet.publicKey || !wallet.signMessage) return;
    const nonceResponse = await fetch(`${apiBaseUrl}/v1/wallet-auth/nonce`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ publicKey: wallet.publicKey.toBase58() })
    });
    const nonce = await nonceResponse.json() as { message: string };
    const signature = await wallet.signMessage(new TextEncoder().encode(nonce.message));
    const signatureBase58 = await import('bs58').then((mod) => mod.default.encode(signature));
    const verifyResponse = await fetch(`${apiBaseUrl}/v1/wallet-auth/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ publicKey: wallet.publicKey.toBase58(), signature: signatureBase58, userId })
    });
    const verified = await verifyResponse.json() as { userId: string };
    setUserId(verified.userId);
    setStatus('Wallet connected. Your review was approved and is now claimable.');
    await loadDashboard(verified.userId);
  }

  async function loadDashboard(targetUserId = userId) {
    const response = await fetch(`${apiBaseUrl}/v1/creator/rewards/dashboard`, { headers: { 'x-user-id': targetUserId } });
    setDashboard(await response.json() as Dashboard);
  }

  async function claim(reviewId: string) {
    if (!wallet.publicKey) return;
    setStatus('Claim submitted');
    const response = await fetch(`${apiBaseUrl}/v1/rewards/reviews/${reviewId}/claim`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ walletPublicKey: wallet.publicKey.toBase58() })
    });
    if (!response.ok) {
      const payload = await response.text();
      setStatus(`Claim failed: ${payload}`);
      return;
    }
    setStatus('Claim confirmed on Solana');
    await loadDashboard(userId);
  }

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-white shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Creator rewards</p>
          <h2 className="text-2xl font-semibold">PERBUG claim console</h2>
          <p className="text-sm text-slate-300">Cluster: {cluster}. Connect Phantom to claim PERBUG.</p>
        </div>
        <WalletMultiButton />
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="rounded-full bg-cyan-400 px-4 py-2 font-medium text-slate-950" onClick={signIn} disabled={!wallet.connected}>Sign in with wallet</button>
        <button className="rounded-full border border-white/20 px-4 py-2" onClick={() => loadDashboard()}>Refresh rewards</button>
      </div>
      <p className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-200">{status}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900/70 p-4"><div className="text-sm text-slate-400">Claimable</div><div className="text-3xl font-semibold">{dashboard?.totals.claimableDisplay ?? '0'} PERBUG</div></div>
        <div className="rounded-2xl bg-slate-900/70 p-4"><div className="text-sm text-slate-400">Claimed</div><div className="text-3xl font-semibold">{dashboard?.totals.claimedDisplay ?? '0'} PERBUG</div></div>
        <div className="rounded-2xl bg-slate-900/70 p-4"><div className="text-sm text-slate-400">Pending reviews</div><div className="text-3xl font-semibold">{dashboard?.totals.pendingCount ?? 0}</div></div>
      </div>
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Claimable rewards</h3>
        {(dashboard?.claimable ?? []).length === 0 ? <p className="text-sm text-slate-400">No claimable rewards yet.</p> : dashboard?.claimable.map((item) => (
          <div key={item.review.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div>
              <div className="font-medium">{item.place.name}</div>
              <div className="text-sm text-slate-400">This place’s next approved review earns transparent per-place rewards.</div>
            </div>
            <div className="flex items-center gap-3">
              <span>{item.review.finalRewardAmount ?? 0} PERBUG</span>
              <button className="rounded-full bg-emerald-400 px-4 py-2 font-medium text-slate-950" onClick={() => claim(item.review.id)}>Claim</button>
            </div>
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Claim history</h3>
        {(dashboard?.history ?? []).map((item) => (
          <div key={item.review.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{item.place.name}</div>
                <div className="text-sm text-slate-400">Status: {item.review.rewardStatus}</div>
              </div>
              {item.claim?.explorerUrl ? <a className="text-cyan-300 underline" href={item.claim.explorerUrl} target="_blank">Open transaction</a> : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function RewardsClaimConsole(props: { apiBaseUrl: string; cluster: string }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const endpoint = useMemo(() => props.cluster === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com', [props.cluster]);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <RewardsConsoleInner apiBaseUrl={props.apiBaseUrl} cluster={props.cluster} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
