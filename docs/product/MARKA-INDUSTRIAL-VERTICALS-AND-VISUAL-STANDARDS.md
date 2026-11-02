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
