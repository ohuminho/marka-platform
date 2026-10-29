import Link from "next/link";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";
import MobilitySupportCenter from "@/frontend/features/mobility/components/MobilitySupportCenter";

const onboardingSteps = [
  {
    number: "01",
    title: "Identidade e elegibilidade (KYC)",
    description:
      "Recolha e validação controlada da identidade, idade, contactos e antecedentes/documentos exigíveis. A conta não deve receber viagens antes de a revisão ser concluída.",
    items: ["BI, passaporte ou autorização de residência válida", "Carta de condução adequada à categoria", "Registo criminal, quando exigido pela autoridade competente"],
  },
  {
    number: "02",
    title: "Veículo e licenciamento",
    description:
      "Associar cada motorista ao veículo que realmente utilizará, verificar a legitimidade de uso, a documentação, a vistoria e as licenças aplicáveis antes da activação.",
    items: ["Livrete e título de propriedade ou documento legítimo de uso", "Licença, vistoria e seguro aplicáveis ao serviço", "Matrícula, características e estado do veículo conferidos"],
  },
  {
    number: "03",
    title: "Contrato e regras de operação",
    description:
      "Disponibilizar os termos do vínculo com a plataforma antes de aceitar viagens: comissões e pagamentos, responsabilidades, tratamento de dados, reclamações, suspensão e cessação.",
    items: ["Contrato/termos aceites com versão e data registadas", "Tabela de comissões e regras de liquidação claras", "Código de conduta, segurança e canal de reclamações"],
  },
  {
    number: "04",
    title: "Formação e activação",
    description:
      "Concluir a formação aplicável, testar a conta e confirmar que os documentos continuam válidos. A elegibilidade deve ser reavaliada quando um documento expirar.",
    items: ["Formação profissional exigida para a categoria", "Orientação de segurança e atendimento ao passageiro", "Aprovação operacional registada antes da primeira viagem"],
  },
];

const readiness = [
  ["Identidade e KYC", "Validar antes da activação"],
  ["Motorista ↔ veículo", "Relação verificável e actualizada"],
  ["Licenças, vistoria e seguro", "Conferência documental e validade"],
  ["Contrato e comissões", "Termos claros e aceitação auditável"],
  ["Segurança e reclamações", "Canal de apoio e registo de incidentes"],
  ["Fiscalidade e registos", "Preparar evidências para revisão profissional"],
];

