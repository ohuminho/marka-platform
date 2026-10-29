import Link from "next/link";

const sections = [
  ["Responsável e contacto", "A identidade legal completa da entidade responsável e os contactos oficiais de privacidade devem ser publicados pela MARKA antes do lançamento comercial final. Não use este aviso como substituto desses dados formais."],
  ["Dados tratados", "Consoante o serviço utilizado, podem ser tratados dados de conta e contacto, dados de candidatura, identificação, carta de condução, registo criminal quando legalmente exigível, documentos do veículo, imagens/documentos enviados, estado de verificação, dados de viagem, localização operacional, registos de suporte e eventos de segurança."],
  ["Finalidades", "Os dados são usados para criar e proteger a conta, avaliar a candidatura, verificar elegibilidade e documentos, associar o motorista a um veículo, prestar e proteger viagens, gerir pagamentos e liquidações aplicáveis, prevenir fraude, investigar incidentes, responder a reclamações e cumprir obrigações legais."],
  ["Base e minimização", "A MARKA deve limitar a recolha ao que é necessário para cada finalidade e identificar a base legal aplicável antes do tratamento. Documentos sensíveis não devem ser solicitados sem necessidade, fundamento e controlos adequados."],
  ["Acesso, segurança e partilha", "Documentos de verificação devem ser armazenados em repositório privado, com acesso restrito, ligações temporárias para revisão, registo de decisões e proteção contra acesso não autorizado. Os dados só devem ser partilhados com prestadores ou autoridades quando necessário e permitido."],
  ["Conservação e eliminação", "Os períodos de conservação devem ser definidos por categoria de dado, finalidade, risco e obrigações aplicáveis. A política final deve explicar os prazos e o processo para pedidos de acesso, correção, oposição ou eliminação, quando aplicáveis."],
  ["Verificação humana e decisões", "O envio de um documento não significa que foi validado. Os estados pendente, em revisão, verificado, rejeitado, expirado ou suspenso refletem o processo de revisão. A aplicação não deve afirmar que valida autenticidade documental automaticamente sem um serviço real e testado."],
  ["Direitos e pedidos", "Os titulares devem poder solicitar informação sobre o tratamento dos seus dados através de um canal oficial de privacidade publicado pela MARKA. O contacto, os prazos e o procedimento formal devem ser completados antes da operação comercial final."],
];

export default function PrivacyNoticePage() {
  return <main className="mx-auto max-w-4xl space-y-8 px-5 py-10 text-[var(--theme-text)] sm:px-8">
    <header className="space-y-3"><Link href="/app/driver" className="text-sm underline underline-offset-4">Voltar à adesão</Link>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--theme-text-muted)]">MARKA · Privacidade e confiança</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Aviso de Privacidade</h1>
      <p className="text-sm text-[var(--theme-text-muted)]">Versão de trabalho para o fluxo MARKA Mobility · Angola</p>
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-6"><strong>Publicação responsável:</strong> este aviso identifica as categorias e controlos esperados, mas deve ser completado com a entidade responsável, contactos, bases legais e prazos de conservação confirmados pela MARKA e revistos juridicamente antes do lançamento final.</div>
    </header>
    {sections.map(([title, body]) => <article key={title} className="space-y-2 border-b border-[var(--theme-border)] pb-5"><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm leading-7 text-[var(--theme-text-muted)]">{body}</p></article>)}
    <Link href="/legal/mobility-driver" className="text-sm underline underline-offset-4">Ler os Termos de Adesão do Motorista</Link>
  </main>;
}
