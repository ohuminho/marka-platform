"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

type Sale = {
  id: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  deliveryAddress: string | null;
  fulfillment: { id: string; status: string; exceptionCode: string | null } | null;
  items: Array<{ id: string; productName: string; sku: string; quantity: number; subtotal: number }>;
};

export default function VendorSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { activeOrganization, hasPermission } = useAuth();

  async function load(orgId: string, selectedStatus: string) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ organizationId: orgId, limit: "50", offset: "0" });
      if (selectedStatus) query.set("status", selectedStatus);
      const response = await fetch(`/api/vendor/sales?${query.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Unable to load sales.");
      setSales(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load sales.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeOrganization?.id) {
      void load(activeOrganization.id, status);
    }
  }, [activeOrganization?.id, status]);

  async function updateStatus(orderId: string, nextStatus: "CONFIRMED" | "PROCESSING" | "CANCELLED") {
    const organizationId = activeOrganization?.id;
    if (!organizationId) return;
    setError("");
    try {
      const response = await fetch("/api/vendor/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId, orderId, status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Unable to update order.");
      await load(organizationId, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update order.");
    }
  }



  return (
    <section className="space-y-6">
      {!activeOrganization ? <div className="rounded-xl border border-white/10 p-4 text-white/50">Select an active organization first.</div> : null}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold">Sales</h1>
          <p className="mt-2 text-white/50">Orders containing your products.</p>
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-white/10 bg-black/30 px-4 py-3"
          aria-label="Filter sales by order status"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </header>

      {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-white/50">Orders</span>
          <span className="text-white/60">{total}</span>
        </div>
        {loading ? (
          <p className="text-white/50">Loading sales…</p>
        ) : sales.length === 0 ? (
          <p className="text-white/50">No sales found.</p>
        ) : (
          <div className="space-y-4">
            {sales.map((sale) => (
              <article key={sale.id} className="rounded-xl border border-white/10 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{sale.id}</p>
                    <p className="text-sm text-white/50">{new Date(sale.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-semibold">{sale.total.toLocaleString()} {sale.currency}</p>
                    <p className="text-sm text-white/50">{sale.status}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-white/70">
                  {sale.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-4">
                      <span>{item.quantity} × {item.productName}</span>
                      <span>{item.subtotal.toLocaleString()} {sale.currency}</span>
                    </div>
                  ))}
                </div>
                {hasPermission("ORDER_MANAGE") ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {sale.status === "PENDING" ? (
                      <>
                        <button type="button" onClick={() => void updateStatus(sale.id, "CONFIRMED")} className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Confirm</button>
                        <button type="button" onClick={() => void updateStatus(sale.id, "CANCELLED")} className="rounded-lg border border-red-500/20 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10">Cancel</button>
                      </>
                    ) : null}
                    {sale.status === "CONFIRMED" ? (
                      <>
                        <button type="button" onClick={() => void updateStatus(sale.id, "PROCESSING")} className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Start processing</button>
                        <button type="button" onClick={() => void updateStatus(sale.id, "CANCELLED")} className="rounded-lg border border-red-500/20 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10">Cancel</button>
                      </>
                    ) : null}
                  </div>
                ) : null}
                {sale.fulfillment ? (
                  <div className="mt-4 text-sm text-white/50">
                    Fulfillment: {sale.fulfillment.status}
                    {sale.fulfillment.exceptionCode ? ` · ${sale.fulfillment.exceptionCode}` : ""}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
