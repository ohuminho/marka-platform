import Link from "next/link";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

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
          <section className="relative isolate overflow-hidden rounded-[2rem] border border-[var(--theme-border)] bg-[#101414] px-6 py-8 text-white sm:px-10 sm:py-12">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_20%,rgba(205,184,133,0.2),transparent_42%)]" />
            <div className="relative max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d8c18c]">MARKA Mobility · Centro de parceiros</p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Mais confiança para quem conduz. Mais segurança para quem viaja.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                Um processo de adesão pensado para Angola: identidade validada, veículo documentado, condições contratuais claras e activação apenas depois das verificações necessárias.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/app/mobility" className="inline-flex min-h-11 items-center rounded-full bg-[#d8c18c] px-5 py-3 text-sm font-semibold text-[#171814]">Voltar à Mobility</Link>
                <a href="#processo" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white/85">Ver processo de adesão</a>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["KYC", "Identidade e elegibilidade"],
              ["DRIVERS", "Registo e estado do motorista"],
              ["CONTRATOS", "Termos, comissões e aceitação"],
              ["SUPORTE", "Contacto, incidentes e reclamações"],
            ].map(([label, detail]) => (
              <div key={label} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">{label}</p>
                <p className="mt-2 text-sm font-medium text-[var(--theme-text)]">{detail}</p>
              </div>
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

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
              <h2 className="text-lg font-semibold text-[var(--theme-text)]">Contratos sem surpresas</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">Antes de entrar em operação, o motorista deve conseguir consultar a versão do contrato, a comissão aplicável, a forma e periodicidade de liquidação, as regras de cancelamento, o tratamento de reclamações e as condições de suspensão ou saída. A aceitação deve ficar registada e ser recuperável.</p>
            </article>
            <article className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
              <h2 className="text-lg font-semibold text-[var(--theme-text)]">Contacto e protecção de dados</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">A operação precisa de um canal de suporte para motoristas, incidentes e reclamações, com registos e encaminhamento responsável. BI, antecedentes, contactos e documentos não devem ser recolhidos por canais públicos ou informais sem controlos de acesso e política de retenção.</p>
            </article>
          </section>

          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
            <p className="text-sm font-semibold text-[var(--theme-text)]">Estado honesto desta área</p>
            <p className="mt-2 text-xs leading-6 text-[var(--theme-text-muted)]">Esta página organiza o processo e os requisitos. O envio seguro de documentos, assinatura electrónica, gestão de contratos, contacto operacional com motoristas e integração de registos com as autoridades só devem ser considerados activos depois de ligados e testados com os serviços reais. Não carregue aqui documentos pessoais: este ecrã ainda não é um formulário de candidatura.</p>
          </div>
        </div>
      </AppShell>
    </DynamicBackground>
  );
}
