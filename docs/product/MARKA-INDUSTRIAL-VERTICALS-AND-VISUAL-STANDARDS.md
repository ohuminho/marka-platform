# MARKA — Industrial Verticals, Vehicle Tracking Roadmap & Visual Standards

**Status:** Product direction / implementation guardrails  
**Scope:** MARKA Marketplace, Mobility, Cargo and future B2B services  
**Principle:** Build revenue-generating workflows around real Angolan business operations; do not turn the first release into a generic ERP.

## 1. Industrial businesses inside MARKA

Industrial companies should be first-class business accounts in the MARKA ecosystem, not a disconnected app. They can create a verified company profile, publish catalogues and capabilities, receive qualified enquiries, issue quotations, accept orders and coordinate delivery through MARKA Cargo/Delivery where relevant.

### Initial industrial categories
- Aluminium and metal transformation: profiles, doors/windows, frames, sheets, fabrication and installation.
- Ceramics and construction finishes: tiles, sanitary ware, bricks, blocks, decorative pieces and large ceramic vessels.
- Furniture, joinery and wood processing.
- Construction materials and aggregates: cement, steel, sand, gravel, blocks and related bulk products.
- Packaging, plastics, paper and printing.
- Food and agro-processing: milling, beverages, oils, packaged foods and agricultural inputs.
- Water production and distribution, with quality/capacity information and appropriate compliance.
- Industrial maintenance, equipment, spare parts and technical services.

Categories are configurable. Avoid hard-coding a closed list that prevents new Angolan industries from joining.

### Industrial account workflow
1. Company creates a business account and selects manufacturer, distributor, wholesaler or service provider.
2. MARKA collects proportionate business identity and contact details; verification status is visible and sensitive documents remain private.
3. Company configures locations, operating areas, products/services, units, minimum order quantities, production lead times and fulfilment options.
4. Buyers search, request a quotation or place an order where pricing is sufficiently standardised.
5. Seller confirms availability, price, delivery terms and payment conditions.
6. Cargo/Delivery can be requested as a separate fulfilment service and tracked independently.
7. Both sides receive order milestones, evidence and a dispute/support route.

### Commercial model to validate
- Free basic listing to build supply density.
- Paid professional/company plans for multiple branches, staff seats, catalogue capacity, analytics and CRM tools.
- Qualified lead or quote-response packages for high-value B2B enquiries.
- Transaction/fulfilment fees only where MARKA materially facilitates the transaction or service.
- Sponsored placements clearly labelled as advertising; ranking must not silently favour advertisers.

Do not charge manufacturers merely to exist on the platform before buyer demand is proven. Start with a low-friction listing and monetise workflow value, qualified demand and fulfilment.

## 2. What not to build yet

Do not build a full industrial ERP, accounting suite, inventory ledger or factory production-control system in this phase. Integrate with existing systems later. First validate discovery, RFQ/quotation, order confirmation, delivery and repeat purchase.

## 3. Vehicle-owner GPS visibility — deferred, designed now

Live GPS visibility for a vehicle owner is a valid future capability, but it should not be enabled as unrestricted permanent tracking.

For the first release, keep driver/vehicle association, verification and operational trip tracking within the authorised Mobility workflow. Defer a separate owner tracking dashboard until these controls exist:
- Explicit, revocable consent from the driver and a documented legal basis for location processing.
- Verified owner/authorised representative relationship to the vehicle.
- Visibility only while the vehicle is on an active MARKA job or an explicitly authorised work session; no off-duty tracking.
- Clear in-app indicator that sharing is active, with access history.
- Role-based access, audit logs, short retention and strict separation from passenger identity/payment details.
- Safe handling of lost connectivity, GPS spoofing, device sharing and revoked authorisation.
- A clear policy for leased, financed, company-owned and third-party-authorised vehicles.

The owner should see operational status and an appropriately delayed/limited route view, not unrestricted access to the driver's personal movements. Design this as a future Fleet/Owner portal, not a blocker for current Cargo/Assist delivery.

## 4. Vehicle and product photography standards

