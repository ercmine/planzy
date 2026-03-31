import { useMemo } from "react";

type Particle = {
  id: number;
  size: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
};

export default function WalletIdentityPanel() {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        id: index,
        size: 8 + ((index * 7) % 22),
        left: `${(index * 13.7) % 100}%`,
        top: `${(index * 17.9) % 100}%`,
        delay: `${(index * 0.22).toFixed(2)}s`,
        duration: `${8 + (index % 7)}s`,
      })),
    [],
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/40 p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.2),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.15),transparent_50%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.12),transparent_50%)]" />
        {particles.map((particle: Particle) => (
          <span
            key={particle.id}
            className="absolute rounded-full border border-emerald-300/30 bg-emerald-200/20 shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-pulse"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
        <div className="absolute -left-16 top-6 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -right-12 bottom-3 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl" />
      </div>

      <div className="relative z-10">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/90">Expedition Atmosphere</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-100">Market aether initialized</h3>
        <p className="mt-2 text-sm text-slate-300">
          The wallet gate intro has been removed. Drift through the exchange while ambient particles and soft motion keep the interface alive.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-300">
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-2">
            <p className="text-[11px] uppercase tracking-widest text-emerald-200">Motion</p>
            <p className="mt-1 text-sm text-slate-100">Calm</p>
          </div>
          <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2 py-2">
            <p className="text-[11px] uppercase tracking-widest text-cyan-200">Particles</p>
            <p className="mt-1 text-sm text-slate-100">Live</p>
          </div>
          <div className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2 py-2">
            <p className="text-[11px] uppercase tracking-widest text-violet-200">Entry</p>
            <p className="mt-1 text-sm text-slate-100">Open</p>
          </div>
        </div>
      </div>
    </div>
  );
}
