# MARKA — Expansão do ecossistema económico

## Direção de produto

MARKA mantém uma conta, reputação, verificação, mensagens, notificações e camada de segurança partilhadas. As experiências de produto permanecem separadas para não misturar fluxos B2C, B2B, profissionais regulados e mobilidade.

## 1. MARKA Professionals

Categorias iniciais:
- Saúde: medicina geral e familiar, pediatria, enfermagem e especialidades.
- Psicologia: psicologia clínica, familiar e aconselhamento.
- Direito: família, empresarial, laboral, imobiliário e fiscal.
- Contabilidade: contabilidade certificada, fiscalidade, auditoria e processamento salarial.
- Engenharia e arquitetura: civil, elétrica, mecânica, ambiental, projetos e fiscalização.
- Tecnologia: desenvolvimento, infraestrutura, cibersegurança, dados e IA.
- Recursos humanos: recrutamento, formação e consultoria laboral.
- Educação: explicações, tutoria, línguas e formação profissional.
- Serviços técnicos: eletricidade, canalização, climatização, manutenção e reparação.
- Consultoria empresarial: gestão, estratégia, processos e transformação.

Fluxos necessários: perfil profissional, prova de identidade, credenciais e validade, âmbito geográfico, disponibilidade, pedido de serviço, propostas, agendamento, contrato, faturação/pagamento, avaliação e reclamação. Contratos recorrentes devem suportar periodicidade, duração, renovações, cancelamento, SLA e histórico.

Controlo regulatório: não atribuir selo de profissional certificado sem validação junto da Ordem/entidade competente. Saúde, psicologia e direito exigem regras específicas de publicidade, consentimento, confidencialidade, proteção de dados e limites de atuação. A MARKA é infraestrutura de descoberta e contratação, não substitui o regulador nem a relação profissional-cliente.

## 2. MARKA Global Trade

Módulos: diretório KYB, catálogos B2B, país de origem/destino, RFQ, propostas, negociação, contratos, documentação comercial, Incoterms, logística, despachantes, seguro de carga e rastreabilidade.

Categorias: agricultura e agroindústria, alimentos processados, café, mel, carvão vegetal legalmente certificado, madeira legal, minerais licenciados, materiais de construção, maquinaria, embalagem, têxteis e serviços de exportação/importação.

Controlos: validação KYB, beneficiário efetivo, origem e licenças, sanções, documentação aduaneira, regras ambientais, prevenção de fraude e trilho de auditoria. Produtos de risco elevado não podem ser publicados sem verificação reforçada.

Parcerias a desenvolver: câmaras de comércio bilaterais, associações empresariais, agências de investimento e promoção das exportações, operadores logísticos, bancos e seguradoras.

## 3. MARKA Tourism & Investment

Módulos: destinos, alojamento, operadores e guias, experiências, transfers, circuitos, reservas, avaliações, atendimento ao visitante, oportunidades de investimento e diretório de projetos locais.

Prioridade de conteúdo: informação verificável, preços e disponibilidade provenientes do operador, licenças aplicáveis, políticas de cancelamento, contactos de emergência e suporte multilingue. Não publicar inventário ou disponibilidade fictícios.

## 4. MARKA Business

Módulos: diretório empresarial, oportunidades de parceria, representação comercial, distribuição, franquias, aquisição/venda de empresas, projetos de investimento, concursos e pedidos de fornecimento.

Exigir KYB, identidade dos representantes, prova de mandato, divulgação de riscos e revisão jurídica antes de qualquer intermediação financeira ou promessa de retorno.

## 5. Mobilidade — três espaços operacionais

- Passageiro: `/app/mobility` — mapa, origem/destino, táxi e mototáxi, pedido e acompanhamento.
- Motorista: `/app/driver` — onboarding, disponibilidade, aceitação/recusa, navegação, viagem e histórico.
- Administração: `/app/mobility/admin` — despacho, mapa operacional, motoristas, corridas, tarifas, incidentes, auditoria e liquidação.

A interface de passageiro não deve expor o centro de controlo. A interface de motorista não deve expor ferramentas administrativas. A autorização tem de ser aplicada no servidor e em cada endpoint, não apenas por ocultação de links.

## Sequência de execução recomendada

1. Consolidar os três espaços de Mobility e validar permissões de API.
2. Professionals: começar por contabilidade, direito e serviços técnicos; saúde/psicologia só após desenho de compliance e validação regulatória.
3. Global Trade: lançar primeiro diretório KYB e RFQ; depois contratos, documentos e logística.
4. Tourism: começar com diretório verificado de operadores, alojamentos e experiências; ativar reservas apenas com disponibilidade real.
5. Business & Investment: lançar oportunidades verificadas e parcerias institucionais após revisão legal.

## Critérios de aceitação

- Nenhuma listagem, credencial, reserva, disponibilidade, preço ou contrato fictício.
- Consentimento e trilho de auditoria em contratos e partilha de dados.
- Autorização server-side e testes negativos para todos os papéis.
- Taxonomia administrável e internacionalizável, sem duplicar categorias.
- Métricas de conversão, qualidade dos fornecedores, disputas e fraude.
