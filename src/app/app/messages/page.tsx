"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/frontend/shell/AppShell";
import MarketplaceCallPanel from "@/frontend/features/communications/components/MarketplaceCallPanel";

type Message = { id: string; body: string; senderId: string; createdAt: string; readAt?: string | null; sender?: { id: string; name: string } };
type Conversation = {
  id: string; buyerId: string; sellerId: string; lastMessageAt: string;
  buyer: { id: string; name: string }; seller: { id: string; name: string };
  store: { id: string; name: string }; product: { id: string; name: string; image?: string | null };
  messages: Message[];
};

function stamp(value: string) {
  return new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function MessagesWorkspace() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [actorId, setActorId] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const active = useMemo(() => conversations.find((item) => item.id === activeId), [conversations, activeId]);

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/messages", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível carregar as mensagens.");
      setConversations(data.conversations ?? []);
      setActorId(data.actorId ?? "");
      const requestedId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("conversationId") : null;
      setActiveId((current) => current || requestedId || data.conversations?.[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar mensagens.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    if (!id) { setMessages([]); return; }
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível abrir a conversa.");
      setMessages(data.conversation.messages ?? []);
      setActorId(data.actorId ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao abrir conversa.");
    }
  }, []);

  useEffect(() => { const initial = window.setTimeout(() => void loadConversations(), 0); const timer = window.setInterval(() => void loadConversations(), 12000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, [loadConversations]);
  useEffect(() => { if (!activeId) return; const initial = window.setTimeout(() => void loadThread(activeId), 0); const timer = window.setInterval(() => void loadThread(activeId), 5000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, [activeId, loadThread]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!activeId || draft.trim().length < 2 || sending) return;
    setSending(true); setError("");
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(activeId)}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível enviar.");
      setMessages((current) => [...current, data.message]);
      setDraft("");
      await loadConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar mensagem.");
    } finally { setSending(false); }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--theme-border)] pb-6">
          <div><p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[var(--theme-text-faint)]">MARKA / COMUNICAÇÃO</p><h1 className="marka-editorial mt-2 text-4xl text-[var(--theme-text)] sm:text-5xl">Mensagens</h1><p className="mt-2 max-w-xl text-sm text-[var(--theme-text-muted)]">Converse diretamente com compradores e vendedores. Negocie detalhes, esclareça dúvidas e acompanhe pedidos.</p></div>
          <span className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">{conversations.length} conversas</span>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
        <div className="grid min-h-[650px] overflow-hidden rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="border-b border-[var(--theme-border)] lg:border-b-0 lg:border-r">
            <div className="border-b border-[var(--theme-border)] px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">Caixa de entrada</p></div>
            <div className="max-h-[280px] overflow-y-auto lg:max-h-[590px]">
              {loading ? <p className="p-5 text-sm text-[var(--theme-text-muted)]">A carregar conversas…</p> :
                conversations.length === 0 ? <div className="p-6"><p className="text-sm text-[var(--theme-text)]">Ainda não tens conversas.</p><p className="mt-2 text-xs leading-5 text-[var(--theme-text-muted)]">Abre um produto no Marketplace e selecciona “Enviar mensagem ao vendedor” para iniciar.</p></div> :
                conversations.map((item) => {
                  const other = item.buyerId === actorId ? item.seller : item.buyer;
                  const last = item.messages[0];
                  return <button key={item.id} type="button" onClick={() => { setActiveId(item.id); setError(""); }} className={`w-full border-b border-[var(--theme-border)] p-4 text-left transition hover:bg-[var(--theme-background)] ${activeId === item.id ? "bg-[var(--theme-background)]" : ""}`}>
                    <div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-semibold text-[var(--theme-text)]">{other.name}</p><span className="shrink-0 text-[9px] text-[var(--theme-text-faint)]">{last ? stamp(last.createdAt) : stamp(item.lastMessageAt)}</span></div>
                    <p className="mt-1 truncate text-xs text-[var(--theme-text-muted)]">{item.product.name} · {item.store.name}</p>
                    <p className="mt-2 truncate text-xs text-[var(--theme-text-faint)]">{last?.body ?? "Inicia a conversa"}</p>
                  </button>;
                })}
            </div>
          </aside>

          <div className="flex min-h-[520px] flex-col">
            {active ? <>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--theme-border)] px-5 py-4">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--theme-text)]">{active.buyerId === actorId ? active.seller.name : active.buyer.name}</p><p className="mt-1 truncate text-xs text-[var(--theme-text-muted)]">{active.product.name} · {active.store.name}</p></div>
                <div className="flex flex-wrap items-center gap-2"><MarketplaceCallPanel conversationId={active.id} /><a href={`/app/marketplace/products/${active.product.id}`} className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-[var(--theme-text-muted)] underline underline-offset-4">Ver produto</a></div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
                {messages.map((message) => <div key={message.id} className={`flex ${message.senderId === actorId ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[72%] ${message.senderId === actorId ? "rounded-br-md bg-[var(--theme-text)] text-[var(--theme-background)]" : "rounded-bl-md border border-[var(--theme-border)] bg-[var(--theme-background)] text-[var(--theme-text)]"}`}>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p><p className={`mt-2 text-right text-[9px] ${message.senderId === actorId ? "opacity-60" : "text-[var(--theme-text-faint)]"}`}>{stamp(message.createdAt)}</p>
                  </div>
                </div>)}
                {messages.length === 0 && <p className="text-center text-xs text-[var(--theme-text-faint)]">Envia a primeira mensagem desta conversa.</p>}
              </div>
              <form onSubmit={sendMessage} className="border-t border-[var(--theme-border)] p-4">
                <div className="flex items-end gap-3"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={5000} placeholder="Escreve uma mensagem…" className="min-h-12 flex-1 resize-y rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)]" /><button type="submit" disabled={sending || draft.trim().length < 2} className="rounded-xl bg-[var(--theme-text)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-background)] disabled:opacity-45">{sending ? "A enviar…" : "Enviar"}</button></div>
                <p className="mt-3 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-accent)]/5 px-3 py-2 text-[10px] leading-5 text-[var(--theme-text-muted)]">Proteção MARKA: contactos externos, links de redes sociais, pagamentos fora da plataforma e credenciais são bloqueados. Nunca partilhes palavras-passe, PIN, OTP, códigos de recuperação ou dados bancários. Conclui sempre a compra no checkout MARKA.</p>
              </form>
            </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--theme-border)] text-xl text-[var(--theme-text-muted)]">✉</div><h2 className="marka-editorial mt-5 text-2xl text-[var(--theme-text)]">A tua caixa de entrada</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--theme-text-muted)]">Selecciona uma conversa ou contacta um vendedor a partir de qualquer produto do Marketplace.</p></div>}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

export default function MessagesPage() {
  return <MessagesWorkspace />;
}
