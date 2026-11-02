# MARKA — Salas, espaços e reservas por período

**Estado:** especificação de produto e execução  
**Âmbito:** Marketplace existente; sem aplicação, loja ou vertical paralela.  
**Princípio:** o proprietário publica e gere o seu espaço; a MARKA fornece descoberta, disponibilidade, pedido, comunicação, pagamento integrado e registo da reserva.

## 1. Experiência do cliente

1. No Marketplace, filtrar por **Salas e espaços** e escolher sala de reuniões, conferências, formação, coworking ou outro espaço.
2. Ver cartões com fotografias, vídeo/visita virtual, localização aproximada, preço e unidade de cobrança.
3. Abrir o anúncio e consultar capacidade máxima sentada e em pé, configuração da sala, área, acessibilidade, casas de banho, estacionamento, equipamento, serviços, regras e horários.
4. Selecionar data, hora de início e fim, número de participantes e extras.
5. Consultar disponibilidade real. Nunca apresentar uma data como livre se a consulta falhar ou estiver desatualizada.
6. Escolher reserva imediata (só se o proprietário ativou confirmação automática e o calendário foi bloqueado atomicamente) ou pedir disponibilidade quando o proprietário precisa de aprovar ou enviar proposta.
7. Trocar mensagens na conversa MARKA associada ao espaço e ao pedido.
8. Antes de pagar, ver preço total, unidade (hora/meio-dia/dia), extras, caução se aplicável, comissão MARKA, impostos/taxas, regras e cancelamento.
9. Pagar através do checkout/PSP existente. A reserva só fica paga/confirmada após confirmação server-side do PSP/webhook; nunca confiar num redirect nem num comprovativo carregado pelo cliente.
10. Receber confirmação, referência, instruções e recibo; gerir alteração/cancelamento e consultar histórico.

## 2. Experiência do proprietário

- Definir capacidade, layouts, equipamentos, serviços incluídos, preço por hora/meio-dia/dia e duração mínima/máxima.
- Definir horário semanal, feriados/exceções, antecedência mínima, intervalo de preparação/limpeza e prazo máximo de reserva.
- Marcar períodos ocupados/bloqueados e gerir pedidos.
- Escolher confirmação manual ou automática; confirmação automática exige calendário atualizado e regras completas.
- Receber pedido com datas, duração, participantes e mensagem; aceitar, recusar ou propor alteração.
- Consultar reservas, pagamentos e estado de liquidação no painel existente do vendedor.
- O proprietário é responsável pela legitimidade do espaço, capacidade, segurança, licenças, condições e execução do serviço.

## 3. Modelo de disponibilidade e integridade

Não usar o campo de stock de produto como calendário. Uma sala é um recurso temporal.

Entidades de domínio propostas:
- **SpaceBooking:** anúncio, cliente, início/fim UTC, timezone IANA do espaço, participantes, estado, preço e snapshot das condições aceites, referência de pagamento e chave de idempotência.
- **SpaceAvailabilityRule:** dias/horários semanais e timezone.
- **SpaceAvailabilityException:** indisponibilidade/horário especial.
- **SpaceBookingEvent:** histórico imutável de pedido, proposta, aceitação, expiração, pagamento, cancelamento, reembolso e conclusão.

Regras obrigatórias:
- Intervalos semiabertos [startAt, endAt) para permitir reservas consecutivas sem sobreposição.
- Validar endAt > startAt, duração mínima/máxima, horário de funcionamento e antecedência.
- Impedir sobreposição para o mesmo espaço em estados que bloqueiam calendário (PENDING_HOLD, AWAITING_PAYMENT, CONFIRMED).
- Bloqueio temporário de disponibilidade com expiração curta durante o checkout; libertar automaticamente quando expirar ou o pagamento falhar.
- A verificação e criação do bloqueio devem ser atómicas na base de dados (constraint/exclusion ou transação com lock), não apenas um SELECT seguido de INSERT.
- Idempotência em pedido, pagamento, webhook e cancelamento.
- Guardar UTC e timezone IANA; mostrar datas no fuso do espaço e do utilizador com indicação clara.
- Não revelar dados pessoais nem identidade de outros clientes no calendário público; mostrar apenas livre/indisponível.
- Registar auditoria e permitir disputa/revisão humana.

