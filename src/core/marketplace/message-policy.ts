/**
 * Marketplace messaging safety policy.
 * Deterministic server-side guard: never rely on client validation alone.
 * This is a friction/control layer, not a guarantee against obfuscated evasion.
 */
export type MessagePolicyResult = { allowed: true } | { allowed: false; code: string; reason: string };

const rules: Array<{ code: string; reason: string; patterns: RegExp[] }> = [
  {
    code: "CONTACT_SHARING",
    reason: "Não é permitido partilhar números de telefone, e-mails, perfis sociais ou contactos externos. Mantém a comunicação e a compra na MARKA.",
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
    reason: "Não é permitido negociar ou concluir pagamentos fora da MARKA. Usa o checkout e os meios oficiais da plataforma para proteger comprador e vendedor.",
    patterns: [
      /(?:paga|pagar|transfer[eê]ncia|transfere|envia|manda)\s+(?:por|para|no)\s+(?:fora|directo|direto|particular|conta pessoal|multicaixa express|express|unitel money)/i,
      /(?:compra|venda|neg[oó]cio|pagamento)\s+(?:por fora|fora da plataforma|fora da marka)/i,
      /(?:não|nao)\s+(?:uses|utilizes|use)\s+(?:a )?plataforma/i,
      /(?:mbway|multicaixa express|unitel money|paypal|wise)\s*(?:[:#-]|n[uú]mero|conta|chave|id)\s*\S+/i,
    ],
  },
  {
    code: "CREDENTIAL_SHARING",
    reason: "Nunca partilhes palavras-passe, PIN, códigos OTP/2FA, códigos de recuperação, chaves API ou dados de acesso. A MARKA bloqueia este tipo de conteúdo.",
    patterns: [
      /(?:password|palavra[- ]?passe|senha|passcode|pin|otp|2fa|c[oó]digo\s+(?:de\s+)?(?:verifica[cç][aã]o|acesso|seguran[cç]a|recupera[cç][aã]o)|recovery\s+code|api[_ -]?key|secret[_ -]?key)\s*(?:é|e|:|=|->)?\s*[A-Z0-9@#$%_-]{4,}/i,
      /(?:cart[aã]o|cvv|cvc|validade|iban)\s*(?:é|e|:|=)?\s*[A-Z0-9\s-]{6,}/i,
    ],
  },
];

export function inspectMarketplaceMessage(value: string): MessagePolicyResult {
  const normalized = value.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "");
  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return { allowed: false, code: rule.code, reason: rule.reason };
    }
  }
  return { allowed: true };
}
