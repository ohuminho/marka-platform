"use client";

import { useState } from "react";
import Link from "next/link";
import { usePlatformPreferences } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";
import { MarketplaceProduct } from "../types/marketplace.types";
import VendorTrustBadge from "./VendorTrustBadge";

export default function ProductCard({ product }: { product: MarketplaceProduct }) {
  const { language } = usePlatformPreferences();
  const t = usePlatformTranslation(language);
  const currency = "AOA";
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const canPurchase = product.status === "ACTIVE" && product.stock > 0;
  const availabilityLabel = canPurchase ? "Disponível" : "Indisponível";
  const itemCondition = typeof product.attributes?.itemCondition === "string" ? product.attributes.itemCondition : null;
  const itemConditionLabel = itemCondition === "USED" ? "Usado" : itemCondition === "REFURBISHED" ? "Recondicionado" : itemCondition === "NEW" ? "Novo" : null;
  const stockLabel = product.stock < 1
    ? "Sem stock"
    : product.stock <= 3
      ? `Últimas ${product.stock} unidades`
      : `${product.stock} disponíveis`;

  async function addToCart() {
    if (adding || product.status !== "ACTIVE" || product.stock < 1) return;

    setAdding(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Inicie sessão para adicionar produtos ao carrinho.");
        }
        throw new Error(data.message || "Não foi possível adicionar o produto.");
      }

      // Open the cart for this seller. Carts belonging to other stores stay intact.
      window.location.assign(`/app/cart?storeId=${encodeURIComponent(product.store.id)}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Ocorreu um erro ao adicionar o produto.");
      setAdding(false);
    }
  }

  return (
    <article className="group overflow-hidden rounded-[1.25rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2.5 backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(0,0,0,0.16)]">
      <Link href={`/produto/${product.id}`} aria-label={`Ver ${product.name}`} className="relative block aspect-[4/4.3] overflow-hidden rounded-[1rem] bg-[var(--theme-background)]">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--theme-text-faint)]">MARKA</span>
            <span className="marka-editorial text-2xl text-[var(--theme-text-muted)]">{t.product}</span>
          </div>
        )}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="max-w-[70%] truncate rounded-full border border-[var(--theme-border)] bg-[var(--theme-header)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-text-muted)] backdrop-blur-xl">
            {product.category?.name || "MARKA"}
          </span>
          {itemConditionLabel && <span className="shrink-0 rounded-full border border-[var(--theme-border)] bg-[var(--theme-header)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--theme-text)] backdrop-blur-xl">{itemConditionLabel}</span>}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate marka-editorial text-xl text-[var(--theme-text)]"><Link href={`/produto/${product.id}`} className="transition hover:underline">{product.name}</Link></h3>
            <p className="mt-1 truncate text-xs text-[var(--theme-text-muted)]">{product.store.name}</p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-[var(--theme-text)]">
            {new Intl.NumberFormat(language === "pt" ? "pt-AO" : language, { style: "currency", currency }).format(product.price)}
          </p>
        </div>

        <div className="mt-4">
          <VendorTrustBadge verified={product.store.verified} />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--theme-border)] pt-4">
          <span className="text-[10px] tracking-[0.04em] text-[var(--theme-text-faint)]" aria-label={`Stock: ${product.stock}`}>
            {t.stock}: {stockLabel}
          </span>
          <span className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${canPurchase ? "border-[var(--theme-border)] text-[var(--theme-text-muted)]" : "border-[var(--theme-border)] text-[var(--theme-text-faint)]"}`}>
            {availabilityLabel}
          </span>
        </div>

        {feedback && <p role="alert" className="mt-3 text-xs text-red-600">{feedback}</p>}
        <button
          type="button"
          onClick={() => void addToCart()}
          disabled={adding || !canPurchase}
          className="mt-4 w-full rounded-full bg-[var(--theme-text)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-background)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {adding ? "A adicionar..." : canPurchase ? "Adicionar ao carrinho" : "Indisponível"}
        </button>
      </div>
    </article>
  );
}
