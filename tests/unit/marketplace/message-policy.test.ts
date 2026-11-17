import assert from "node:assert/strict";
import { inspectMarketplaceMessage } from "../../../src/core/marketplace/message-policy";

const blockedContact = [
  "Fala comigo no WhatsApp para combinarmos.",
  "Manda no Telegram quando estiveres perto.",
  "O meu contacto é @vendedor_ao.",
  "O meu número é 9 2 3 4 5 6 7 8 9.",
  "O meu email é maria @ exemplo . com.",
];
for (const message of blockedContact) {
  const result = inspectMarketplaceMessage(message);
  assert.equal(result.allowed, false, `Expected contact to be blocked: ${message}`);
  if (!result.allowed) assert.equal(result.code, "CONTACT_SHARING");
}

const blockedPayment = inspectMarketplaceMessage("Paga por Multicaixa Express e fechamos fora da MARKA.");
assert.equal(blockedPayment.allowed, false);
if (!blockedPayment.allowed) assert.equal(blockedPayment.code, "OFF_PLATFORM_TRANSACTION");

const allowed = [
  "O produto está disponível e posso entregar amanhã.",
  "A encomenda custa 100.000 Kz.",
  "Pode levantar na loja durante o horário comercial.",
];
for (const message of allowed) {
  assert.equal(inspectMarketplaceMessage(message).allowed, true, `Expected normal message to be allowed: ${message}`);
}

console.log("Marketplace message policy tests passed.");
