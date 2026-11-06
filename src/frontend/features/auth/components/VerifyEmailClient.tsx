"use client";

import Link from "next/link";
import { useState } from "react";

type VerificationState = "idle" | "loading" | "success" | "error";

export default function VerifyEmailClient({ token }: { token: string }) {
  const [state, setState] = useState<VerificationState>(token ? "idle" : "error");
  const [message, setMessage] = useState(token ? "" : "O link de verificação não contém um token válido. Solicite um novo link.");

  async function confirmEmail() {
    if (!token) {
      setState("error");
      setMessage("O link de verificação não contém um token válido.");
      return;
    }

    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Não foi possível verificar o e-mail.",
        );
      }

      setState("success");
      setMessage("O endereço de e-mail foi confirmado. A sua conta MARKA está activa.");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível verificar o e-mail. Solicite um novo link.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[var(--theme-background)] px-6 py-16 text-[var(--theme-text)]">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center">
        <section className="w-full rounded-[2rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12">
          <div className="mb-8 text-3xl font-semibold tracking-[0.28em]">MARKA</div>

          {state === "success" ? (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]">
                <span aria-hidden="true" className="text-2xl text-[var(--theme-accent)]">✓</span>
              </div>
              <h1 className="text-2xl font-semibold">E-mail confirmado</h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--theme-text-muted)]">{message}</p>
              <Link href="/auth/login" className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-[var(--theme-accent)] px-6 py-4 font-medium text-[var(--theme-background)] transition hover:opacity-90">
                Entrar no MARKA
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">
                {state === "error" ? "Não foi possível confirmar" : "Confirme o seu e-mail"}
              </h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--theme-text-muted)]">
                {message || "Para activar a sua conta MARKA, confirme que tem acesso a este endereço de e-mail."}
              </p>
              {state !== "error" && (
                <button
                  type="button"
                  onClick={confirmEmail}
                  disabled={state === "loading" || !token}
                  className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-[var(--theme-accent)] px-6 py-4 font-medium text-[var(--theme-background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {state === "loading" ? "A confirmar..." : "Confirmar e-mail"}
                </button>
              )}
              {state === "error" && (
                <Link href="/auth/login" className="mt-8 inline-flex w-full items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-4 font-medium text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-strong)]">
                  Voltar e solicitar novo link
                </Link>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
