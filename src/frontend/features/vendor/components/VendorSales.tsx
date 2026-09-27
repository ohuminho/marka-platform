"use client";

import { useEffect, useState } from "react";

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
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    const stored = window.localStorage.getItem("marka.activeOrganizationId");
    if (stored) {
      setOrganizationId(stored);
      void load(stored, "");
    } else {
      setLoading(false);
      setError("Select an active organization first.");
    }
  }, []);

  function changeStatus(value: string) {
    setStatus(value);
    if (organizationId) void load(organizationId, value);
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold">Sales</h1>
          <p className="mt-2 text-white/50">Orders containing your products.</p>
        </div>
        <select
          value={status}
          onChange={(event) => changeStatus(event.target.value)}
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
