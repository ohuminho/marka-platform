# MARKA — pagamentos com liquidação directa ao prestador

**Estado:** decisão de arquitectura preliminar; não activar pagamentos reais até validação contratual e sandbox.
**Âmbito:** Marketplace, Mobility, Delivery, Cargo, Assist e reservas de espaços.
**Princípio financeiro obrigatório:** a MARKA não recebe nem guarda o valor devido ao prestador. O valor do serviço deve ser liquidado directamente na conta bancária/carteira do prestador. A MARKA recebe apenas a sua comissão/receita própria.

## 1. Resultado da análise dos PSPs em Angola

### AppyPay — candidato técnico, ainda não aprovado para marketplace

A documentação pública confirma:
- API para Multicaixa Express/GPO, Referência, Débito Directo e UNITEL Money.
- API de cobranças, OAuth2 Client Credentials, ambiente sandbox e webhooks.
- A notificação webhook deve ser seguida de consulta server-side à transacção (`GET /charges/{id}`) antes de actualizar o estado interno.
- Os termos públicos dizem que a AppyPay não intervém no fluxo financeiro: os fundos são creditados directamente na conta bancária do cliente comerciante (ou carteira UNITEL Money, conforme o método).
- A adesão GPO depende também do banco de apoio e da configuração do terminal virtual/credenciais do comerciante.

**Limitação crítica:** a documentação consultada não confirma split settlement, subcontas de vendedores ou marketplace payouts. Portanto, não assumir que uma única conta MARKA consegue receber um pagamento e repartir automaticamente o valor por vários vendedores.

Referências oficiais consultadas:
- https://www.appypay.co.ao/api-info
- https://www.appypay.co.ao/termos-de-utilizacao
- https://suporte-appypay.freshdesk.com/support/solutions/articles/501000385502-criar-uma-cobranca-charge-na-api-appypay-gpo-e-refer%C3%AAncia
- https://suporte-appypay.freshdesk.com/support/solutions/articles/501000385504-passo-a-passo-para-configurar-um-webhook-no-portal-appypay
- https://multicaixa.ao/pt/oferta/canais/comerciantes/gateway-de-pagamentos-online/

### Alternativas a avaliar

- ProxyPay/EMIS GPO: integração directa com Multicaixa Express e referências; confirmar modelo de liquidação multi-comerciante.
- Outros PST-SP autorizados pela EMIS: avaliar apenas com documentação oficial, contrato, sandbox, webhooks e prova de liquidação directa.
- Qualquer gateway com produto Enterprise/Marketplace só passa a candidato depois de demonstrar por contrato e sandbox a liquidação directa por vendedor ou split settlement para contas de beneficiários.

## 2. Modelo financeiro aprovado para implementação

1. Cada prestador/vendedor é identificado como beneficiário e tem KYC, titularidade da conta e estado de elegibilidade verificados.
2. Antes de activar pagamentos, o PSP/banco confirma se o prestador pode receber directamente ou se a solução suporta split settlement.
3. O checkout apresenta separadamente:
   - valor do prestador;
   - comissão MARKA;
   - custos do PSP e impostos aplicáveis;
   - total pago pelo cliente.
4. A ordem de pagamento deve identificar o beneficiário, prestador, serviço, moeda, montante e referência interna.
5. O valor do prestador é liquidado directamente na conta do prestador. A MARKA não cria saldo de cliente, carteira de vendedor ou conta transitória para guardar fundos.
6. A comissão MARKA é recebida como receita própria, por split aprovado pelo PSP ou por cobrança separada ao prestador (por transacção ou factura periódica), conforme o modelo contratual autorizado.
7. Se o PSP só permitir liquidação para uma conta comerciante única, não usar essa conta para receber fundos pertencentes aos vendedores. Nesse cenário, manter checkout real desactivado até existir solução compatível.

## 3. Integração técnica — requisitos obrigatórios

- Criar adapter específico do PSP sem substituir o PaymentService, ledger, auditoria, idempotência e reconciliação existentes.
- Não reutilizar a conta/credenciais globais MARKA para cobrar por conta de todos os vendedores sem autorização expressa do PSP e enquadramento legal.
- Credenciais por comerciante/beneficiário, quando exigidas, devem ser armazenadas cifradas no servidor; nunca em atributos públicos do anúncio nem no browser.
- Webhook público com validação de origem/autenticidade, limite de tamanho, rate limiting, idempotência e registo de evento bruto sem segredos.
- Quando o PSP não disponibilizar assinatura verificável, o webhook funciona apenas como sinal: consultar a transacção no endpoint autenticado do PSP e validar beneficiário, referência, montante, moeda e estado antes de qualquer captura/confirmacão.
- Redirect do browser, screenshot, comprovativo enviado pelo cliente ou resposta do frontend nunca confirmam pagamento.
- Processar eventos duplicados e fora de ordem sem duplicar ledger, comissão, entrega ou reserva.
- Refunds e reversões devem ser solicitados ao PSP e reconciliados; não simular reembolso por alteração manual do estado.
- Dinheiro recebido directamente pelo prestador não pode ser apresentado como saldo da MARKA.

## 4. Reservas de espaços — dependências

A camada de reservas já tem pedido, decisão do proprietário, cotação e cancelamento de reservas não pagas. Falta ligar a reserva ao ciclo financeiro sem criar uma ordem fictícia:
- Payment deve suportar referência de negócio a SpaceBooking sem exigir Order.
- O PSP deve receber referência idempotente da reserva e do beneficiário.
- Após webhook, consultar o PSP e verificar montante/moeda/beneficiário.
- Só então, numa transacção de base de dados, confirmar pagamento e reserva, criar evento financeiro e bloquear calendário.
- Expiração, cancelamento, reembolso e libertação do horário têm de ser idempotentes e auditáveis.

**Não activar ainda PAYMENT_PENDING/CONFIRMED nem cobrar reservas até o adapter real e a liquidação directa estarem certificados.**

## 5. Critérios para aprovar um PSP

O PSP só pode ser escolhido quando houver resposta escrita para:
1. Suporta marketplace/submerchants ou credenciais independentes por vendedor?
2. O valor pode ser liquidado directamente na conta de cada vendedor?
3. Como é calculada e liquidada a comissão da MARKA sem a plataforma custodiar fundos?
4. Quais são taxas, limites, prazos de liquidação, chargebacks, cancelamentos e reembolsos?
5. Existe sandbox utilizável, API de consulta, webhooks, política de retries e documentação de segurança?
6. O modelo está autorizado pelo banco de apoio, PSP e enquadramento regulatório angolano?

## 6. Estado de produção

- PaymentProvider bootstrap actual regista apenas SANDBOX; nenhum PSP real está configurado no código consultado.
- O PaymentService actual está centrado em Order e não suporta ainda o ciclo de pagamento de SpaceBooking sem Order.
- Não criar uma integração real ou activar cobrança com base apenas em documentação pública.
- Próximo passo técnico: preparar adapter e contrato de domínio multi-beneficiário depois de confirmar com o PSP o modelo de liquidação. Até lá, manter o fluxo de reserva em pedido/cotação, sem pagamento.
