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
import { trackGrowthEvent } from "@/frontend/features/growth/track-growth-event";

type MarketplaceCategory = { id: string; name: string };
type MarketplaceStore = { id: string; name: string; description: string | null; logo: string | null; location: string | null; productCount: number; verified: boolean; owner: { id: string; name: string; avatarUrl: string | null } };
type MarketplaceProductsResponse = {
  products: MarketplaceProduct[];
  categories?: MarketplaceCategory[];
};

export default function ProductGrid() {
  const { language } = usePlatformPreferences();
  const t = usePlatformTranslation(language);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [stores, setStores] = useState<MarketplaceStore[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("latest");
  const [categoryId, setCategoryId] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const selectedCategory = categories.find((category) => category.id === categoryId);

  useEffect(() => {
    trackGrowthEvent("marketplace_view");
  }, []);

  useEffect(() => {
    if (search.trim()) trackGrowthEvent("search");
  }, [search]);

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
    async function loadStores() {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (verifiedOnly) params.set("verifiedOnly", "true");
        const response = await fetch("/api/marketplace/stores?" + params.toString(), { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Não foi possível carregar as lojas.");
        if (!cancelled) setStores(Array.isArray(data.stores) ? data.stores as MarketplaceStore[] : []);
      } catch {
        if (!cancelled) setStores([]);
      }
    }
    void loadStores();
    return () => { cancelled = true; };
  }, [search, verifiedOnly]);

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
        <section className="mt-5" aria-label="Selector de categorias do Marketplace">
          <button
            type="button"
            onClick={() => setCategoriesOpen((open) => !open)}
            aria-expanded={categoriesOpen}
            aria-controls="marketplace-category-options"
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-4 text-left transition hover:border-[var(--theme-accent)] sm:px-5"
          >
            <span className="min-w-0">
              <span className="block text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">Filtrar ofertas</span>
              <span className="mt-1 block truncate text-sm font-semibold text-[var(--theme-text)]">
                {selectedCategory?.name ?? "Categorias"}
              </span>
              <span className="mt-1 block text-xs text-[var(--theme-text-muted)]">
                {selectedCategory ? "Categoria seleccionada" : `Escolha entre ${categories.length} categorias disponíveis`}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="hidden rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--theme-text-muted)] sm:inline">
                {categories.length} categorias
              </span>
              <span aria-hidden="true" className={`text-xl text-[var(--theme-text-muted)] transition-transform ${categoriesOpen ? "rotate-180" : ""}`}>⌄</span>
            </span>
          </button>

          {categoriesOpen && (
            <div
              id="marketplace-category-options"
              className="mt-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 sm:p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">Todas as categorias</p>
                <button
                  type="button"
                  onClick={() => { setCategoryId(""); setCategoriesOpen(false); }}
                  aria-pressed={!categoryId}
                  className={`rounded-full border px-3 py-2 text-[10px] transition ${!categoryId ? "border-[var(--theme-text)] bg-[var(--theme-text)] text-[var(--theme-background)]" : "border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-background)]"}`}
                >
                  Ver tudo
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(category.id);
                      setCategoriesOpen(false);
                      document.getElementById("marketplace-offers")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    aria-pressed={categoryId === category.id}
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-xs transition ${categoryId === category.id ? "border-[var(--theme-text)] bg-[var(--theme-text)] font-semibold text-[var(--theme-background)]" : "border-[var(--theme-border)] text-[var(--theme-text)] hover:border-[var(--theme-accent)] hover:bg-[var(--theme-background)]"}`}
                  >
                    <span>{category.name}</span>
                    <span aria-hidden="true" className="shrink-0 opacity-55">↗</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <MarketplaceFilters verifiedOnly={verifiedOnly} onVerifiedChange={setVerifiedOnly} sortBy={sortBy} onSortChange={setSortBy} />

      <section className="mt-8" aria-labelledby="marketplace-stores-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[9px] uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">Descobrir comerciantes</p><h2 id="marketplace-stores-title" className="marka-editorial mt-1 text-2xl text-[var(--theme-text)]">Lojas no Marketplace</h2><p className="mt-1 text-xs text-[var(--theme-text-muted)]">Todas as lojas ativas são visíveis. O selo Verified distingue os vendedores que concluíram a verificação.</p></div>
          <Link href="/app/vendor/products" className="text-xs font-semibold text-[var(--theme-text)] underline decoration-[var(--theme-border)] underline-offset-4">Criar a minha loja</Link>
        </div>
        {stores.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stores.map((store) => <Link key={store.id} href={"/loja/" + store.id} className="flex min-w-0 items-center gap-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 transition hover:border-[var(--theme-accent)]">
            {store.logo ? <img src={store.logo} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl border border-[var(--theme-border)] object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-background)] text-lg font-bold text-[var(--theme-text-muted)]">M</div>}
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[var(--theme-text)]">{store.name}</span><span className="mt-1 block truncate text-xs text-[var(--theme-text-muted)]">{store.owner.name}{store.location ? " · " + store.location : ""}</span><span className="mt-2 inline-flex rounded-full border border-[var(--theme-border)] px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-[var(--theme-text-muted)]">{store.verified ? "MARKA Verified" : "Loja não verificada"}</span></span>
            <span className="shrink-0 text-xs text-[var(--theme-text-faint)]">{store.productCount} ofertas</span>
          </Link>)}
        </div> : <p className="mt-4 rounded-xl border border-dashed border-[var(--theme-border)] p-5 text-xs text-[var(--theme-text-muted)]">{verifiedOnly ? "Ainda não existem lojas verificadas para este filtro." : "Ainda não existem lojas públicas com este termo de pesquisa."}</p>}
      </section>

      <div id="marketplace-offers" />

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