All MARKA imagery must look premium, realistic and locally relevant:
- Use clean, high-resolution editorial/product photography with consistent lighting, framing and colour treatment.
- For motorcycles and cargo tricycles, use neutral, unbranded vehicles or MARKA-owned visual assets. No competitor logos, decals, uniforms, watermarks, sponsor graphics or accidental advertising.
- Include a clearly recognisable three-wheel cargo/passenger tricycle where the relevant category requires it; never substitute a watercraft, jet ski or unrelated vehicle.
- Car categories may show premium vehicle classes (for example pickup/SUV, Mercedes or BMW) only where the category genuinely represents those vehicles. Do not imply a brand partnership or inventory that MARKA does not have.
- Brand names may appear as factual vehicle make/model metadata where accurate; do not add promotional slogans or third-party company branding to generic imagery.
- Never use an image that misrepresents vehicle type, capacity, condition, safety equipment or service availability.
- Prefer licensed stock, commissioned photography or generated imagery with no protected logos. Record asset provenance and usage rights.
- Use neutral placeholders only during development; production must not display broken-image icons or unrelated stock imagery.

## 5. Acceptance criteria

- Industrial businesses can be represented as business accounts without creating a separate platform.
- Product discovery, RFQ, quotation, order and Cargo/Delivery fulfilment remain distinct but connected states.
- Industrial verticals are data-driven/configurable.
- Vehicle-owner live tracking remains explicitly out of scope until consent, permissions, retention and audit controls are implemented.
- Vehicle imagery is category-correct, premium and free of third-party promotional branding.

## 6. Catálogo multi-indústria e serviços — extensão do Marketplace existente

Esta expansão NÃO cria um produto separado chamado MARKA Business. O conceito já existente mantém-se: uma conta pode abrir uma loja como pessoa singular/individual ou como empresa. A mesma loja/catálogo suporta revendedor, fabricante, fábrica, distribuidor, grossista, agricultor, cooperativa ou prestador de serviços, através de categorias e atributos adequados. Não duplicar contas, lojas, catálogos, checkout ou sistemas de encomendas.

### Categorias de serviços a disponibilizar no catálogo existente
- Eventos e festas: DJs, organizadores/ produtores de eventos, mestres de cerimónia/apresentadores, músicos, bandas, animadores, artistas e anfitriões.
- Catering e cozinha: cozinheiros e cozinheiras para festas, catering, buffets, preparação de refeições, pastelaria, bolos, salgados, churrasco e equipas de serviço.
- Produção técnica e decoração: aluguer de som, iluminação, palcos, geradores, tendas, cadeiras, mesas, decoração, flores e montagem.
- Fotografia e audiovisual: fotógrafos, videógrafos, transmissão/live streaming, edição e cobertura de eventos.
- Espaços e hospitalidade: salões, quintas, jardins, restaurantes para eventos, alojamento e espaços para conferências.
- Casa e manutenção: eletricistas, canalizadores, carpinteiros, serralheiros, pintores, técnicos de frio/ar condicionado, instaladores solares, limpeza e reparações.
- Beleza e bem-estar: cabeleireiros, barbeiros, maquilhadores, esteticistas, manicures e profissionais de bem-estar.
- Educação e profissionais: explicadores, formadores, tradutores, consultores, contabilistas e serviços administrativos.
- Tecnologia: assistência informática, redes, desenvolvimento de software, instalação e suporte técnico.
- Serviços empresariais: manutenção industrial, segurança quando devidamente licenciada, facilities, recrutamento e apoio operacional.

As categorias são taxonomia de descoberta, não novos módulos. Manter campos comuns simples (especialidade, descrição, preço ou orçamento, disponibilidade, duração, área de serviço, imagens e estado de verificação). Só acrescentar campos específicos quando forem necessários para cotação, elegibilidade ou segurança.

### Imobiliário residencial, comercial e logístico
O tipo de imóvel deve contemplar casas, apartamentos, quartos, terrenos, lojas, escritórios, espaços comerciais, armazéns, armazéns logísticos, centros de distribuição, pavilhões industriais, fábricas, terrenos industriais e agrícolas, quintas, hotéis/pensões e espaços para eventos. Os anúncios continuam a ser publicados na categoria imobiliária existente. A MARKA não compra, aluga, opera nem mantém imóveis ou armazéns próprios.

