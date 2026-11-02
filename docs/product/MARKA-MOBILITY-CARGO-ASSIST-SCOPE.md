# MARKA Mobility — Scope de veículos, carga e assistência

**Estado:** especificação funcional aprovada para orientar implementação  
**Âmbito:** táxi, moto-táxi, triciclos de carga, transporte de mercadorias, pronto-socorro e cisternas de água.  
**Fora do âmbito:** marketplace de proprietários à procura de motoristas; aluguer de veículos sem condutor (rent-a-car).

## 1. Princípio de produto

A MARKA não será uma rent-a-car. No transporte de passageiros, o parceiro regista-se como motorista e associa o veículo que efetivamente vai conduzir. O veículo pode pertencer ao motorista ou a terceiro, desde que exista autorização legítima para o utilizar na atividade. Na carga e assistência, o cliente compra um serviço de transporte ou socorro; não aluga o veículo para o conduzir.

Não criar um mercado público para publicar veículos à procura de motoristas nesta fase.

## 2. Categorias de mobilidade de passageiros

- Táxi ligeiro (automóvel).
- Moto-táxi (motociclo elegível e devidamente licenciado).
- Triciclo de passageiros, apenas se a modalidade e o licenciamento local o permitirem.

O onboarding continua centrado no motorista. O motorista regista os dados do veículo utilizado e declara a relação com o proprietário:
- Sou o proprietário; ou
- O veículo pertence a outra pessoa/empresa e tenho autorização para o utilizar.

Documentos mínimos, com revisão proporcional:
- Identificação do motorista e contacto verificado.
- Carta/categoria de condução adequada ao veículo.
- Livrete, título de propriedade ou documento provisório de registo do veículo.
- Se o proprietário for terceiro: declaração de autorização, procuração ou documento equivalente, com identificação do titular e do condutor autorizado.
- Seguro e inspeção/licenças exigíveis para o tipo de serviço e veículo.
- Fotografia do veículo e matrícula legível.

A MARKA deve aceitar submissão digital e revisão operacional simples. Não exigir que o motorista seja proprietário. Não dispensar documentos que sejam legalmente obrigatórios. A ativação operacional só ocorre após validação dos elementos essenciais.

## 3. Categorias de transporte de carga

O cliente solicita transporte de mercadorias de um ponto de recolha para um destino. O parceiro oferece o transporte completo com veículo e motorista; não se oferece aluguer sem condutor.

Categorias configuráveis:
- Triciclo de carga.
- Carrinha/pick-up aberta.
- Carrinha fechada/caixa.
- Camião ligeiro.
- Camião de plataforma/estrado.
- Camião basculante (areia, brita, terra e materiais a granel).
- Camião pesado.
- Cisterna de água.
- Outros veículos especializados, sujeitos a aprovação administrativa.

Cada oferta deve indicar capacidade/peso máximo, dimensões úteis, tipo de carroçaria, área de operação, disponibilidade, preço ou método de cotação, requisitos de carga e documentação aplicável. Para basculantes, registar capacidade em m³/toneladas e tipo de material aceite. Para cisternas, registar capacidade em litros/m³, tipo de água/carga transportada e condições sanitárias/documentais aplicáveis.

Fluxo do cliente: origem, destino, tipo de carga, quantidade/peso/dimensões, fotografias opcionais, requisitos de carga/descarga, cotação, confirmação, pagamento, atribuição do transportador, acompanhamento, prova de recolha e prova de entrega.

## 4. MARKA Assist — pronto-socorro

Serviço de assistência para veículo imobilizado por avaria, acidente ou pneu danificado. O cliente não está a contratar um pneu nem a alugar um veículo: solicita que um prestador se desloque e remova o veículo para o destino escolhido.

Serviços iniciais:
- Reboque/remoção de veículo.
- Recuperação após acidente, quando operacionalmente possível.
- Desempanagem e assistência no local.
- Troca/reparação de pneu e assistência de bateria como serviços adicionais, não como requisito para o reboque.

Fluxo: localização GPS ou endereço manual, tipo de ocorrência, tipo de veículo, fotografias opcionais, destino do reboque, preço/cotação, confirmação e pagamento, confirmação do pagamento pelo servidor/PSP, despacho do prestador, acompanhamento, confirmação de recolha e conclusão.

Regra de pagamento: só emitir despacho normal depois de confirmação de pagamento válida no backend/PSP, nunca apenas com base num estado enviado pelo cliente. Prever cancelamento, reembolso, falha do prestador, ausência de rede e protocolo de segurança para veículo/local perigoso. O pagamento não deve bloquear contactos de emergência ou instruções de segurança.

