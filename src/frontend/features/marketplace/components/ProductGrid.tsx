"use client";

import {
  useEffect,
  useState,
} from "react";

import ProductCard from "./ProductCard";
import MarketplaceSearch from "./MarketplaceSearch";
import MarketplaceFilters from "./MarketplaceFilters";

import {
  MarketplaceProduct,
} from "../types/marketplace.types";

type MarketplaceProductsResponse = {
  products: MarketplaceProduct[];
};

export default function ProductGrid() {
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
      <MarketplaceSearch
        onSearch={setSearch}
      />

      <MarketplaceFilters
        verifiedOnly={verifiedOnly}
        onVerifiedChange={setVerifiedOnly}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {loading ? (
        <div className="mt-10 text-white/50">
          Loading marketplace...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6 text-white/70"
        >
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-10 text-white/50">
          No products found.
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-3">
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