# MARKA — ciclo financeiro de transporte e assistência

**Estado:** desenho técnico; não activar pagamentos reais.
**Âmbito:** CARGO_SHIPMENT, WATER_DELIVERY e ROADSIDE_ASSISTANCE.
**Regra financeira:** a MARKA intermedeia o serviço; não recebe nem mantém fundos que pertencem ao prestador.

## 1. Estado observado no código

- O cliente aceita uma cotação através de `POST /api/freight/requests/:id/quote`; o pedido muda atomicamente de `QUOTED` para `AWAITING_PAYMENT`.
- A aceitação apenas devolve `paymentRequired: true`; não cria uma intenção de pagamento nem preenche `paymentReference` ou `paidAt`.
- A API de ofertas e a API de aceitação do prestador exigem `paidAt != null` e estado `PAID` ou `SEARCHING_PROVIDER`.
- O `PaymentService` actual cria pagamentos ligados a `Order` e, na confirmação, cria crédito numa conta de compensação MARKA e executa alocação financeira. Não o reutilizar para cobrar o cliente por conta de um prestador sem provar que o PSP permite liquidação directa ou split autorizado.
- O modelo `Payment` tem relações a `Order` e `SpaceBooking`, mas não a `FreightRequest`.

**Conclusão:** o despacho está correctamente bloqueado sem confirmação financeira, mas não existe ainda um caminho financeiro legítimo que possa desbloqueá-lo. Não preencher `paidAt` por acção do browser, comprovativo, painel administrativo ou webhook não verificado.

## 2. Fluxo alvo

1. Cliente aceita uma cotação ainda válida.
2. MARKA verifica que o pedido continua em `AWAITING_PAYMENT` e cria uma reserva temporária de capacidade/beneficiário, sem atribuir definitivamente um prestador.
3. O sistema cria uma intenção de pagamento associada ao pedido e ao beneficiário identificado. A intenção inclui referência idempotente, montante, moeda e expiração.
4. O PSP recebe instruções de liquidação directa ao prestador, ou split settlement contratualmente aprovado que credite o prestador e a comissão MARKA separadamente.
5. O webhook é apenas um sinal. O servidor consulta a transacção no PSP e valida estado final, referência, montante, moeda e beneficiário.
6. Numa transacção de base de dados, o sistema regista o evento idempotente, confirma o pagamento e avança o pedido para `PAID` / `SEARCHING_PROVIDER`.
7. Só então o pedido aparece no despacho. O prestador aceita com as verificações de GPS, compatibilidade e capacidade já definidas.
8. Falha, expiração, cancelamento ou reversão libertam a reserva e não publicam o pedido aos prestadores.

## 3. Contrato de domínio a implementar após aprovação do PSP

A implementação deve suportar uma referência de negócio explícita a `FreightRequest`, sem criar uma `Order` fictícia. O registo financeiro deve guardar, no mínimo:

- `freightRequestId` e `requesterId`;
- identificador do beneficiário e estado de KYC/elegibilidade;
- PSP, identificador externo e referência idempotente;
- montante, moeda, comissão MARKA e modelo de liquidação;
- estado interno, expiração, timestamps de confirmação e reconciliação;
- referência ao evento de webhook e resultado da consulta server-side.

A relação a `FreightRequest` deve ser única para impedir intenções activas concorrentes. Se forem permitidas tentativas após falha/expiração, a unicidade deve ser aplicada à tentativa activa através de uma entidade de tentativas, não por uma relação única que bloqueie para sempre novas cobranças.

## 4. Regras de segurança e consistência

- Nunca aceitar confirmação do cliente, redirect, screenshot ou comprovativo como prova de pagamento.
- Webhook duplicado, atrasado ou fora de ordem não pode duplicar comissão, liquidação, despacho ou evento financeiro.
- Um evento de sucesso só é aceite após consulta autenticada ao PSP e comparação exacta de referência, montante, moeda e beneficiário.
- Eventos de falha atrasados nunca podem rebaixar um pagamento já confirmado.
- Não permitir que administradores marquem manualmente um pedido como pago.
- Não expor credenciais do PSP no browser nem guardar segredos em metadados públicos.
- Reembolso e reversão exigem operação suportada pelo PSP e reconciliação; não simular reembolso alterando apenas o estado local.
- O pedido não pode passar a `SEARCHING_PROVIDER` se o PSP não garantir liquidação directa/split autorizado ao beneficiário.
- A comissão MARKA deve ser receita própria e separada; não criar carteira ou saldo de vendedor na MARKA.

## 5. Critérios de aceitação

- Pedido sem cotação aceite não pode gerar pagamento.
- Cotação expirada não pode gerar pagamento.
- Uma referência não pode pagar dois pedidos.
- Montante, moeda, referência ou beneficiário divergentes são rejeitados e auditados.
- Duas notificações iguais produzem uma única confirmação.
- Pagamento confirmado após cancelamento/expiração entra em reconciliação, não em despacho automático.
- Falha de pagamento não expõe o pedido aos prestadores.
- Pedido pago só é despachado uma vez; a aceitação continua protegida por transacção e lock.
- Testes cobrem sucesso, falha, expiração, repetição, concorrência, reversão e mismatch de beneficiário.

## 6. Bloqueio externo

A integração permanece bloqueada até existir confirmação escrita do PSP/banco sobre:
1. subcomerciantes ou liquidação directa por prestador;
2. split settlement e método de cobrança da comissão MARKA;
3. elegibilidade e KYC dos prestadores;
4. taxas, prazos, limites, chargebacks, reembolsos e sandbox;
5. autorização contratual e regulatória em Angola.

Até essa aprovação, manter a cotação e a decisão do cliente, mas não apresentar um botão de pagamento funcional nem permitir despacho.