function SectionCard({
  number,
  title,
  description,
  items,
}: {
  number: string;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <article className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--theme-background)] text-xs font-semibold text-[var(--theme-text)]">{number}</span>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--theme-text)]">{title}</h2>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--theme-text-muted)]">{description}</p>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-5 text-[var(--theme-text-muted)]">
            <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b89a5b]" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function MobilityPartnersPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <div className="space-y-8">
          <RoleContextSummary />
          <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#d8c18c]/30 bg-[#080a0d] px-6 py-8 text-white shadow-[0_28px_90px_-38px_rgba(216,193,140,.3)] sm:px-10 sm:py-12">
            <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2000&q=85" alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-35" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,9,.97)_0%,rgba(5,7,9,.88)_45%,rgba(5,7,9,.48)_100%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_18%,rgba(216,193,140,.25),transparent_36%),linear-gradient(0deg,rgba(5,7,9,.45),transparent_60%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-8 h-56 w-56 rounded-full bg-[#d8c18c]/15 blur-3xl" />
            <div className="relative max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d8c18c]">MARKA Mobility · Centro de parceiros</p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Mais confiança para quem conduz. Mais segurança para quem viaja.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                Um processo de adesão pensado para Angola: identidade validada, veículo documentado, condições contratuais claras e activação apenas depois das verificações necessárias.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/app/driver#candidatura" className="inline-flex min-h-12 items-center rounded-full bg-gradient-to-r from-[#f3dfaa] to-[#c5a66a] px-6 py-3 text-sm font-bold text-[#171814] shadow-[0_8px_30px_-12px_rgba(216,193,140,.7)] transition hover:-translate-y-0.5 hover:brightness-105">Começar candidatura <span aria-hidden="true" className="ml-2">↗</span></Link>
                <Link href="/legal/mobility-driver" className="inline-flex min-h-12 items-center rounded-full border border-white/25 bg-black/20 px-5 py-3 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:border-[#d8c18c]/70">Consultar contrato</Link>
                <a href="#processo" className="inline-flex min-h-12 items-center rounded-full border border-white/25 bg-black/20 px-5 py-3 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:border-[#d8c18c]/70">Ver etapas ↓</a>
              </div>
              <div className="mt-8 grid max-w-2xl grid-cols-3 gap-2">
                {[["01","Candidatura"],["02","Verificação"],["03","Activação"]].map(([n,label]) => <div key={n} className="rounded-xl border border-white/15 bg-black/30 p-3 backdrop-blur-md"><span className="text-[10px] font-bold tracking-[.2em] text-[#e8cd91]">{n}</span><p className="mt-2 text-xs text-white/85">{label}</p></div>)}
              </div>
            </div>
          </section>

          <section aria-label="Acesso rápido para parceiros" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {label:"01 · KYC",detail:"Documentos e elegibilidade",href:"/app/driver#candidatura",cta:"Abrir candidatura"},
              {label:"02 · MOTORISTA",detail:"Estado e operação do parceiro",href:"/app/driver",cta:"Abrir área do motorista"},
              {label:"03 · CONTRATOS",detail:"Condições, comissões e aceitação",href:"/legal/mobility-driver",cta:"Ler condições"},
              {label:"04 · SUPORTE",detail:"Como encaminhar dúvidas e incidentes",href:"#suporte",cta:"Ver orientação"},
            ].map((card) => (
              <Link key={card.label} href={card.href} className="group rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 transition duration-200 hover:-translate-y-1 hover:border-[#d8c18c]/70 hover:shadow-[0_16px_40px_-28px_rgba(216,193,140,.65)] focus:outline-none focus:ring-2 focus:ring-[#d8c18c]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#b89a5b]">{card.label}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--theme-text)]">{card.detail}</p>
                <p className="mt-4 flex items-center justify-between text-xs font-medium text-[var(--theme-text-muted)] transition group-hover:text-[#b89a5b]"><span>{card.cta}</span><span aria-hidden="true">↗</span></p>
              </Link>
            ))}
          </section>

          <section id="processo" className="space-y-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">Adesão responsável</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--theme-text)]">O percurso de cada parceiro</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--theme-text-muted)]">Nenhum candidato deve ser apresentado como verificado nem receber viagens só por criar uma conta. Cada etapa precisa de evidência, responsável pela revisão e estado rastreável.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {onboardingSteps.map((step) => <SectionCard key={step.number} {...step} />)}
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">Preparação regulatória</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--theme-text)]">Lista de controlo para a operação em Angola</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--theme-text-muted)]">Esta matriz ajuda a organizar evidências para a revisão da empresa e das autoridades competentes. Não é uma licença, certificação ou garantia de aprovação.</p>
            <div className="mt-6 divide-y divide-[var(--theme-border)]">
              {readiness.map(([name, status]) => (
                <div key={name} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="text-sm font-medium text-[var(--theme-text)]">{name}</span>
                  <span className="text-xs text-[var(--theme-text-muted)]">{status}</span>
                </div>
              ))}
            </div>
          </section>

          <MobilitySupportCenter />

          <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">Ajuda ao candidato</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--theme-text)]">Perguntas frequentes</h2>
            <div className="mt-4 divide-y divide-[var(--theme-border)]">
              {[
                ["Onde faço a candidatura e envio documentos?", "Abre a candidatura real de motorista. Aí podes aceitar os termos, submeter documentos do motorista e da viatura e acompanhar o estado da revisão."],
                ["Enviar documentos significa que fui aprovado?", "Não. Os documentos ficam pendentes até serem revistos por um utilizador autorizado. Não é possível aceitar viagens antes da ativação operacional."],
                ["Que documentos são normalmente necessários?", "Documento de identificação, carta de condução adequada e registo criminal quando exigido. A viatura pode exigir registo, prova de propriedade ou autorização de uso, seguro, inspeção e licença aplicável."],
                ["Como são tratadas as comissões?", "A política padrão atualmente configurada indica 12% para táxi e 10% para moto-táxi. A parcela restante é 88% e 90%, respetivamente, antes de outros ajustes. Confirma sempre o resumo comercial apresentado antes da ativação."],
                ["Onde leio os termos e a política de dados?", "Consulta o contrato de adesão e o Aviso de Privacidade antes de aceitar e enviar documentos."],
              ].map(([question, answer]) => <details key={question} className="py-4">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--theme-text)]">{question}</summary>
                <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">{answer}</p>
              </details>)}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/app/driver#candidatura" className="rounded-full bg-[#d8c18c] px-5 py-3 text-sm font-semibold text-[#171814]">Abrir candidatura</Link>
              <Link href="/legal/mobility-driver" className="rounded-full border border-[var(--theme-border)] px-5 py-3 text-sm text-[var(--theme-text)]">Termos de Adesão</Link>
              <Link href="/legal/privacy" className="rounded-full border border-[var(--theme-border)] px-5 py-3 text-sm text-[var(--theme-text)]">Aviso de Privacidade</Link>
            </div>
          </section>
        </div>
      </AppShell>
    </DynamicBackground>
  );
}
