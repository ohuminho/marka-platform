"use client";

import { useMemo, useState } from "react";

type Availability = {
  space?: { timezone?: string | null; capacity?: string | number | null };
  rules?: Array<{ weekday: number; startTime: string; endTime: string; timezone: string; activeFrom?: string | null; activeUntil?: string | null }>;
  exceptions?: Array<{ type: "OPEN" | "CLOSED"; startAt: string; endAt: string }>;
  occupied?: Array<{ startAt: string; endAt: string }>;
};

const timezone = "Africa/Luanda";
const field = "w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-text-muted)]";

function localDateTime(value: string) {
  return new Date(value + (value.length === 16 ? ":00+01:00" : ""));
}
function offsetIso(value: string) {
  return value.length === 16 ? value + ":00+01:00" : value + "+01:00";
}
function dayBounds(date: string) {
  return { from: date + "T00:00:00+01:00", to: date + "T23:59:59+01:00" };
}

export default function SpaceBookingPanel({ productId }: { productId: string }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [participants, setParticipants] = useState("2");
  const [note, setNote] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const interval = useMemo(() => {
    if (!date || !start || !end) return null;
    const from = localDateTime(date + "T" + start);
    const to = localDateTime(date + "T" + end);
    return Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from ? null : { from, to };
  }, [date, start, end]);

  const slotState = useMemo(() => {
    if (!availability || !interval) return "unknown";
    const { from, to } = interval;
    const weekday = from.getDay();
    const day = date;
    const openException = availability.exceptions?.some((item) => item.type === "OPEN" && new Date(item.startAt) <= from && new Date(item.endAt) >= to);
    const closed = availability.exceptions?.some((item) => item.type === "CLOSED" && new Date(item.startAt) < to && new Date(item.endAt) > from);
    const occupied = availability.occupied?.some((item) => new Date(item.startAt) < to && new Date(item.endAt) > from);
    const matching = availability.rules?.some((rule) => {
      const active = (!rule.activeFrom || day >= rule.activeFrom.slice(0, 10)) && (!rule.activeUntil || day <= rule.activeUntil.slice(0, 10));
      return active && rule.weekday === weekday && rule.startTime <= start && rule.endTime >= end && rule.timezone === timezone;
    });
    return closed || occupied ? "busy" : openException || matching ? "available" : "closed";
  }, [availability, interval, date, start, end]);

  async function checkAvailability() {
    if (!interval) { setError("Indique um horário final posterior ao inicial."); return; }
    setChecking(true); setError(""); setMessage(""); setAvailability(null);
    try {
      const bounds = dayBounds(date);
      const query = new URLSearchParams({ productId, from: bounds.from, to: bounds.to });
      const response = await fetch("/api/marketplace/spaces/availability?" + query.toString(), { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível consultar a disponibilidade.");
      setAvailability(data);
      if (data.space?.timezone && data.space.timezone !== timezone) throw new Error("Este espaço usa um fuso horário diferente. Contacte o proprietário para confirmar os horários.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao consultar disponibilidade."); }
    finally { setChecking(false); }
  }

  async function requestBooking() {
    if (!interval || slotState !== "available") return;
    setSending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/marketplace/spaces/bookings", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId, startAt: offsetIso(date + "T" + start), endAt: offsetIso(date + "T" + end),
          participantCount: Number(participants), timezone, customerNote: note,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível enviar o pedido.");
      setMessage("Pedido " + data.booking.reference + " enviado. O proprietário terá de aceitar e apresentar o preço. Ainda não foi efetuado qualquer pagamento.");
      setAvailability(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao enviar pedido."); }
    finally { setSending(false); }
  }

  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">Reserva de espaço</p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--theme-text)]">Escolha o seu horário</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">Consulte a disponibilidade real e envie um pedido ao proprietário. O preço final será apresentado antes de qualquer pagamento.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-[var(--theme-text-muted)]">Data<input className={field+" mt-2"} type="date" min={today} value={date} onChange={(e)=>{setDate(e.target.value);setAvailability(null);}} /></label>
        <label className="text-xs text-[var(--theme-text-muted)]">Participantes<input className={field+" mt-2"} type="number" min="1" max="1000" value={participants} onChange={(e)=>setParticipants(e.target.value)} /></label>
        <label className="text-xs text-[var(--theme-text-muted)]">Início<input className={field+" mt-2"} type="time" value={start} onChange={(e)=>{setStart(e.target.value);setAvailability(null);}} /></label>
        <label className="text-xs text-[var(--theme-text-muted)]">Fim<input className={field+" mt-2"} type="time" value={end} onChange={(e)=>{setEnd(e.target.value);setAvailability(null);}} /></label>
      </div>
      <label className="mt-3 block text-xs text-[var(--theme-text-muted)]">Informações adicionais<textarea className={field+" mt-2"} rows={3} maxLength={1500} value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Objetivo da reunião, disposição da sala, equipamentos ou necessidades…" /></label>
      <button type="button" disabled={checking || !interval || date < today} onClick={()=>void checkAvailability()} className="mt-4 w-full rounded-full border border-[var(--theme-border)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--theme-text)] disabled:opacity-50">{checking ? "A consultar…" : "Verificar disponibilidade"}</button>
      {availability && <div className="mt-4 rounded-xl border border-[var(--theme-border)] p-4" aria-live="polite">
        <p className={"text-sm font-semibold "+(slotState==="available"?"text-emerald-600":slotState==="busy"?"text-red-500":"text-[var(--theme-text)]")}>{slotState==="available"?"Horário disponível":slotState==="busy"?"Horário ocupado":"Fora do horário disponibilizado"}</p>
        <p className="mt-1 text-xs text-[var(--theme-text-muted)]">Fuso horário: Africa/Luanda. A disponibilidade será novamente validada no servidor ao enviar o pedido.</p>
        {slotState==="available" && <button type="button" onClick={()=>void requestBooking()} disabled={sending} className="mt-4 w-full rounded-full bg-[var(--theme-text)] px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[var(--theme-background)] disabled:opacity-50">{sending?"A enviar pedido…":"Solicitar reserva"}</button>}
      </div>}
      {error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm leading-6 text-[var(--theme-text)]">{message}</p>}
    </section>
  );
}