### Modelo asset-light obrigatório
A MARKA é intermediária tecnológica. Produtos, stock, veículos, motoristas, estafetas, cozinhas, equipamentos, imóveis e instalações pertencem aos parceiros. O parceiro é responsável por disponibilidade, qualidade, licenças, execução, garantias e obrigações fiscais/legais que lhe caibam. A MARKA presta descoberta, comunicação, cotação, checkout quando suportado, coordenação, prova de serviço, suporte e mecanismos de confiança. Não assumir posse, armazenamento, compra antecipada, financiamento ou frota própria como pressuposto do produto.

## 7. Proteção de receita, prevenção de desintermediação e integridade comercial

A política de comunicação já existente deve ser aplicada no servidor, não apenas na interface. Contactos externos e tentativas explícitas de contornar o checkout podem ser bloqueados ou sinalizados de acordo com a categoria e o estado da transação. Não prometer deteção perfeita: imagens, linguagem codificada, chamadas externas e contactos presenciais podem escapar aos filtros automáticos.

### Regras comerciais
1. Cada lead, pedido de orçamento, visita, proposta, reserva, encomenda e transação originados na MARKA recebe um identificador e registo temporal.
2. Antes de iniciar contacto ou visita, as partes aceitam termos claros: não contornar deliberadamente a MARKA para evitar uma comissão previamente apresentada quando a oportunidade foi gerada e materialmente facilitada pela plataforma.
3. A comissão, o evento que a desencadeia, a base de cálculo, o momento de vencimento, impostos e cancelamentos devem ser apresentados antes de a parte aceitar o lead ou serviço. Não criar comissões retroativas ou escondidas.
4. Para negócios de elevado valor (imóveis, contratos B2B, eventos), registar pedido, consentimentos, visitas, propostas, contrapropostas, aceitação e comprovativo de conclusão. Usar confirmação bilateral e evidência documental proporcional.
5. Aplicar uma janela de atribuição limitada e expressa, definida por categoria e revista por assessoria jurídica angolana. A comissão só é devida quando se demonstrar nexo entre a oportunidade introduzida pela MARKA e o negócio concluído, nos termos aceites pelas partes.
6. Disponibilizar denúncia, contestação e revisão humana. Suspensão temporária só com critérios, registo e possibilidade de recurso; não reter valores sem base contratual/legal.
7. Reincidência comprovada pode levar a suspensão/encerramento da conta, cobrança de valores contratualmente devidos e ação judicial ou arbitragem quando aplicável e proporcional.

### Prova e privacidade
- Preservar logs de acesso, IDs de lead, mensagens dentro da plataforma, propostas, alterações, aceitação de termos, pagamentos, recibos, provas de entrega/serviço e decisões de suporte.
- Registar visitas e reuniões apenas com conhecimento das partes. Não gravar chamadas ou recolher localização contínua sem fundamento legal, transparência e consentimento quando exigido.
- Definir retenção por finalidade, acesso restrito, exportação para disputa e cadeia de custódia. Não recolher dados excessivos para tentar provar uma infração.
- Não acusar nem penalizar automaticamente com base em palavras-chave, contacto presencial ou simples ausência de pagamento na plataforma. Exigir análise contextual e oportunidade de resposta.

### Limite jurídico
Os termos devem ser redigidos e validados por advogado habilitado em Angola, considerando regras de comércio eletrónico, proteção de dados, defesa do consumidor, concorrência, intermediação imobiliária, pagamentos, prestação de serviços e processo civil. A MARKA não deve ameaçar genericamente “levar todos ao tribunal”: deve reservar direitos e agir apenas quando exista contrato válido, prova suficiente, dano ou valor devido e fundamento legal. Nenhuma cláusula garante risco zero ou torna automaticamente exigível qualquer multa.

## 8. Sequência de implementação sem duplicar sistemas
1. Expandir a taxonomia e os atributos do formulário atual de loja/anúncio.
2. Reutilizar Vendor, Store, Product, Category, Order, Fulfillment, Dispatch, Messaging, Payments e ledger existentes.
3. Confirmar que serviços e imóveis não ficam incorretamente sujeitos a stock físico: onde o modelo atual exigir stock, usar uma disponibilidade representativa e documentar a limitação antes de abrir reservas automáticas.
4. Depois implementar RFQ/propostas, reservas/visitas e contratos de serviço como estados de negócio ligados ao mesmo catálogo e às mesmas contas.
5. Só introduzir novas tabelas quando a auditoria provar que os modelos atuais não suportam a necessidade; não criar um segundo Business/Marketplace.

