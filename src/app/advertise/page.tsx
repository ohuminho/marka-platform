"use client";

import Link from "next/link";

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

function contactHref(email: string, subject: string) {
  return "mailto:" + email + "?subject=" + encodeURIComponent(subject);
}

export default function AdvertisePage() {
  const salesEmail = process.env.NEXT_PUBLIC_MARKA_ADVERTISING_EMAIL;

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
              {salesEmail ? (
                <a
                  href={contactHref(salesEmail, "Publicidade na MARKA")}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--theme-text)] px-6 py-3 text-sm font-semibold text-[var(--theme-background)] transition hover:opacity-85"
                >
                  Solicitar proposta comercial
                </a>
              ) : (
                <div className="max-w-lg rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 py-4 text-sm leading-6 text-[var(--theme-text-muted)]">
                  O canal de contacto comercial será ativado quando a MARKA
                  configurar o endereço oficial de publicidade.
                </div>
              )}
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

        <section className="rounded-[1.5rem] border border-[var(--theme-border)] p-7 sm:p-10">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">
            Para anunciantes
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="marka-editorial text-3xl sm:text-4xl">
                Prepare a sua próxima campanha.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--theme-text-muted)]">
                Marcas como operadores de telecomunicações, retalhistas,
                instituições financeiras e empresas locais podem explorar
                oportunidades de publicidade na MARKA, sujeitas à disponibilidade
                de inventário e à aprovação comercial.
              </p>
            </div>
            {salesEmail ? (
              <a
                href={contactHref(salesEmail, "Quero anunciar na MARKA")}
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[var(--theme-text)] px-6 py-3 text-sm font-semibold text-[var(--theme-background)] transition hover:opacity-85"
              >
                Falar com a equipa comercial
              </a>
            ) : (
              <p className="max-w-sm text-xs leading-6 text-[var(--theme-text-faint)]">
                Para ativar pedidos comerciais, configure
                NEXT_PUBLIC_MARKA_ADVERTISING_EMAIL no ambiente de produção.
              </p>
            )}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-[var(--theme-border)] py-8 text-xs text-[var(--theme-text-faint)] sm:flex-row sm:items-center sm:justify-between">
          <span>MARKA · Mobilidade, comércio e oportunidades.</span>
          <Link href="/" className="underline underline-offset-4">Voltar à MARKA</Link>
        </footer>
      </div>
    </main>
  );
}
