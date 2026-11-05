"use client";

import { useState } from "react";

export default function PublicProductPurchase({ productId, storeId }: { productId: string; storeId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function addToCart() {
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      if (response.status === 401) {
        setMessage("Inicie sessão para continuar a compra.");
        return;
      }
      if (!response.ok) throw new Error(payload?.message || "Não foi possível adicionar o produto ao carrinho.");
      try {
        if (window.localStorage.getItem("marka_growth_consent_v1") === "accepted") {
          let visitorId = window.localStorage.getItem("marka_growth_visitor_v1");
          if (!visitorId) {
            visitorId = window.crypto?.randomUUID?.() ?? null;
            if (visitorId) window.localStorage.setItem("marka_growth_visitor_v1", visitorId);
          }
          if (visitorId) {
            void fetch("/api/growth/events", {
              method: "POST",
              credentials: "same-origin",
              keepalive: true,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: "add_to_cart",
                consent: true,
                visitorId,
                path: window.location.pathname.slice(0, 300),
                entityId: productId,
              }),
            }).catch(() => undefined);
          }
        }
      } catch {
        // Analytics must not interrupt a successful cart operation.
      }
      window.location.assign(`/app/cart?storeId=${encodeURIComponent(storeId)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void addToCart()} disabled={loading}
        className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#f8dfaa] to-[#d9a947] px-8 text-sm font-bold text-[#17120a] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
        {loading ? "A adicionar..." : "Adicionar ao carrinho →"}
      </button>
      {message && (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/65">
          <span>{message}</span>
          {message.includes("Inicie sessão") && <a href="/auth/login" className="font-semibold text-[#f2d18e] underline underline-offset-4">Entrar na MARKA</a>}
        </div>
      )}
    </div>
  );
}
