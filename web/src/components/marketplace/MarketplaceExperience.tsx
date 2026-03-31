import { useEffect, useMemo, useState } from "react";
import WalletIdentityPanel from "./WalletIdentityPanel";

type AssetType = "character" | "item" | "relic" | "map_asset" | "cosmetic" | "special_event_asset" | "nft_backed_asset";

type Listing = {
  listingId: string;
  assetName: string;
  assetType: AssetType;
  rarity: string;
  status: string;
  metadata: { imageUrl: string; summary: string; roleClass?: string; relicSlot?: string; relicType?: string; mapLink?: { regionName: string; landmarkName?: string } };
  provenance: { originLabel: string; tags: string[] };
  price: { amount: string; currency: { symbol: string; code: string } };
  seller: { handle: string };
};

type SearchResult = { items: Listing[]; total: number };
type ListingDetail = { listing: Listing; lore: string; debug: { projectedFromModules: string[]; schemaVersion: string } };

const API_BASE = import.meta.env.PUBLIC_API_BASE_URL || "";
const categories: Array<{ key: AssetType | "all"; label: string }> = [
  { key: "all", label: "All Assets" },
  { key: "character", label: "Special Characters" },
  { key: "item", label: "Rare Items" },
  { key: "relic", label: "Relics" },
  { key: "map_asset", label: "Map-linked" },
];

export default function MarketplaceExperience() {
  const [category, setCategory] = useState<AssetType | "all">("all");
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const endpoint = useMemo(() => {
    const url = new URL(`${API_BASE}/v1/perbug/marketplace/listings`, window.location.origin);
    if (category !== "all") url.searchParams.set("category", category);
    if (query.trim()) url.searchParams.set("q", query.trim());
    return `${url.pathname}${url.search}`;
  }, [category, query]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(endpoint)
      .then((r) => r.json() as Promise<SearchResult>)
      .then((payload) => {
        if (!active) return;
        setListings(payload.items ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [endpoint]);

  const openDetail = async (listingId: string) => {
    const res = await fetch(`${API_BASE}/v1/perbug/marketplace/listings/${listingId}`);
    const payload = await res.json() as ListingDetail;
    setDetail(payload);
  };

  const handleGetStarted = () => {
    setHasStarted(true);
    setCategory("all");
    setQuery("");
    window.requestAnimationFrame(() => {
      document.getElementById("marketplace-listings")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className="rounded-3xl border border-emerald-600/40 bg-slate-950/90 p-6 shadow-[0_0_80px_rgba(16,185,129,0.1)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Grand Exchange Hall</p>
          <h2 className="text-3xl font-semibold text-slate-100">Perbug Marketplace</h2>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search assets, relic types, regions..."
          className="w-full rounded-xl border border-emerald-700/40 bg-slate-900 px-4 py-2 text-sm text-slate-100 md:w-96"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-wrap gap-2">
        {categories.map((entry) => (
          <button
            key={entry.key}
            onClick={() => setCategory(entry.key)}
            className={`rounded-full border px-3 py-1 text-sm transition ${category === entry.key ? "border-emerald-400 bg-emerald-500/20 text-emerald-200" : "border-slate-700 text-slate-300"}`}
          >
            {entry.label}
          </button>
        ))}
        </div>
        <WalletIdentityPanel onGetStarted={handleGetStarted} />
      </div>

      {loading ? <p className="mt-6 text-sm text-slate-400">Opening market ledgers…</p> : null}

      <div id="marketplace-listings" className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <button
            key={listing.listingId}
            onClick={() => openDetail(listing.listingId)}
            className="group rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-4 text-left hover:border-emerald-400/70"
          >
            <img src={listing.metadata.imageUrl} alt={listing.assetName} className="h-28 w-full rounded-xl border border-slate-700 bg-slate-900 object-cover" />
            <p className="mt-3 text-xs uppercase tracking-widest text-emerald-300">{listing.assetType.replace("_", " ")}</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-100">{listing.assetName}</h3>
            <p className="mt-1 text-sm text-slate-400">{listing.metadata.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded border border-violet-500/50 px-2 py-1">{listing.rarity}</span>
              {listing.provenance.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded border border-slate-600 px-2 py-1">{tag}</span>)}
            </div>
            {listing.metadata.mapLink ? <p className="mt-2 text-xs text-amber-300">{listing.metadata.mapLink.regionName} · {listing.metadata.mapLink.landmarkName ?? "World Node"}</p> : null}
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-slate-400">Seller {listing.seller.handle}</span>
              <span className="font-semibold text-emerald-300">{listing.price.currency.symbol}{listing.price.amount}</span>
            </div>
          </button>
        ))}
      </div>
      {hasStarted ? <p className="mt-3 text-xs text-emerald-300">Expedition initialized. Browse live marketplace listings below.</p> : null}

      {detail ? (
        <aside className="mt-8 rounded-2xl border border-emerald-500/50 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Inspection View</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-100">{detail.listing.assetName}</h3>
          <p className="mt-2 text-slate-300">{detail.lore}</p>
          <p className="mt-3 text-sm text-slate-400">Provenance: {detail.listing.provenance.originLabel}</p>
          <p className="text-sm text-slate-400">Pipeline: {detail.debug.projectedFromModules.join(" → ")} ({detail.debug.schemaVersion})</p>
          <div className="mt-4 flex gap-2">
            <button className="rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/30">
              Buy (coming soon)
            </button>
            <button className="rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/30">
              List Similar (coming soon)
            </button>
            <button className="rounded-lg border border-violet-400/60 bg-violet-500/20 px-3 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-500/30">
              View on Map (coming soon)
            </button>
          </div>
        </aside>
      ) : null}
    </section>
  );
}
