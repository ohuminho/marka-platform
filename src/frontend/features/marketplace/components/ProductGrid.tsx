"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import SponsoredAdCard from "@/frontend/features/ads/components/SponsoredAdCard";
import GoogleAdSenseSlot from "@/frontend/features/ads/components/GoogleAdSenseSlot";
import type { Advertisement } from "@/monetization/ads/ad.types";
import MarketplaceSearch from "./MarketplaceSearch";
import MarketplaceFilters from "./MarketplaceFilters";
import { usePlatformPreferences } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";
import { MarketplaceProduct } from "../types/marketplace.types";

type MarketplaceCategory = { id: string; name: string };
type MarketplaceProductsResponse = {
  products: MarketplaceProduct[];
  categories?: MarketplaceCategory[];
};

export default function ProductGrid() {
  const { language } = usePlatformPreferences();
  const t = usePlatformTranslation(language);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("latest");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ads?placement=marketplace_feed", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data.advertisements) ? data.advertisements as Advertisement[] : [];
      })
      .then((items) => { if (!cancelled) setAdvertisements(items); })
      .catch(() => { if (!cancelled) setAdvertisements([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (categoryId) params.set("categoryId", categoryId);
        if (verifiedOnly) params.set("verifiedOnly", "true");
        params.set("sortBy", sortBy);

        const response = await fetch(`/api/marketplace/products?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json() as MarketplaceProductsResponse | { message?: string };
        if (!response.ok) {
          throw new Error("message" in data && data.message ? data.message : "Não foi possível carregar os produtos.");
        }
        if (!data || !("products" in data) || !Array.isArray(data.products)) {
          throw new Error("A resposta do Marketplace é inválida.");
        }
        if (!cancelled) {
          setProducts(data.products);
          setCategories(Array.isArray(data.categories) ? data.categories : []);
        }
      } catch (requestError) {
        if (!cancelled) {
          setProducts([]);
          setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar o Marketplace.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadProducts();
    return () => { cancelled = true; };
  }, [search, verifiedOnly, sortBy, categoryId]);

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-[var(--theme-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">Descobrir</p>
          <h2 className="marka-editorial mt-1 text-3xl text-[var(--theme-text)]">Explore o Marketplace.</h2>
          <p className="mt-2 text-sm text-[var(--theme-text-muted)]">Produtos, lojas e categorias com oferta ativa.</p>
        </div>
        <div className="w-full lg:max-w-md">
          <MarketplaceSearch onSearch={setSearch} />
        </div>
      </div>

      {categories.length > 0 && (
        <nav aria-label="Categorias do Marketplace" className="mt-5 flex gap-2 overflow-x-auto pb-2">
          <button type="button" onClick={() => setCategoryId("")} aria-pressed={!categoryId}
            className={`shrink-0 rounded-full border px-4 py-2.5 text-xs transition ${!categoryId ? "border-[var(--theme-text)] bg-[var(--theme-text)] text-[var(--theme-background)]" : "border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface)]"}`}>
            Todas as categorias
          </button>
          {categories.map((category) => (
            <button key={category.id} type="button" onClick={() => setCategoryId(category.id)} aria-pressed={categoryId === category.id}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-xs transition ${categoryId === category.id ? "border-[var(--theme-text)] bg-[var(--theme-text)] text-[var(--theme-background)]" : "border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface)]"}`}>
              {category.name}
            </button>
          ))}
        </nav>
      )}

      <MarketplaceFilters verifiedOnly={verifiedOnly} onVerifiedChange={setVerifiedOnly} sortBy={sortBy} onSortChange={setSortBy} />

      {loading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="aspect-[4/4.3] animate-pulse rounded-[1.25rem] border border-[var(--theme-border)] bg-[var(--theme-surface)]" />)}
        </div>
      ) : error ? (
        <div role="alert" className="mt-10 rounded-[1.25rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-sm text-[var(--theme-text-muted)]">{error}</div>
      ) : products.length === 0 ? (
        <div className="mt-10 overflow-hidden rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 sm:p-12">
          <div className="max-w-xl">
            <p className="marka-kicker">MARKA MARKETPLACE</p>
            <h3 className="marka-editorial mt-4 text-4xl text-[var(--theme-text)]">{categoryId ? "Ainda não há ofertas nesta categoria." : "A sua próxima descoberta começa aqui."}</h3>
            <p className="mt-4 text-sm leading-7 text-[var(--theme-text-muted)]">{t.noProducts}</p>
            {categoryId && <button type="button" onClick={() => setCategoryId("")} className="mt-5 text-sm underline underline-offset-4">Ver todas as categorias</button>}
            <div><Link href="/app/vendor/products" className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--theme-text)] px-6 py-3.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-background)] transition hover:opacity-85">Abrir loja ou publicar uma oferta</Link></div>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product, index) => (
            <Fragment key={product.id}>
              <ProductCard product={product} />
              {index === 4 ? <GoogleAdSenseSlot /> : null}
              {index === 1 && advertisements[0] ? (
                <SponsoredAdCard advertisement={advertisements[0]} placement="marketplace_feed"
                  context={{ adsEnabled: true, isCheckoutActive: false, isPaymentFlowActive: false }} />
              ) : null}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