Prestadores registam tipo de reboque, capacidade máxima, veículos que conseguem transportar, cobertura geográfica, disponibilidade e documentos/seguro aplicáveis. A MARKA não deve despachar um reboque incompatível com o peso/dimensões do veículo assistido.

## 5. Pagamento, despacho e prova

- Preço fixo ou cotação antes da confirmação; qualquer alteração exige aceitação explícita do cliente.
- Estados distintos: pedido, cotação, aguardando pagamento, pago, à procura de prestador, atribuído, a caminho, no local, serviço iniciado, concluído, cancelado, reembolso pendente/concluído e disputa.
- Idempotência de pagamentos e despacho; não criar ordens duplicadas.
- Registar referência PSP, valor, moeda, eventos de estado e auditoria.
- Para carga: prova de recolha e entrega, com hora, localização e confirmação do cliente; fotos quando necessário.
- Para assistência: prova de chegada, estado do veículo e destino de remoção.
- Avaliação bilateral e canal de reclamação.

## 6. Elegibilidade e segurança sem burocracia excessiva

Adotar onboarding digital simples, inspirado nas práticas públicas de operadores presentes em Angola: identidade, carta, documentos do veículo, fotografia e autorização quando o veículo pertence a terceiro. A Heetch Angola publica expressamente a exigência de procuração/declaração quando o titular é outra pessoa; a Yango documenta critérios de elegibilidade do veículo e foi noticiada a cooperação com o CISP para verificação de identidade documental, carta, registo criminal e documentos do veículo.

A MARKA deve:
- Permitir veículo próprio ou atribuído/autorizado.
- Pedir autorização do titular apenas quando aplicável.
- Verificar adequação da categoria da carta ao veículo.
- Validar matrícula, titularidade/autorização e validade documental.
- Fazer vistoria presencial ou remota adicional apenas quando o risco/categoria o justificar.
- Não pedir registo criminal indiscriminadamente sem base legal, operacional ou exigência de autoridade/operador; quando exigido, explicar a finalidade.
- Manter documentos privados, acesso restrito, prazo de retenção e trilho de auditoria.
- Distinguir “documento submetido”, “em análise” e “verificado”; nunca mostrar selo de verificação antes da revisão.

## 7. Fora do âmbito e decisões técnicas

- Não construir agora fluxo de proprietário que publica veículo para encontrar motorista.
- Não construir aluguer de veículo sem condutor.
- Não alterar ledger, carteiras, liquidação ou motor de despacho de viagens existente sem auditoria e necessidade comprovada.
- Reutilizar infraestrutura existente de utilizadores, pagamentos, localização, notificações, dispatch e suporte sempre que adequado.
- Carga e Assist devem ser serviços distintos de Mobility Ride, com modelos de pedido/estados próprios ou extensão segura dos motores de fulfillment/dispatch existentes; não misturar uma ordem de reboque com uma viagem de passageiro.
- Antes de migration, mapear enums, modelos, endpoints, permissões, pricing, PSP/webhooks, estados e UI já existentes para evitar duplicação.

## 8. Verificações legais antes de ativação comercial

Confirmar com assessoria local e autoridades competentes os requisitos atuais de transporte remunerado de passageiros por automóvel, moto-táxi, transporte rodoviário de mercadorias, veículos basculantes e cisternas. O Conselho de Ministros anunciou em 27-10-2026 a aprovação de regulamentação para transporte de passageiros por plataformas digitais; confirmar publicação oficial, texto integral, entrada em vigor e disposições transitórias antes de fechar regras definitivas. Esta especificação não substitui parecer jurídico nem licenças obrigatórias.

## 9. Critérios de aceitação

1. Motorista consegue registar táxi ou moto-táxi próprio ou autorizado por terceiro.
2. A relação com o titular fica registada e a autorização é pedida apenas quando necessária.
3. Não existe publicação pública de veículo à procura de motorista.
4. Cliente consegue pedir transporte de carga por categorias de veículos adequadas, incluindo triciclo de carga, carrinha, basculante, camião e cisterna.
5. Cliente consegue pedir pronto-socorro para remoção do veículo imobilizado.
6. O preço/cotação é aceite antes do pagamento e o despacho depende de confirmação de pagamento no servidor.
7. Existem estados, acompanhamento, prova de serviço, cancelamento, reembolso e reclamação.
8. Categorias e requisitos são configuráveis; não ficam hardcoded em vários componentes.
9. Não há alterações ao ledger financeiro ou ao dispatch de passageiros sem testes de regressão.
