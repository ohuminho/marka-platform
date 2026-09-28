"use client";

import {
  useEffect,
  useState,
} from "react";

import ProductCard from "./ProductCard";
import MarketplaceSearch from "./MarketplaceSearch";
import MarketplaceFilters from "./MarketplaceFilters";
import { usePlatformPreferences } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";

import {
  MarketplaceProduct,
} from "../types/marketplace.types";

type MarketplaceProductsResponse = {
  products: MarketplaceProduct[];
};

export default function ProductGrid() {
  const { language } = usePlatformPreferences();
  const t = usePlatformTranslation(language);
  const [
    products,
    setProducts,
  ] = useState<MarketplaceProduct[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    verifiedOnly,
    setVerifiedOnly,
  ] = useState(false);

  const [
    sortBy,
    setSortBy,
  ] = useState("latest");

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        if (search) {
          params.set("search", search);
        }

        if (verifiedOnly) {
          params.set("verifiedOnly", "true");
        }

        params.set("sortBy", sortBy);

        const response = await fetch(
          `/api/marketplace/products?${params.toString()}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data =
          (await response.json()) as
            | MarketplaceProductsResponse
            | {
                message?: string;
                code?: string;
              };

        if (!response.ok) {
          throw new Error(
            "message" in data && data.message
              ? data.message
              : "Unable to load marketplace products."
          );
        }

        if (
          !data ||
          !("products" in data) ||
          !Array.isArray(data.products)
        ) {
          throw new Error(
            "Marketplace returned an invalid product response."
          );
        }

        if (!cancelled) {
          setProducts(data.products);
        }
      } catch (requestError) {
        if (!cancelled) {
          setProducts([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load marketplace products."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [
    search,
    verifiedOnly,
    sortBy,
  ]);

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-[var(--theme-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">Discover</p>
          <h2 className="marka-editorial mt-1 text-3xl text-[var(--theme-text)]">Escolhas para si.</h2>
        </div>
        <div className="w-full lg:max-w-md">
          <MarketplaceSearch onSearch={setSearch} />
        </div>
      </div>

      <MarketplaceFilters
        verifiedOnly={verifiedOnly}
        onVerifiedChange={setVerifiedOnly}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {loading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="aspect-[4/4.3] animate-pulse rounded-[1.25rem] border border-[var(--theme-border)] bg-[var(--theme-surface)]" />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-10 rounded-[1.25rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-sm text-[var(--theme-text-muted)]"
        >
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-10 overflow-hidden rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 sm:p-12">
          <div className="max-w-xl">
            <p className="marka-kicker">MARKA MARKETPLACE</p>
            <h3 className="marka-editorial mt-4 text-4xl text-[var(--theme-text)]">A sua próxima descoberta começa aqui.</h3>
            <p className="mt-4 text-sm leading-7 text-[var(--theme-text-muted)]">{t.noProducts}</p>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      )}
    </div>
  );
}