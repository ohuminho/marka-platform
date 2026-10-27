import Link from "next/link";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

const principles = [
  {
    title: "Ouvir as duas partes",
    text: "Uma reclamação não é uma condenação. Sempre que for seguro e possível, o motorista e o passageiro devem poder apresentar a sua versão e os elementos relevantes.",
  },
  {
    title: "Decidir com evidências",
    text: "A análise deve considerar os registos da viagem, horários, mensagens, pagamentos e outros elementos legitimamente disponíveis. A decisão não deve depender apenas de quem reclamou primeiro.",
  },
  {
    title: "Responsabilidade individual",
    text: "A conduta do motorista e a do passageiro são avaliadas separadamente. A má conduta de uma parte não elimina a responsabilidade da outra.",
  },
  {
    title: "Medidas proporcionais",
    text: "Quando os factos o justificarem, as medidas podem incluir orientação, advertência, restrições temporárias ou suspensão. A gravidade, a repetição e o risco devem ser considerados.",
  },
  {
    title: "Segurança primeiro",
    text: "Ameaças, violência, assédio, discriminação, fraude ou risco imediato exigem encaminhamento prioritário e medidas preventivas adequadas. A imparcialidade não significa ignorar o perigo.",
  },
  {
    title: "Revisão e recurso",
    text: "Sempre que operacionalmente possível, a decisão deve indicar o motivo, a regra aplicada e como pedir uma revisão. Os dados pessoais devem ser partilhados apenas com quem precisa de os tratar.",
  },
];

export default function MobilityFairnessPage() {
  const supportEmail = process.env.NEXT_PUBLIC_MARKA_SUPPORT_EMAIL;

  return (
    <DynamicBackground>
      <AppShell>
        <div className="space-y-8">
          <RoleContextSummary />
          <section className="relative isolate overflow-hidden rounded-[2rem] border border-[var(--theme-border)] bg-[#101414] px-6 py-9 text-white sm:px-10 sm:py-12">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_20%,rgba(205,184,133,0.2),transparent_42%)]" />
            <div className="relative max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d8c18c]">MARKA Mobility · Confiança e justiça</p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">A mesma regra. As duas versões. Uma decisão justa.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">A MARKA deve proteger passageiros e motoristas. Uma reclamação merece ser analisada com seriedade, mas não deve tornar automaticamente culpada a pessoa contra quem foi apresentada.</p>
              <Link href="/app/mobility" className="mt-7 inline-flex min-h-11 items-center rounded-full bg-[#d8c18c] px-5 py-3 text-sm font-semibold text-[#171814]">Voltar à Mobility</Link>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {principles.map((principle, index) => (
              <article key={principle.title} className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-[var(--theme-text-faint)]">PRINCÍPIO 0{index + 1}</span>
                <h2 className="mt-3 text-lg font-semibold text-[var(--theme-text)]">{principle.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">{principle.text}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">Para passageiros</p>
              <h2 className="mt-3 text-xl font-semibold text-[var(--theme-text)]">O seu direito a reclamar — e o seu dever de respeitar.</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">Pode comunicar atrasos, cobrança incorrecta, condução perigosa ou comportamento inadequado. Ameaças, insultos, assédio, danos, fraude ou falsas denúncias também podem ser analisados e ter consequências.</p>
            </article>
            <article className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">Para motoristas</p>
              <h2 className="mt-3 text-xl font-semibold text-[var(--theme-text)]">Profissionalismo com direito a ser ouvido.</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">O motorista mantém a responsabilidade pela segurança, respeito, serviço e cumprimento das regras. Tem também de poder contestar acusações, apresentar evidências e pedir revisão de decisões que considere incorrectas.</p>
            </article>
          </section>

          <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-[var(--theme-text)]">Como deve decorrer uma análise</h2>
            <ol className="mt-5 grid gap-4 md:grid-cols-4">
              {[
                ["01", "Registo", "Identificar a viagem e a natureza da ocorrência."],
                ["02", "Recolha", "Dar oportunidade de resposta às partes, quando apropriado."],
                ["03", "Avaliação", "Comparar evidências e aplicar regras consistentes."],
                ["04", "Decisão", "Registar a justificação, a medida e a via de revisão."],
              ].map(([number, title, description]) => (
                <li key={number} className="rounded-2xl border border-[var(--theme-border)] p-4">
                  <span className="text-[10px] tracking-[0.2em] text-[var(--theme-text-faint)]">{number}</span>
                  <h3 className="mt-2 text-sm font-semibold text-[var(--theme-text)]">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-[var(--theme-text-muted)]">{description}</p>
                </li>
              ))}
            </ol>
          </section>

          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
            <p className="text-sm font-semibold text-[var(--theme-text)]">Transparência sobre o estado actual</p>
            <p className="mt-2 text-xs leading-6 text-[var(--theme-text-muted)]">Esta página apresenta a política pretendida. O formulário de reclamações, o processo de resposta de ambas as partes, a revisão por um responsável e o registo auditável ainda precisam de estar ligados a um fluxo operacional real antes de serem anunciados como serviço activo. Em caso de perigo imediato, procure os serviços de emergência competentes.</p>
            {supportEmail ? (
              <a className="mt-4 inline-flex min-h-10 items-center rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs font-semibold text-[var(--theme-text)]" href={`mailto:${supportEmail}?subject=${encodeURIComponent("Assunto de mobilidade — pedido de orientação")}`}>Contactar o apoio MARKA</a>
            ) : (
              <p className="mt-3 text-xs text-[var(--theme-text-faint)]">O contacto oficial de apoio será apresentado quando NEXT_PUBLIC_MARKA_SUPPORT_EMAIL estiver configurado em produção.</p>
            )}
          </div>
        </div>
      </AppShell>
    </DynamicBackground>
  );
}
