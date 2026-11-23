/**
 * Deterministic server-side conduct policy shared by customer and partner accounts.
 * Blocks high-confidence violations; it does not infer guilt from ambiguous language.
 */
export type MessagePolicyResult =
  | { allowed: true }
  | { allowed: false; code: string; reason: string; severity: "MEDIUM" | "HIGH" | "CRITICAL" };

const rules: Array<{ code: string; reason: string; severity: "MEDIUM" | "HIGH" | "CRITICAL"; patterns: RegExp[] }> = [
  {
    code: "CONTACT_SHARING",
    severity: "MEDIUM",
    reason: "Não é permitido partilhar números de telefone, e-mails, perfis sociais ou contactos externos. Mantém a comunicação na MARKA.",
    patterns: [
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
      /(?:https?:\/\/|www\.)\S+/i,
      /(?:wa\.me\/|api\.whatsapp\.com|t\.me\/|telegram\.me\/|instagram\.com\/|facebook\.com\/|m\.me\/)/i,
      /(?:\+?244[\s().-]*)?(?:9[1-9][\s().-]*\d{3}[\s().-]*\d{3}|2\d{2}[\s().-]*\d{3}[\s().-]*\d{3})/i,
      /(?:whats?app|telegram|instagram|facebook|contacta-me|liga-me|chama-me|meu número|meu numero|n[uú]mero|telefone|email|e-mail)\s*(?:é|e|:|=|n[ºo.]?)?\s*[@:+()\d][\w.+()\s-]{5,}/i,
    ],
  },
  {
    code: "OFF_PLATFORM_TRANSACTION",
    severity: "HIGH",
    reason: "Não é permitido negociar ou concluir pagamentos fora da MARKA. Usa os meios oficiais da plataforma para proteger ambas as partes.",
    patterns: [
      /(?:paga|pagar|transfer[eê]ncia|transfere|envia|manda)\s+(?:por|para|no)\s+(?:fora|directo|direto|particular|conta pessoal|multicaixa express|express|unitel money)/i,
      /(?:compra|venda|neg[oó]cio|pagamento)\s+(?:por fora|fora da plataforma|fora da marka)/i,
      /(?:não|nao)\s+(?:uses|utilizes|use)\s+(?:a )?plataforma/i,
      /(?:mbway|multicaixa express|unitel money|paypal|wise)\s*(?:[:#-]|n[uú]mero|conta|chave|id)\s*\S+/i,
    ],
  },
  {
    code: "CREDENTIAL_SHARING",
    severity: "CRITICAL",
    reason: "Nunca partilhes palavras-passe, PIN, códigos OTP/2FA, códigos de recuperação ou dados de cartão. Este conteúdo é bloqueado por segurança.",
    patterns: [
      /(?:password|palavra[- ]?passe|senha|passcode|pin|otp|2fa|c[oó]digo\s+(?:de\s+)?(?:verifica[cç][aã]o|acesso|seguran[cç]a|recupera[cç][aã]o)|recovery\s+code|api[_ -]?key|secret[_ -]?key)\s*(?:é|e|:|=|->)?\s*[A-Z0-9@#$%_-]{4,}/i,
      /(?:cart[aã]o|cvv|cvc|validade|iban)\s*(?:é|e|:|=)?\s*[A-Z0-9\s-]{6,}/i,
    ],
  },
  {
    code: "THREATS_OR_VIOLENCE",
    severity: "CRITICAL",
    reason: "Ameaças, intimidação e incitação à violência não são permitidas. A mensagem foi bloqueada e sinalizada para análise de segurança.",
    patterns: [
      /\b(?:vou|vamos)\s+(?:te\s+)?(?:matar|agredir|espancar|violar|aleijar)\b/i,
      /\b(?:ameaço|ameaco|ameaça de morte|vais morrer|vai morrer|vou acabar contigo)\b/i,
      /\b(?:pagarás|vais pagar)\s+(?:por isto|por isso)\b/i,
    ],
  },
  {
    code: "HARASSMENT_OR_HATE",
    severity: "HIGH",
    reason: "Assédio, perseguição e ataques discriminatórios não são permitidos na MARKA. Reformula a mensagem de forma respeitosa.",
    patterns: [
      /\b(?:não te largo|nao te largo|vou perseguir-te|vou te perseguir|sei onde moras|vou expor-te|vou te expor)\b/i,
      /\b(?:morte a todos|devem ser exterminados|raça inferior|limpar esta raça)\b/i,
    ],
  },
  {
    code: "SCAM_OR_COERCION",
    severity: "HIGH",
    reason: "Pedidos suspeitos de adiantamentos, taxas para desbloquear prémios ou garantias financeiras enganosas são bloqueados para proteger os utilizadores.",
    patterns: [
      /\b(?:envia|manda|deposita|transfere)\s+(?:já\s+)?(?:dinheiro|kwanzas|kz)\s+(?:para|a fim de)\s+(?:libertar|desbloquear|receber)\b/i,
      /\b(?:prémio garantido|lucro garantido|retorno garantido|taxa de desbloqueio|taxa para levantar o prémio)\b/i,
      /\b(?:sou da marka|sou funcionário da marka|sou funcionario da marka)\b.*\b(?:senha|pin|otp|código|codigo)\b/i,
    ],
  },
  {
    code: "SPAM_OR_MASS_SOLICITATION",
    severity: "MEDIUM",
    reason: "Publicidade repetitiva, correntes e solicitações em massa não são permitidas nas conversas de serviço.",
    patterns: [
      /(?:encaminha|partilha|envia)\s+(?:(?:esta mensagem|isto)\s+)?(?:para\s+)?(?:todos|a todos|os teus contactos|os seus contactos|contactos|amigos)\b/i,
      /\b(?:ganha dinheiro fácil|renda garantida sem trabalhar|oportunidade única imperdível)\b/i,
    ],
  },
];

export function inspectMarketplaceMessage(value: string): MessagePolicyResult {
  const normalized = value.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "");
  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return { allowed: false, code: rule.code, reason: rule.reason, severity: rule.severity };
    }
  }
  return { allowed: true };
}
