"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type SupportMessage = {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
  author?: { id: string; name: string };
};
type SupportTicket = {
  id: string;
  reference: string;
  subject: string;
  category: string;
  description: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "WAITING_FOR_USER" | "RESOLVED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  requester?: { id: string; name: string; email: string };
  messages: SupportMessage[];
};
const statusLabels: Record<SupportTicket["status"], string> = {
  OPEN: "Aberto", IN_PROGRESS: "Em acompanhamento", WAITING_FOR_USER: "A aguardar resposta",
  RESOLVED: "Resolvido", CLOSED: "Encerrado",
};
const priorityLabels: Record<SupportTicket["priority"], string> = {
  LOW: "Baixa", NORMAL: "Normal", HIGH: "Alta", URGENT: "Urgente",
};
const panel = "rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)]";

export default function MobilitySupportCenter() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeId, setActiveId] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Viagens e pedidos");
  const [priority, setPriority] = useState<SupportTicket["priority"]>("NORMAL");
  const [description, setDescription] = useState("");
  const [reply, setReply] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/support/tickets", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível carregar o suporte.");
      setTickets(data.tickets || []);
      setIsStaff(Boolean(data.isStaff));
      setActiveId((current) => current || data.tickets?.[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar o suporte.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  async function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, priority, description }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível abrir o pedido.");
      setSubject(""); setDescription(""); setPriority("NORMAL");
      setSuccess(`Pedido ${data.ticket.reference} registado. Guarda a referência para acompanhamento.`);
      setActiveId(data.ticket.id);
      await loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar o pedido.");
    } finally { setSending(false); }
  }

  async function changeStatus(status: SupportTicket["status"]) {
    if (!activeId) return;
    setSending(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/support/tickets", {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: activeId, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível actualizar o estado.");
      setSuccess(`Pedido actualizado: ${statusLabels[data.ticket.status as SupportTicket["status"]] || data.ticket.status}.`);
      await loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao actualizar o estado.");
    } finally { setSending(false); }
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeId || !reply.trim()) return;
    setSending(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/support/tickets/${activeId}/messages`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível enviar a resposta.");
      setReply(""); setSuccess("Mensagem adicionada ao histórico do pedido.");
      await loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar a resposta.");
    } finally { setSending(false); }
  }

  const active = tickets.find((ticket) => ticket.id === activeId);

  return (
    <section id="suporte" className="space-y-5">
      <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#d8c18c]/30 bg-[#090b0e] p-6 text-white shadow-[0_22px_70px_-40px_rgba(216,193,140,.5)] sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_90%_0%,rgba(216,193,140,.22),transparent_42%),linear-gradient(115deg,rgba(8,10,13,.98),rgba(8,10,13,.85))]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-[#d8c18c]">MARKA · Centro de assistência</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">O teu suporte, dentro da plataforma.</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">Abre um pedido autenticado, recebe uma referência, acompanha o estado e mantém todas as respostas no histórico da tua conta. Não precisas de sair da MARKA nem de procurar outro contacto.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[.04] px-4 py-3">
            <p className="text-[9px] uppercase tracking-[.18em] text-white/45">Pedidos registados</p>
            <p className="mt-1 text-2xl font-semibold text-[#e8cd91]">{tickets.length}</p>
          </div>
        </div>
      </div>

      {(error || success) && <div role={error ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${error ? "border-red-500/30 bg-red-500/5 text-red-600" : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"}`}>{error || success}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(300px,.85fr)_minmax(0,1.15fr)]">
        <form onSubmit={submitTicket} className={`${panel} space-y-4 p-5 sm:p-6`}>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[.2em] text-[#b89a5b]">Novo pedido</p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--theme-text)]">Como podemos ajudar?</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--theme-text-muted)]">Descreve o problema sem incluir palavras-passe ou dados completos de documentos.</p>
          </div>
          <label className="block text-xs font-medium text-[var(--theme-text)]">Assunto
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={4} maxLength={120} placeholder="Ex.: Não consigo concluir a candidatura" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm outline-none focus:border-[#b89a5b]" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-[var(--theme-text)]">Categoria
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm">
                <option>Viagens e pedidos</option><option>Conta e autenticação</option><option>Motorista e candidatura</option><option>Pagamentos e carteira</option><option>Segurança e reclamação</option><option>Aplicação e erros técnicos</option><option>Outro assunto</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-[var(--theme-text)]">Prioridade
              <select value={priority} onChange={(e) => setPriority(e.target.value as SupportTicket["priority"])} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm">
                <option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-medium text-[var(--theme-text)]">O que aconteceu?
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} maxLength={5000} rows={5} placeholder="Explica os passos que fizeste e o que apareceu no ecrã…" className="mt-2 w-full resize-y rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-sm outline-none focus:border-[#b89a5b]" />
          </label>
          <button disabled={sending} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#f3dfaa] to-[#c5a66a] px-5 py-3 text-sm font-bold text-[#171814] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60">{sending ? "A processar…" : "Registar pedido de suporte"}</button>
          <p className="text-[10px] leading-4 text-[var(--theme-text-faint)]">A autenticação é feita pela sessão da MARKA. O pedido fica associado à tua conta e guardado na base de dados.</p>
        </form>

        <div className={`${panel} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-[var(--theme-border)] p-5 sm:p-6">
            <div><p className="text-[9px] font-semibold uppercase tracking-[.2em] text-[#b89a5b]">{isStaff ? "Fila operacional" : "A tua conta"}</p><h3 className="mt-1 text-lg font-semibold text-[var(--theme-text)]">{isStaff ? "Pedidos de todos os utilizadores" : "Histórico de suporte"}</h3></div>
            <button type="button" onClick={() => void loadTickets()} className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-xs font-medium text-[var(--theme-text)] hover:border-[#b89a5b]">Actualizar</button>
          </div>
          {loading ? <p className="p-6 text-sm text-[var(--theme-text-muted)]">A carregar pedidos guardados…</p> : tickets.length === 0 ? <div className="p-8 text-center"><p className="text-sm font-medium text-[var(--theme-text)]">Ainda não tens pedidos de suporte.</p><p className="mt-2 text-xs text-[var(--theme-text-muted)]">Quando registares um pedido, a referência e o acompanhamento aparecem aqui.</p></div> : (
            <div className="grid min-h-[420px] md:grid-cols-[minmax(160px,.72fr)_minmax(0,1.28fr)]">
              <div className="border-b border-[var(--theme-border)] md:border-b-0 md:border-r">
                {tickets.map((ticket) => <button type="button" key={ticket.id} onClick={() => setActiveId(ticket.id)} className={`block w-full border-b border-[var(--theme-border)] p-4 text-left transition ${ticket.id === activeId ? "bg-[#b89a5b]/10" : "hover:bg-[var(--theme-background)]"}`}>
                  <span className="text-[9px] font-bold tracking-[.12em] text-[#b89a5b]">{ticket.reference}</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--theme-text)]">{ticket.subject}</span>
                  <span className="mt-2 inline-flex rounded-full border border-[var(--theme-border)] px-2 py-1 text-[9px] text-[var(--theme-text-muted)]">{statusLabels[ticket.status]}</span>
                  {isStaff && ticket.requester && <span className="mt-2 block truncate text-[10px] text-[var(--theme-text-faint)]">{ticket.requester.name} · {ticket.requester.email}</span>}
                </button>)}
              </div>
              <div className="flex min-w-0 flex-col">
                {active ? <>
                  <div className="border-b border-[var(--theme-border)] p-4 sm:p-5">
                    <p className="text-[9px] font-bold tracking-[.14em] text-[#b89a5b]">{active.reference} · {active.category}</p>
                    <h4 className="mt-2 text-base font-semibold text-[var(--theme-text)]">{active.subject}</h4>
                    <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[var(--theme-background)] px-3 py-1 text-[10px] text-[var(--theme-text-muted)]">{statusLabels[active.status]}</span><span className="rounded-full bg-[var(--theme-background)] px-3 py-1 text-[10px] text-[var(--theme-text-muted)]">Prioridade {priorityLabels[active.priority]}</span></div>
                    {isStaff && <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" disabled={sending} onClick={() => void changeStatus("WAITING_FOR_USER")} className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-[10px] text-[var(--theme-text)] disabled:opacity-50">Aguardar utilizador</button>
                      <button type="button" disabled={sending} onClick={() => void changeStatus("RESOLVED")} className="rounded-full border border-emerald-500/30 px-3 py-2 text-[10px] text-[var(--theme-text)] disabled:opacity-50">Marcar resolvido</button>
                      <button type="button" disabled={sending} onClick={() => void changeStatus("CLOSED")} className="rounded-full border border-red-500/30 px-3 py-2 text-[10px] text-[var(--theme-text)] disabled:opacity-50">Encerrar pedido</button>
                    </div>}
                  </div>
                  <div className="flex-1 space-y-3 p-4 sm:p-5">
                    {(active.messages || []).map((message) => <div key={message.id} className={`max-w-[95%] rounded-2xl p-3 ${message.isStaff ? "border border-[#b89a5b]/30 bg-[#b89a5b]/10" : "bg-[var(--theme-background)]"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-semibold text-[var(--theme-text)]">{message.isStaff ? "Equipa MARKA" : (message.author?.name || (isStaff ? active.requester?.name : "Tu"))}</p><time className="text-[9px] text-[var(--theme-text-faint)]">{new Date(message.createdAt).toLocaleString("pt-AO")}</time></div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[var(--theme-text-muted)]">{message.body}</p>
                    </div>)}
                  </div>
                  {active.status !== "CLOSED" && <form onSubmit={submitReply} className="border-t border-[var(--theme-border)] p-4">
                    <label className="sr-only" htmlFor="support-reply">Responder ao pedido</label>
                    <textarea id="support-reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={2} maxLength={5000} placeholder={isStaff ? "Escreve a resposta da equipa MARKA…" : "Adicionar informação ou responder…"} className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-xs text-[var(--theme-text)] outline-none focus:border-[#b89a5b]" />
                    <button disabled={sending || !reply.trim()} className="mt-2 rounded-full bg-[#d8c18c] px-4 py-2 text-xs font-bold text-[#171814] disabled:opacity-50">{sending ? "A enviar…" : "Enviar resposta"}</button>
                  </form>}
                </> : <p className="p-6 text-sm text-[var(--theme-text-muted)]">Selecciona um pedido para ver a conversa.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
