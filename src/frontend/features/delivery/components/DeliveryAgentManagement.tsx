"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

type Agent = {
  id: string;
  userId: string;
  status: string;
  availability: string;
  transportMode: string;
  displayName: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  lastLocationAt: string | null;
  createdAt: string;
  user: { name: string; email: string };
};

export default function DeliveryAgentManagement() {
  const { activeOrganization, hasPermission } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!activeOrganization?.id || !hasPermission("DELIVERY_AGENT_MANAGE")) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/delivery/agents?organizationId=${encodeURIComponent(activeOrganization.id)}&limit=100`,
        { credentials: "include", cache: "no-store" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.code ?? "DELIVERY_AGENT_LIST_FAILED");
      }

      setAgents(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load delivery agents.");
    } finally {
      setLoading(false);
    }
  }, [activeOrganization?.id, hasPermission]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const activate = async (agentId: string) => {
    setError("");

    const response = await fetch(`/api/delivery/agents/${agentId}/activate`, {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.code ?? "DELIVERY_AGENT_ACTIVATION_FAILED");
      return;
    }

    await load();
  };

  if (!activeOrganization) {
    return <section className="p-6">Select an organization.</section>;
  }

  if (!hasPermission("DELIVERY_AGENT_MANAGE")) {
    return <section className="p-6">You do not have permission to manage delivery agents.</section>;
  }

  return (
    <section className="space-y-6 p-6">
      <header>
        <p className="text-sm opacity-70">Delivery Operations</p>
        <h1 className="text-3xl font-semibold">Delivery Agents</h1>
        <p className="mt-1 text-sm opacity-70">{total} agents in this organization.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-400/40 p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border p-6">Loading delivery agents...</div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border p-6">No delivery agents registered.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="border-b">
              <tr>
                <th className="p-4">Agent</th>
                <th className="p-4">Status</th>
                <th className="p-4">Availability</th>
                <th className="p-4">Transport</th>
                <th className="p-4">Location</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-b last:border-0">
                  <td className="p-4">
                    <div className="font-medium">{agent.displayName ?? agent.user.name}</div>
                    <div className="opacity-60">{agent.user.email}</div>
                  </td>
                  <td className="p-4">{agent.status}</td>
                  <td className="p-4">{agent.availability}</td>
                  <td className="p-4">{agent.transportMode}</td>
                  <td className="p-4">
                    {agent.latitude !== null && agent.longitude !== null
                      ? `${agent.latitude.toFixed(5)}, ${agent.longitude.toFixed(5)}`
                      : "No location"}
                  </td>
                  <td className="p-4">
                    {agent.status !== "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => void activate(agent.id)}
                        className="rounded-lg border px-3 py-2"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
