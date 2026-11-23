import assert from "node:assert/strict";
import { inspectMarketplaceMessage } from "../../../src/core/marketplace/message-policy";

const blocked = [
  ["contact sharing", "Liga-me no +244 923 456 789", "CONTACT_SHARING"],
  ["off-platform deal", "Vamos concluir a venda por fora da plataforma", "OFF_PLATFORM_TRANSACTION"],
  ["credential theft", "O teu OTP é 123456", "CREDENTIAL_SHARING"],
  ["threat", "Vou matar-te se não pagares", "THREATS_OR_VIOLENCE"],
  ["harassment", "Sei onde moras e vou perseguir-te", "HARASSMENT_OR_HATE"],
  ["advance-fee scam", "Envia dinheiro para desbloquear o prémio", "SCAM_OR_COERCION"],
  ["mass solicitation", "Encaminha esta mensagem para todos os teus contactos", "SPAM_OR_MASS_SOLICITATION"],
] as const;

for (const [label, message, code] of blocked) {
  const result = inspectMarketplaceMessage(message);
  assert.equal(result.allowed, false, label);
  if (!result.allowed) assert.equal(result.code, code, label);
}

for (const message of [
  "Bom dia. O produto continua disponível?",
  "A consulta pode ser marcada para terça-feira?",
  "O valor proposto é 25.000 Kz, com pagamento através do checkout da MARKA.",
]) {
  assert.equal(inspectMarketplaceMessage(message).allowed, true, message);
}

console.log("MARKA conduct policy tests passed.");
