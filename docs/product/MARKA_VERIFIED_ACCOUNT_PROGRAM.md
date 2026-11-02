# MARKA Trust, Verified Accounts and Seller Reputation

**Status:** Approved product direction; implementation must reuse existing compliance and marketplace foundations.
**Scope:** Individual sellers, business sellers, public seller/store profiles, Marketplace discovery and seller performance.

## 1. Core product rule

MARKA is open to individuals and registered businesses. A person must be able to create a seller profile and list an eligible product without first creating a company or joining an organization.

Identity verification is a trust and safety process, not a paid product. Never sell the blue identity check, infer verification from a subscription, or let payment bypass KYC review.

A buyer must see the seller's verification state clearly before deciding to contact or transact.

## 2. Public identity states

- **Identidade verificada** — blue check; identity review approved, current and account in good standing.
- **Verificação em análise** — neutral status only where appropriate; never display a blue check.
- **Ainda não verificada** — clearly state that MARKA has not confirmed the seller's identity.
- **Verificação expirada / suspensa** — remove the check immediately and show the account owner the private next step.

The public badge is derived server-side. It is not a user-editable boolean, profile decoration, vendor approval flag, subscription benefit or client-supplied claim.

Reuse the existing ComplianceProfile and ComplianceDocument models. The public identity predicate must require KYC, the seller's actual user ID, organizationId null for personal identity, status VERIFIED, no expired profile/documents, and an active unrestricted user account. Do not create a second identity database. Never expose document references, ID numbers, private review notes or rejection reasons.

## 3. Listing access and progressive trust

- A new account can create a profile and prepare listings.
- Basic account security checks (verified phone/email where available, rate limits and abuse checks) are required before publishing.
- Unverified sellers may publish eligible low-risk listings with a clear 'Ainda não verificada' label.
- Higher-risk categories and sensitive actions may require identity verification before publication, buyer contact, reservation or transaction. Define this per category using a documented risk matrix; do not impose one blanket restriction on the Marketplace.
- Sellers must see their verification status and next step in their account.
- Fraud reports, identity mismatch, document expiry or material account changes can trigger review or re-verification.
- Provide review, appeal and proportional restriction paths; do not suspend accounts automatically from a single unverified report.

For vehicles, property, high-value goods and regulated services, add relevant ownership/authority and category-specific checks in addition to personal identity. KYC alone does not prove ownership of an item, property title or authority to sell.

## 4. Verification operations

Build a clear account verification area: current status and last review date; required steps and accepted documents; secure document submission; pending/approved/rejected/expired/suspended states; private actionable rejection reason and resubmission; reviewer identity and immutable audit event; expiry reminders; and an admin review queue with role-based access and separation of duties.

Do not claim that identity verification guarantees honesty, product quality, ownership or transaction success. MARKA checked the identity; it does not guarantee the seller.

## 5. Seller reputation and gamification

Reward consistently good service, not vanity metrics or paid popularity.

### Signals

Use reliable, auditable events: completed transactions/services; buyer reviews linked to completed transactions; rating distribution; cancellation/no-show rate with fair attribution; substantiated dispute/refund rate; response time/rate; on-time delivery/service completion where supported; account age and verified identity as trust context, not a substitute for performance.

Do not reward raw views, clicks, followers, paid advertising, self-reviews, review exchanges or transactions designed to manipulate ranking. Detect suspicious patterns and discount or exclude them.

### Reputation levels

- **Novo vendedor** — new account; no performance claim yet.
- **Vendedor ativo** — minimum activity and completed transactions.
- **Vendedor de confiança** — verified identity plus sufficient completed transactions, strong feedback and low substantiated issue rates.
- **Destaque MARKA** — sustained top performance over a rolling period, with minimum sample size and anti-manipulation checks.

Calibrate thresholds from real platform data; do not invent public numerical cut-offs before sufficient volume exists. With too few completed transactions, show 'Dados insuficientes', not a misleading 5-star score.

### Discovery and benefits

Provide buyer filters for identity-verified and top-rated sellers. Organic ranking should balance relevance, location, freshness, availability, transaction quality and reputation. Give a modest earned discovery advantage to sustained high performers, subject to relevance and category fit; never guarantee first position or sales. Clearly label sponsored placements and keep them separate from organic reputation ranking.

Benefits may include a reputation badge, profile insights, eligibility for curated collections, priority support for proven sellers and seller education. Do not promise fee discounts or preferential settlement until economics and legal terms are approved.

## 6. Reviews and fairness

Only a buyer associated with a completed eligible transaction can review. One review per transaction; edits only within a documented window and with history preserved. Sellers may respond but cannot delete legitimate negative reviews. Provide reporting, moderation, evidence review and appeal. Separate product quality, seller conduct and delivery/service quality where supported. Do not punish sellers for buyer cancellations, PSP outages, platform failures or events outside their control. Display rating count and distribution, not only a rounded average.

## 7. Founder and business identity markers

A founder marker, if used, confirms a platform role only. It must be visually distinct from the blue identity check and never substitute for KYC. For business sellers, show a separate KYB state only after the legal entity and representative authority have been reviewed. An individual's verified identity does not automatically verify their company.

## 8. Implementation sequence

1. Audit existing ComplianceProfile/KYC submission, review, expiry and audit APIs.
2. Implement one server-side identity-status resolver and reusable public badge component.
3. Surface status in seller profile, store page, product card and account verification page.
4. Add category risk rules and ownership/authority checks for high-risk listings.
5. Audit completed-order and review infrastructure; implement verified-purchase reviews if missing.
6. Add reputation aggregation from server-side transaction events, with anti-fraud controls and rolling windows.
7. Add seller levels, filters and ranking signals only after event quality and sample-size gates pass.
8. Test privacy, authorization, KYC expiry/revocation, review manipulation, appeals and ranking fairness.

## 9. Non-negotiable safeguards

- Identity verification is not for sale.
- A verified badge means identity review, not a guarantee of the seller or product.
- No public KYC documents or private compliance data.
- No fake reviews, bought rankings or hidden sponsored results.
- No ranking based only on popularity or volume.
- No blanket exclusion of legitimate individual sellers.
- No parallel KYC, wallet, payment or reputation database where an existing domain service can be reused.