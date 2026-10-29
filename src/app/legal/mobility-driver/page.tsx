import Link from "next/link";

const sections = [
  ["1. Âmbito e natureza da relação", "Estes termos regulam a adesão de um motorista parceiro à MARKA Mobility. A candidatura não cria, por si só, uma relação laboral, sociedade ou garantia de rendimento. A natureza jurídica concreta da relação deve ser confirmada de acordo com a legislação angolana aplicável e com os factos da operação."],
  ["2. Elegibilidade e identidade", "O candidato deve fornecer dados verdadeiros, manter a conta sob seu controlo e comunicar alterações relevantes. A MARKA pode pedir confirmação adicional de identidade, contacto, idade, habilitação e elegibilidade antes de permitir a operação."],
  ["3. Documentos e veículo", "O motorista deve submeter documentos legíveis, autênticos, válidos e pertencentes à pessoa ou ao veículo a que dizem respeito. Podem ser exigidos documento de identificação, carta de condução adequada, registo criminal quando legalmente aplicável, registo e propriedade/uso do veículo, seguro, inspeção e licenças exigíveis. A aprovação depende de revisão humana autorizada e de requisitos aplicáveis."],
  ["4. Viagens, atendimento e segurança", "O parceiro deve cumprir as regras de trânsito, tratar passageiros com respeito, confirmar a viagem e o destino, proteger a segurança de todos e utilizar a aplicação apenas para operações legítimas. São proibidos assédio, discriminação, fraude, manipulação de localização, partilha indevida de contas e transporte em condições inseguras."],
  ["5. Tarifas, comissões e liquidação", "Antes da ativação, a MARKA deve apresentar no fluxo de adesão as condições comerciais aplicáveis, incluindo comissão, tarifas ou deduções, método de cálculo, periodicidade e método de liquidação. Nenhuma percentagem ou tarifa é criada por este texto: os valores vinculativos são os apresentados numa tabela comercial identificada e aceite separadamente antes da ativação."],
  ["6. Cancelamentos, reclamações e incidentes", "O parceiro deve seguir as regras de cancelamento apresentadas na aplicação e comunicar incidentes, acidentes, suspeitas de fraude e reclamações através dos canais oficiais disponibilizados pela MARKA. As decisões devem ser registadas e podem ser contestadas através do canal de suporte indicado na aplicação."],
  ["7. Dados pessoais e confidencialidade", "Os dados e documentos são tratados para verificar identidade, elegibilidade, segurança, operação, prevenção de fraude, apoio e cumprimento de obrigações aplicáveis. O acesso deve ser limitado a pessoas autorizadas e os documentos não devem ser partilhados fora dos canais oficiais. Os detalhes sobre finalidades, retenção, direitos e contacto constam do Aviso de Privacidade."],
  ["8. Revisão, suspensão e cessação", "A candidatura pode permanecer pendente enquanto existirem documentos ou verificações por concluir. Documentos expirados, informação falsa, risco de segurança ou incumprimento podem originar pedido de correção, suspensão ou cessação, com comunicação do motivo sempre que legal e operacionalmente possível. A aprovação não é automática."],
  ["9. Responsabilidade e conformidade", "O motorista é responsável por conduzir legalmente, manter habilitações e documentos válidos, assegurar que o veículo está em condições e cumprir obrigações fiscais, administrativas e de seguro que lhe sejam aplicáveis. Este documento não substitui licenças, aconselhamento jurídico nem determina por si só a classificação legal da relação."],
  ["10. Atualizações e aceitação", "A versão, a data e a ação expressa de aceitação são registadas para auditoria. Alterações materiais devem ser apresentadas para nova aceitação antes de continuarem a ser aplicadas. O candidato pode guardar ou imprimir esta página antes de aceitar."],
];

export default function MobilityDriverTermsPage() {
  return <main className="mx-auto max-w-4xl space-y-8 px-5 py-10 text-[var(--theme-text)] sm:px-8">
    <header className="space-y-3">
      <Link href="/app/driver" className="text-sm underline underline-offset-4">Voltar à adesão de motorista</Link>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--theme-text-muted)]">MARKA Mobility · Documento contratual</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Termos de Adesão do Motorista Parceiro</h1>
      <p className="text-sm text-[var(--theme-text-muted)]">Versão MARKA-MOBILITY-DRIVER-2026-10-29 · Aplicável ao processo de candidatura em Angola</p>
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-6">
        <strong>Nota de validação jurídica:</strong> este texto estabelece a estrutura operacional e os pontos de transparência da adesão. Antes de ser tratado como contrato juridicamente final, deve ser revisto por profissional habilitado em Angola e completado com os contactos oficiais, a tabela comercial efetiva e os dados societários da entidade contratante.
      </div>
    </header>
    <section className="space-y-6">
      {sections.map(([title, body]) => <article key={title} className="space-y-2 border-b border-[var(--theme-border)] pb-5">
        <h2 className="text-lg font-semibold">{title}</h2><p className="text-sm leading-7 text-[var(--theme-text-muted)]">{body}</p>
      </article>)}
    </section>
    <footer className="flex flex-wrap gap-4 text-sm"><Link className="underline underline-offset-4" href="/legal/privacy">Aviso de Privacidade</Link><Link className="underline underline-offset-4" href="/app/driver">Regressar à candidatura</Link></footer>
  </main>;
}
