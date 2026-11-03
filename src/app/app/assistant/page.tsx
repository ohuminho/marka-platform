"use client";

import { useState, type FormEvent } from "react";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || loading) return;

    const nextConversationId = conversationId || crypto.randomUUID();
    setConversationId(nextConversationId);
    setPrompt("");
    setError("");
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: text },
    ]);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          prompt: text,
          conversationId: nextConversationId,
        }),
      });
      const payload = await response.json().catch(() => null) as
        | { success?: boolean; content?: string; message?: string }
        | null;

      if (!response.ok || !payload?.success || typeof payload.content !== "string") {
        throw new Error(payload?.message || "Não foi possível obter uma resposta da IA.");
      }

      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: payload.content! },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "O serviço de IA está temporariamente indisponível.");
    } finally {
      setLoading(false);
    }
  }

  function startNewConversation() {
    if (loading) return;
    setMessages([]);
    setConversationId("");
    setPrompt("");
    setError("");
  }

  return (
    <DynamicBackground>
      <AppShell>
        <section className="mx-auto flex min-h-[calc(100vh-11rem)] w-full max-w-5xl flex-col">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--theme-border)] pb-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">
                MARKA / INTELLIGENCE
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--theme-text)] sm:text-4xl">
                Assistente MARKA
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted)]">
                Um ponto de assistência inteligente para compreender, planear e resolver tarefas dentro do ecossistema MARKA.
              </p>
            </div>
            <button
              type="button"
              onClick={startNewConversation}
              disabled={loading || messages.length === 0}
              className="rounded-full border border-[var(--theme-border)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Nova conversa
            </button>
          </header>

          <div className="flex-1 rounded-3xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_72%,transparent)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-[var(--theme-border)] pb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] text-sm font-semibold text-[var(--theme-text)]">M</span>
              <div>
                <p className="text-xs font-semibold text-[var(--theme-text)]">MARKA AI</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">Núcleo inteligente partilhado</p>
              </div>
              <span className="ml-auto flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[var(--theme-text-faint)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Ligação protegida
              </span>
            </div>

            <div className="min-h-[320px] space-y-4" role="log" aria-live="polite" aria-relevant="additions">
              {messages.length === 0 && (
                <div className="mx-auto flex min-h-[300px] max-w-xl flex-col items-center justify-center text-center">
                  <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-xl text-[var(--theme-text)]">✦</span>
                  <h2 className="text-xl font-semibold text-[var(--theme-text)]">Em que posso ajudar?</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">
                    Faz uma pergunta, pede uma explicação ou solicita ajuda para organizar uma tarefa.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {["Como posso começar a vender na MARKA?", "Ajuda-me a planear o meu negócio", "Explica-me como funciona a Mobility"].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setPrompt(suggestion)}
                        className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-[10px] text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface)] hover:text-[var(--theme-text)]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3.5 sm:max-w-[78%] ${message.role === "user" ? "bg-[var(--theme-text)] text-[var(--theme-background)]" : "border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"}`}>
                    <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                  </div>
                </article>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-xs text-[var(--theme-text-muted)]">
                    A preparar resposta…
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs text-red-500">
                {error}
              </p>
            )}

            <form onSubmit={sendMessage} className="mt-7 border-t border-[var(--theme-border)] pt-5">
              <label htmlFor="marka-ai-prompt" className="sr-only">A tua mensagem</label>
              <div className="flex items-end gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-2">
                <textarea
                  id="marka-ai-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  maxLength={12000}
                  rows={2}
                  placeholder="Escreve a tua pergunta…"
                  className="max-h-40 min-h-12 flex-1 resize-y bg-transparent px-3 py-2 text-sm leading-6 text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-text-faint)]"
                />
                <button
                  type="submit"
                  disabled={!prompt.trim() || loading}
                  className="mb-0.5 inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-text)] px-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-background)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Enviar
                </button>
              </div>
              <p className="mt-3 text-[9px] leading-5 text-[var(--theme-text-faint)]">
                Não partilhes palavras-passe ou dados bancários. A IA pode cometer erros; confirma decisões operacionais importantes.
              </p>
            </form>
          </div>
        </section>
      </AppShell>
    </DynamicBackground>
  );
}
