"use client";

import { useCallback, useEffect, useState } from "react";
import CartDrawer from "@/frontend/features/cart/components/CartDrawer";
import { getCart } from "@/frontend/features/cart/services/cart.client";

export default function CartButton() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const cart = await getCart();
      setCount(cart.items.reduce((sum, item) => sum + item.quantity, 0));
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadCount(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCount]);

  return (
    <>
      <button
        type="button"
        aria-label="Cart"
        title="Cart"
        onClick={() => setOpen(true)}
        className="group relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-transparent bg-transparent text-[var(--theme-text-muted)] transition-colors hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface)]/55 hover:text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="20" r="1" /><circle cx="20" cy="20" r="1" /><path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L23 6H6" />
        </svg>
        {count > 0 && (
          <span className="absolute right-[4px] top-[4px] flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-[var(--theme-background)] bg-[var(--theme-accent-strong)] px-1 text-[7px] font-bold text-[var(--theme-background)]">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--theme-background)_62%,transparent)] backdrop-blur-[3px]">
          <div onClick={(event) => event.stopPropagation()} className="absolute right-0 top-0 z-50">
            <CartDrawer />
          </div>
        </div>
      )}
    </>
  );
}
