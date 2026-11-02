"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/frontend/shell/AppShell";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";

type Booking = {
  id: string; reference: string; status: string; startAt: string; endAt: string;
  timezone: string; participantCount: number; totalAmount: string; currency: string;
  product: { id: string; name: string }; customer?: { name: string };
  customerNote?: string | null; ownerNote?: string | null; createdAt: string;
};
const statusLabels: Record<string,string> = {
  REQUESTED:"A aguardar decisão", ACCEPTED:"Proposta enviada", DECLINED:"Recusada",
  PAYMENT_PENDING:"Pagamento pendente", CONFIRMED:"Confirmada", CANCELLED:"Cancelada",
  EXPIRED:"Expirada", COMPLETED:"Concluída",
};
const statusStyle: Record<string,string> = {
  REQUESTED:"border-amber-500/30 bg-amber-500/10 text-amber-700",
  ACCEPTED:"border-sky-500/30 bg-sky-500/10 text-sky-700",
  CONFIRMED:"border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  DECLINED:"border-red-500/30 bg-red-500/10 text-red-600",
};
const inputClass="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3.5 py-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-text-muted)]";

function formatDate(value:string, timezone:string) {
  return new Intl.DateTimeFormat("pt-PT",{timeZone:timezone,weekday:"short",day:"2-digit",month:"short",year:"numeric"}).format(new Date(value));
}
function formatTime(value:string, timezone:string) {
  return new Intl.DateTimeFormat("pt-PT",{timeZone:timezone,hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}
function money(value:string,currency:string) {
  return new Intl.NumberFormat("pt-PT",{style:"currency",currency:currency||"AOA",maximumFractionDigits:2}).format(Number(value));
}


type SpaceOption={id:string;name:string;attributes?:Record<string,unknown>|null};
const weekdays=["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
function WeeklySchedule(){
 const [spaces,setSpaces]=useState<SpaceOption[]>([]);
 const [selected,setSelected]=useState("");
 const [days,setDays]=useState(Array.from({length:7},(_,weekday)=>({weekday,enabled:weekday>0&&weekday<6,startTime:"09:00",endTime:"18:00"})));
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 useEffect(()=>{let active=true;fetch("/api/vendor/products",{credentials:"include",cache:"no-store"}).then(r=>r.json()).then(data=>{if(!active)return;const eligible=(Array.isArray(data.products)?data.products:[]).filter((p:SpaceOption)=>p.attributes?.spaceBookingEnabled===true||p.attributes?.spaceBookingEnabled==="true");setSpaces(eligible);if(eligible[0])setSelected(eligible[0].id);}).catch(()=>{if(active)setError("Não foi possível carregar os espaços.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 useEffect(()=>{if(!selected)return;let active=true;fetch("/api/vendor/spaces/availability?productId="+encodeURIComponent(selected),{credentials:"include",cache:"no-store"}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.message||"Não foi possível carregar os horários.");if(!active)return;const existing=Array.isArray(data.rules)?data.rules:[];if(existing.length){setDays(current=>current.map(day=>{const rule=existing.find((item:{weekday:number})=>item.weekday===day.weekday);return rule?{...day,enabled:true,startTime:rule.startTime,endTime:rule.endTime}: {...day,enabled:false};}));}}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Falha ao carregar horários.");});return()=>{active=false;};},[selected]);
 async function save(){const rules=days.filter(d=>d.enabled).map(({weekday,startTime,endTime})=>({weekday,startTime,endTime,timezone:"Africa/Luanda"}));if(!rules.length){setError("Ative pelo menos um dia de funcionamento.");return;}if(rules.some(r=>r.endTime<=r.startTime)){setError("A hora final deve ser posterior à inicial em todos os dias.");return;}setSaving(true);setError("");setMessage("");try{const response=await fetch("/api/vendor/spaces/availability",{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:selected,rules})});const data=await response.json();if(!response.ok)throw new Error(data.message||"Não foi possível guardar os horários.");setMessage("Horários guardados. A disponibilidade pública já utiliza estas regras.");}catch(e){setError(e instanceof Error?e.message:"Falha ao guardar horários.");}finally{setSaving(false);}}
 return <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="marka-kicker">CONFIGURAÇÃO DO ESPAÇO</p><h2 className="mt-2 text-xl font-semibold text-[var(--theme-text)]">Horários de funcionamento</h2><p className="mt-1 text-sm text-[var(--theme-text-muted)]">Defina quando cada espaço pode receber pedidos.</p></div></div>
 {loading?<p className="mt-5 text-sm text-[var(--theme-text-muted)]">A carregar os seus espaços…</p>:spaces.length===0?<p className="mt-5 rounded-xl bg-[var(--theme-background)] p-4 text-sm leading-6 text-[var(--theme-text-muted)]">Ainda não tem anúncios com reservas online ativadas. Ative esta opção num anúncio de sala ou espaço para configurar a agenda.</p>:<>
 <label className="mt-5 block text-xs text-[var(--theme-text-muted)]">Espaço<select className={inputClass+" mt-2"} value={selected} onChange={e=>setSelected(e.target.value)}>{spaces.map(space=><option key={space.id} value={space.id}>{space.name}</option>)}</select></label>
 <div className="mt-4 divide-y divide-[var(--theme-border)] rounded-xl border border-[var(--theme-border)]">{days.map(day=><div key={day.weekday} className="grid grid-cols-[minmax(0,1fr)_1fr_1fr] items-center gap-2 p-3 sm:grid-cols-[minmax(0,1.2fr)_1fr_1fr] sm:gap-4"><label className="flex items-center gap-2 text-xs font-medium text-[var(--theme-text)]"><input type="checkbox" className="h-4 w-4 accent-current" checked={day.enabled} onChange={e=>setDays(current=>current.map(d=>d.weekday===day.weekday?{...d,enabled:e.target.checked}:d))}/><span>{weekdays[day.weekday]}</span></label><input aria-label={"Abertura "+weekdays[day.weekday]} className={inputClass+" px-2 py-2 text-xs"} type="time" disabled={!day.enabled} value={day.startTime} onChange={e=>setDays(current=>current.map(d=>d.weekday===day.weekday?{...d,startTime:e.target.value}:d))}/><input aria-label={"Fecho "+weekdays[day.weekday]} className={inputClass+" px-2 py-2 text-xs"} type="time" disabled={!day.enabled} value={day.endTime} onChange={e=>setDays(current=>current.map(d=>d.weekday===day.weekday?{...d,endTime:e.target.value}:d))}/></div>)}</div>
 <p className="mt-3 text-xs leading-5 text-[var(--theme-text-muted)]">Fuso horário aplicado: Africa/Luanda. As alterações substituem as regras ativas anteriores, que permanecem preservadas no histórico.</p>
 <button onClick={()=>void save()} disabled={saving||!selected} className="mt-4 w-full rounded-full bg-[var(--theme-text)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--theme-background)] disabled:opacity-50">{saving?"A guardar…":"Guardar horários"}</button>
 </>}
 {error&&<p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}{message&&<p role="status" className="mt-3 text-sm text-emerald-600">{message}</p>}
 </section>;
}

function ReservationsWorkspace() {
  const [bookings,setBookings]=useState<Booking[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [filter,setFilter]=useState("ALL");
  const [quotes,setQuotes]=useState<Record<string,string>>({});
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState<string|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/marketplace/spaces/bookings",{credentials:"include",cache:"no-store"});
      const data=await response.json();
      if(!response.ok) throw new Error(data.message||"Não foi possível carregar os pedidos.");
      const owned=(Array.isArray(data.bookings)?data.bookings:[]).filter((item:Booking)=>Boolean(item.customer));
      setBookings(owned);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao carregar pedidos.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);

  const counts=useMemo(()=>({
    all:bookings.length,
    pending:bookings.filter(b=>b.status==="REQUESTED").length,
    accepted:bookings.filter(b=>["ACCEPTED","PAYMENT_PENDING"].includes(b.status)).length,
    confirmed:bookings.filter(b=>b.status==="CONFIRMED").length,
  }),[bookings]);
  const visible=bookings.filter(b=>filter==="ALL"||b.status===filter);

  async function decide(booking:Booking,decision:"accept"|"decline"){
    const quote=quotes[booking.id]?.trim()||"";
    const note=notes[booking.id]?.trim()||"";
    if(decision==="accept"&&(!quote||!/^\d{1,15}(\.\d{1,4})?$/.test(quote)||Number(quote)<=0)){setError("Indique uma proposta de preço válida, superior a zero.");return;}
    if(decision==="decline"&&note.length<2){setError("Indique brevemente o motivo da recusa.");return;}
    setBusy(booking.id);setError("");setNotice("");
    try{
      const response=await fetch("/api/marketplace/spaces/bookings/"+booking.id+"/decision",{
        method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({decision,...(decision==="accept"?{quoteAmount:quote,ownerNote:note}:{ownerNote:note}),idempotencyKey:crypto.randomUUID()}),
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.message||"Não foi possível atualizar o pedido.");
      setNotice(decision==="accept"?"Proposta enviada ao cliente. A reserva ainda não está confirmada e não foi cobrado qualquer valor.":"Pedido recusado. O cliente poderá consultar a decisão.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao processar a decisão.");}
    finally{setBusy(null);}
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="marka-kicker">MARKA / BUSINESS / RESERVAS</p><h1 className="marka-editorial mt-3 text-4xl text-[var(--theme-text)] lg:text-5xl">Reservas de espaços</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted)]">Uma visão clara dos pedidos, propostas e reservas dos seus espaços.</p></div>
        <Link href="/app/vendor/products" className="inline-flex w-fit rounded-full border border-[var(--theme-border)] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-text)]">Gerir anúncios</Link>
      </header>
      <WeeklySchedule />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Todos os pedidos",counts.all],["A aguardar",counts.pending],["Com proposta",counts.accepted],["Confirmadas",counts.confirmed]].map(([label,value])=><div key={label} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-text-muted)]">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--theme-text)]">{value}</p></div>)}
      </section>
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar reservas">
        {[["ALL","Todas"],["REQUESTED","A aguardar"],["ACCEPTED","Propostas"],["CONFIRMED","Confirmadas"],["DECLINED","Recusadas"]].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} className={"shrink-0 rounded-full border px-4 py-2.5 text-xs font-medium transition "+(filter===value?"border-[var(--theme-text)] bg-[var(--theme-text)] text-[var(--theme-background)]":"border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-muted)]")}>{label}</button>)}
      </nav>
      {error&&<div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">{error}</div>}
      {notice&&<div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-[var(--theme-text)]">{notice}</div>}
      {loading?<div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 text-sm text-[var(--theme-text-muted)]">A atualizar as reservas…</div>:
       visible.length===0?<div className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-14 text-center"><p className="text-lg font-semibold text-[var(--theme-text)]">Tudo tranquilo por aqui.</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--theme-text-muted)]">{filter==="ALL"?"Quando alguém solicitar um dos seus espaços, o pedido aparecerá aqui.":"Não existem reservas neste estado."}</p></div>:
       <div className="space-y-4">{visible.map(booking=><article key={booking.id} className="overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_12px_40px_rgba(0,0,0,0.035)]">
         <div className="flex flex-col gap-4 border-b border-[var(--theme-border)] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
           <div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">{booking.reference}</span><span className={"rounded-full border px-3 py-1 text-[10px] font-semibold "+(statusStyle[booking.status]||"border-[var(--theme-border)] text-[var(--theme-text-muted)]")}>{statusLabels[booking.status]||booking.status}</span></div><h2 className="mt-3 text-xl font-semibold text-[var(--theme-text)]">{booking.product.name}</h2><p className="mt-1 text-sm text-[var(--theme-text-muted)]">Pedido de {booking.customer?.name||"Cliente"}</p></div>
           <div className="text-left sm:text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-text-muted)]">Valor proposto</p><p className="mt-1 text-lg font-semibold text-[var(--theme-text)]">{Number(booking.totalAmount)>0?money(booking.totalAmount,booking.currency):"A definir"}</p></div>
         </div>
         <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
           <div><p className="text-[10px] uppercase tracking-[0.13em] text-[var(--theme-text-muted)]">Data</p><p className="mt-1 text-sm font-medium text-[var(--theme-text)]">{formatDate(booking.startAt,booking.timezone)}</p></div>
           <div><p className="text-[10px] uppercase tracking-[0.13em] text-[var(--theme-text-muted)]">Horário</p><p className="mt-1 text-sm font-medium text-[var(--theme-text)]">{formatTime(booking.startAt,booking.timezone)} – {formatTime(booking.endAt,booking.timezone)}</p></div>
           <div><p className="text-[10px] uppercase tracking-[0.13em] text-[var(--theme-text-muted)]">Participantes</p><p className="mt-1 text-sm font-medium text-[var(--theme-text)]">{booking.participantCount}</p></div>
         </div>
         {booking.customerNote&&<div className="mx-5 mb-5 rounded-xl bg-[var(--theme-background)] p-4 sm:mx-6"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--theme-text-muted)]">Nota do cliente</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--theme-text)]">{booking.customerNote}</p></div>}
         {booking.status==="REQUESTED"&&<div className="border-t border-[var(--theme-border)] bg-[var(--theme-background)] p-5 sm:p-6">
           <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
             <label className="text-xs text-[var(--theme-text-muted)]">Proposta de preço (AOA)<input className={inputClass+" mt-2"} type="number" min="1" step="0.01" inputMode="decimal" placeholder="Ex.: 25000" value={quotes[booking.id]||""} onChange={e=>setQuotes(v=>({...v,[booking.id]:e.target.value}))}/></label>
             <label className="text-xs text-[var(--theme-text-muted)]">Nota ao cliente (opcional para aceitar)<input className={inputClass+" mt-2"} maxLength={1500} placeholder="Inclua condições ou detalhes importantes" value={notes[booking.id]||""} onChange={e=>setNotes(v=>({...v,[booking.id]:e.target.value}))}/></label>
           </div>
           <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button disabled={busy===booking.id} onClick={()=>void decide(booking,"decline")} className="rounded-full border border-[var(--theme-border)] px-5 py-3 text-xs font-semibold text-[var(--theme-text)] disabled:opacity-50">Recusar pedido</button><button disabled={busy===booking.id} onClick={()=>void decide(booking,"accept")} className="rounded-full bg-[var(--theme-text)] px-6 py-3 text-xs font-bold text-[var(--theme-background)] disabled:opacity-50">{busy===booking.id?"A processar…":"Aceitar e enviar proposta"}</button></div>
           <p className="mt-3 text-xs leading-5 text-[var(--theme-text-muted)]">Aceitar envia o preço ao cliente, mas não confirma a reserva nem processa pagamentos. A confirmação só será ativada após integração de um PSP aprovado.</p>
         </div>}
         {booking.status==="ACCEPTED"&&<div className="border-t border-[var(--theme-border)] px-5 py-4 text-xs leading-5 text-[var(--theme-text-muted)] sm:px-6">A proposta foi enviada. Aguarde a resposta do cliente e a futura confirmação do pagamento através do sistema autorizado.</div>}
       </article>)}</div>}
      <div className="flex justify-end"><button onClick={()=>void load()} disabled={loading} className="rounded-full border border-[var(--theme-border)] px-5 py-3 text-xs font-semibold text-[var(--theme-text-muted)] disabled:opacity-50">Atualizar lista</button></div>
    </div>
  );
}

export default function VendorReservationsPage() {
  return <DynamicBackground><AppShell><main className="space-y-6"><ReservationsWorkspace/></main></AppShell></DynamicBackground>;
}