## 4. Estados de reserva

REQUESTED → OWNER_ACCEPTED ou OWNER_DECLINED.  
OWNER_ACCEPTED → PAYMENT_PENDING → CONFIRMED.  
REQUESTED pode receber PROPOSED_CHANGE e exigir nova aceitação do cliente.  
PAYMENT_PENDING → EXPIRED se o pagamento não for confirmado no prazo.  
CONFIRMED → IN_PROGRESS → COMPLETED.  
Cancelamento segue política contratual explícita e pode originar REFUND_PENDING → REFUNDED ou PARTIALLY_REFUNDED.

Não considerar uma mensagem ou aceitação verbal como pagamento. Não considerar reserva paga até confirmação PSP.

## 5. Integração comercial e financeira

- Reutilizar checkout, PaymentService, PSP, webhook, ledger, comissão e refund existentes; não criar carteira ou ledger paralelo.
- O pagamento deve referenciar a reserva e o snapshot de preço. Não colocar a reserva no carrinho normal como se fosse stock unitário.
- Comissão MARKA e valor líquido do proprietário devem ser calculados uma única vez, com idempotência e regras transparentes.
- A política de caução, cancelamento, no-show, danos e reembolso precisa de validação jurídica e apresentação prévia.
- Em falha do PSP, o bloqueio temporário expira e o calendário volta a disponibilizar o período.

## 6. Segurança, confiança e operação

- Cliente e proprietário autenticados; apenas proprietário/operador autorizado gere o seu espaço.
- Limitar frequência de pedidos e evitar enumeração de disponibilidade.
- Validar todos os preços e permissões no servidor; nunca confiar em preço enviado pelo browser.
- Proteger contra dupla reserva por concorrência, repetição de pedidos e webhooks duplicados.
- Não publicar morada exata antes do momento adequado, se o proprietário optar por endereço privado; indicar zona/localização aproximada antes da confirmação.
- Termos, privacidade, responsabilidade, cancelamento, caução e enquadramento da intermediação imobiliária/serviços em Angola carecem de revisão por advogado local. Até parecer, não apresentar a MARKA como mediadora imobiliária licenciada; limitar a plataforma ao anúncio e à facilitação tecnológica onde permitido.

## 7. Sequência de implementação

1. Confirmar modelos Prisma, autenticação, migrations e estratégia de deploy; não presumir que a base de dados de produção está migrada.
2. Implementar modelos e migration de reservas/horários com constraints contra sobreposição.
3. Implementar API autenticada de disponibilidade, pedidos, propostas e decisão do proprietário.
4. Construir seletor de calendário e formulário de reserva no detalhe de anúncios de salas/espaços.
5. Integrar pagamento existente com bloqueio temporário, webhook, comissão e reembolso.
6. Construir gestão de calendário e reservas no painel do vendedor.
7. Testar concorrência (duas pessoas pedem o mesmo horário), timezone, expiração, webhook duplicado, pagamento falhado, cancelamento e reembolso.
8. Ativar primeiro em modo controlado; só depois abrir a todos os anúncios elegíveis.

## 8. Critérios de aceitação

- Duas pessoas não conseguem confirmar o mesmo espaço no mesmo intervalo.
- A disponibilidade muda imediatamente após hold/confirm e regressa após expiração/cancelamento elegível.
- O cliente vê preço total e regras antes de pagar.
- Uma reserva não é confirmada por screenshot ou redirect.
- O proprietário consegue gerir calendário e responder sem sair do painel MARKA.
- A comunicação permanece associada ao anúncio/reserva.
- Os fluxos normais de produtos, checkout, Mobility, Delivery e ledger não sofrem regressões.
