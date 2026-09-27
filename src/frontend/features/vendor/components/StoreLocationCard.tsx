"use client";

import { FormEvent, useState } from "react";

interface StoreLocationCardProps {
  store: {
    id: string;
    name: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
  };
}

export default function StoreLocationCard({
  store,
}: StoreLocationCardProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const latitude = Number(formData.get("latitude"));
    const longitude = Number(formData.get("longitude"));

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Informe coordenadas válidas.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/stores/${store.id}/location`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude,
          longitude,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Não foi possível guardar a localização.");
      }

      setMessage("Localização da loja atualizada.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível guardar a localização.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Localização da loja</h2>
        <p className="mt-1 text-sm text-white/50">
          Necessária para calcular a origem do dispatch de delivery.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-white/70">Latitude</span>
            <input
              name="latitude"
              type="number"
              step="any"
              min="-90"
              max="90"
              defaultValue={store.latitude ?? ""}
              placeholder="-8.8383"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-white/30"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/70">Longitude</span>
            <input
              name="longitude"
              type="number"
              step="any"
              min="-180"
              max="180"
              defaultValue={store.longitude ?? ""}
              placeholder="13.2344"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-white/30"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "A guardar..." : "Guardar localização"}
          </button>

          {message ? (
            <span className="text-sm text-emerald-400">{message}</span>
          ) : null}

          {error ? (
            <span className="text-sm text-red-400">{error}</span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
