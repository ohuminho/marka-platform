"use client";

import { FormEvent, useState } from "react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setMessage("O link de recuperação está incompleto. Solicita um novo email de recuperação.");
      return;
    }
    if (password.length < 12 || password.length > 128) {
      setMessage("A palavra-passe deve ter entre 12 e 128 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setMessage("As palavras-passe não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Não foi possível atualizar a palavra-passe.");
      setMessage(data?.message || "Palavra-passe atualizada.");
      setPassword("");
      setConfirmation("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a palavra-passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] px-5 py-12 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.35em] text-[#e9bd58]">MARKA</p>
        <h1 className="mt-5 text-2xl font-semibold">Criar nova palavra-passe</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">Define uma palavra-passe nova para recuperares o acesso à tua conta. O link só pode ser utilizado uma vez e expira em 30 minutos.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nova palavra-passe" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-4 outline-none focus:border-[#e9bd58]" />
          <input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Confirmar palavra-passe" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-4 outline-none focus:border-[#e9bd58]" />
          {message && <p role="status" aria-live="polite" className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">{message}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-[#e9bd58] px-4 py-4 font-semibold text-black disabled:opacity-50">{loading ? "A atualizar..." : "Atualizar palavra-passe"}</button>
        </form>
        <a href="/auth/login" className="mt-6 block text-center text-sm text-white/60 underline underline-offset-4">Voltar ao início de sessão</a>
      </section>
    </main>
  );
}
