"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const advertisingFormats = [
  {
    number: "01",
    title: "Publicidade no Marketplace",
    description:
      "Destaque produtos, lojas e campanhas comerciais junto de pessoas que já estão a descobrir o que comprar.",
    label: "Comércio",
  },
  {
    number: "02",
    title: "Campanhas de marca",
    description:
      "Apresente a sua marca em espaços promocionais da MARKA, com identificação clara de conteúdo patrocinado.",
    label: "Notoriedade",
  },
  {
    number: "03",
    title: "Campanhas orientadas a objetivos",
    description:
      "Estruture campanhas para gerar visitas, pedidos de contacto ou compras, com resultados medidos quando a instrumentação estiver ativa.",
    label: "Desempenho",
  },
];

const audiences = [
  "Passageiros à procura de transporte",
  "Motoristas e profissionais de mobilidade",
  "Compradores que exploram produtos e lojas",
  "Vendedores e comerciantes",
  "Utilizadores da comunidade MARKA",
];

export default function AdvertisePage() {
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState(false);

  async function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload = {
      name: String(values.get("name") ?? ""),
      organizationName: String(values.get("organizationName") ?? ""),
      email: String(values.get("email") ?? ""),
      phone: String(values.get("phone") ?? ""),
      leadType: String(values.get("leadType") ?? "ADVERTISER"),
      message: String(values.get("message") ?? ""),
      consent: values.get("consent") === "on",
      website: String(values.get("website") ?? ""),
    };

    setSubmitting(true);
    setFormMessage("");
    setFormError(false);
    try {
      const response = await fetch("/api/commercial/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Não foi possível enviar o pedido. Tente novamente.");
      }
      form.reset();
      setFormMessage("Pedido recebido. A equipa comercial irá analisar o contacto.");
    } catch (error) {
      setFormError(true);
      setFormMessage(error instanceof Error ? error.message : "Não foi possível enviar o pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--theme-background)] px-5 py-10 text-[var(--theme-text)] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-16 flex items-center justify-between gap-4">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.3em]">
            MARKA
          </Link>
          <Link
            href="/app/marketplace"
            className="rounded-full border border-[var(--theme-border)] px-5 py-2.5 text-xs font-semibold transition hover:border-[var(--theme-text)]"
          >
            Explorar Marketplace
          </Link>
        </nav>

        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--theme-border)] px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[var(--theme-accent)] opacity-15 blur-3xl"
          />
          <div className="relative max-w-4xl">
            <p className="mb-6 text-[10px] uppercase tracking-[0.32em] text-[var(--theme-text-muted)]">
              MARKA · Soluções para marcas
            </p>
            <h1 className="marka-editorial text-5xl leading-[0.98] sm:text-6xl lg:text-8xl">
              A sua marca.<br />
              Mais perto do mercado.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--theme-text-muted)] sm:text-lg">
              A MARKA está a construir um espaço comercial que aproxima marcas,
              comerciantes, passageiros, motoristas e compradores. Descubra
              formatos de publicidade pensados para transformar atenção em
              resultados mensuráveis.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#contact-form"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--theme-text)] px-6 py-3 text-sm font-semibold text-[var(--theme-background)] transition hover:opacity-85"
              >
                Solicitar proposta comercial
              </a>
              <Link
                href="/app/marketplace"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--theme-border)] px-6 py-3 text-sm font-semibold transition hover:border-[var(--theme-text)]"
              >
                Ver o Marketplace
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-5 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {advertisingFormats.map((format) => (
            <article
              key={format.number}
              className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-7"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--theme-text-faint)]">{format.number}</span>
                <span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
                  {format.label}
                </span>
              </div>
              <h2 className="marka-editorial mt-8 text-3xl">{format.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--theme-text-muted)]">
                {format.description}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-10 border-t border-[var(--theme-border)] py-14 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">
              Públicos e oportunidades
            </p>
            <h2 className="marka-editorial mt-4 text-4xl sm:text-5xl">
              Um ecossistema.<br />Várias formas de chegar às pessoas.
            </h2>
          </div>
          <div>
            <ul className="divide-y divide-[var(--theme-border)] border-y border-[var(--theme-border)]">
              {audiences.map((audience) => (
                <li key={audience} className="flex items-center gap-4 py-4 text-sm">
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--theme-accent)]" />
                  {audience}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs leading-6 text-[var(--theme-text-faint)]">
              Os públicos, formatos, métricas, preços e inventário publicitário
              disponíveis dependem da instrumentação e das operações efetivamente
              ativadas na plataforma. A MARKA não apresenta alcance ou resultados
              estimados como métricas já comprovadas.
            </p>
          </div>
        </section>

        <section id="contact-form" className="scroll-mt-8 rounded-[1.5rem] border border-[var(--theme-border)] p-7 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">
                Contacto comercial
              </p>
              <h2 className="marka-editorial mt-4 text-3xl sm:text-4xl">
                Vamos construir uma parceria.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--theme-text-muted)]">
                Envie o seu interesse em publicidade, comércio, fornecimento,
                logística ou parceria estratégica. O pedido fica registado
                no sistema para acompanhamento pela equipa MARKA.
              </p>
              <p className="mt-6 text-xs leading-6 text-[var(--theme-text-faint)]">
                Os dados de contacto são utilizados apenas para responder a
                este pedido e gerir a relação comercial, conforme a política
                de privacidade aplicável.
              </p>
            </div>

            <form onSubmit={handleLeadSubmit} className="grid gap-4 sm:grid-cols-2">
              <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[10000px] h-px w-px opacity-0" />
              <label className="text-xs text-[var(--theme-text-muted)]">
                Nome completo *
                <input name="name" required minLength={2} maxLength={120} autoComplete="name" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)]" />
              </label>
              <label className="text-xs text-[var(--theme-text-muted)]">
                Organização
                <input name="organizationName" maxLength={160} autoComplete="organization" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)]" />
              </label>
              <label className="text-xs text-[var(--theme-text-muted)]">
                Tipo de interesse *
                <select name="leadType" defaultValue="ADVERTISER" required className="mt-2 min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)]">
                  <option value="ADVERTISER">Publicidade</option>
                  <option value="MERCHANT">Comércio / vendedor</option>
                  <option value="LOGISTICS">Logística / entregas</option>
                  <option value="SUPPLIER">Fornecedor</option>
                  <option value="SERVICE_PROVIDER">Prestador de serviços</option>
                  <option value="STRATEGIC_PARTNER">Parceria estratégica</option>
                  <option value="OTHER">Outro</option>
                </select>
              </label>
              <label className="text-xs text-[var(--theme-text-muted)]">
                E-mail
                <input name="email" type="email" maxLength={254} autoComplete="email" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)]" />
              </label>
              <label className="text-xs text-[var(--theme-text-muted)]">
                Telefone
                <input name="phone" type="tel" maxLength={32} autoComplete="tel" placeholder="+244 ..." className="mt-2 min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)]" />
              </label>
              <label className="text-xs text-[var(--theme-text-muted)] sm:col-span-2">
                Como podemos colaborar?
                <textarea name="message" rows={4} maxLength={4000} className="mt-2 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 py-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)]" />
              </label>
              <label className="flex items-start gap-3 text-xs leading-5 text-[var(--theme-text-muted)] sm:col-span-2">
                <input name="consent" type="checkbox" required className="mt-1" />
                Autorizo a MARKA a utilizar estes dados para responder a este pedido comercial.
              </label>
              <div className="sm:col-span-2">
                <button type="submit" disabled={submitting} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--theme-text)] px-6 py-3 text-sm font-semibold text-[var(--theme-background)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50">
                  {submitting ? "A enviar…" : "Enviar pedido comercial"}
                </button>
                {formMessage ? <p role="status" aria-live="polite" className={"mt-4 text-sm " + (formError ? "text-rose-400" : "text-emerald-500")}>{formMessage}</p> : null}
              </div>
            </form>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-[var(--theme-border)] py-8 text-xs text-[var(--theme-text-faint)] sm:flex-row sm:items-center sm:justify-between">
          <span>MARKA · Mobilidade, comércio e oportunidades.</span>
          <div className="flex flex-wrap gap-4">
            <a href="https://markaao.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">markaao.com</a>
            <a href="mailto:info@markaao.com" className="underline underline-offset-4">info@markaao.com</a>
            <Link href="/" className="underline underline-offset-4">Voltar à MARKA</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
