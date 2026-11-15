# MARKA CV — Professional Resume Builder

## Product position

MARKA CV is a career tool inside the MARKA ecosystem. It helps job seekers create, edit and export professional CVs. It is a software service, not a recruitment agency and not a promise of employment.

The product must reuse MARKA ID, account security, notifications and the existing payment architecture. Do not create a second identity, wallet or standalone platform.

## Free and Premium tiers

### Free
- Create and edit a CV using a curated set of professional templates.
- Preview the complete document before export.
- Export a readable PDF with a clearly visible but unobtrusive MARKA watermark/brand mark.
- Basic sections: contact details, professional summary, experience, education, skills, languages and references.
- No fabricated experience, qualifications, dates, references or certifications.

### Premium
- Access to the premium template library and advanced layout options.
- Export PDF without MARKA logo or watermark.
- Multiple CV variants for different roles or applications.
- Optional cover-letter templates and tailored profile summaries.
- One-time purchase per export or a clearly described template/access package as the initial monetization model; do not force a subscription.
- Premium export is unlocked only after authoritative server-side payment confirmation. A client redirect or screenshot is not proof of payment.

Prices must be configurable in AOA (Kz), transparent before checkout and not hardcoded into the application. Do not activate paid checkout until the existing MARKA payment gateway is verified end to end and explicitly approved.

## CV editor and document quality

- Mobile-first editor with autosave, explicit save state and recovery after refresh.
- Reorderable sections and optional sections; hide empty sections from the final document.
- Validate email, phone, dates and section lengths without blocking legitimate international formats.
- Provide clean, ATS-readable templates with semantic headings, selectable text, predictable reading order and no essential information embedded only in graphics.
- Support Portuguese first; keep the document model locale-aware for English and French later.
- Preview must match the exported PDF. Test A4 page breaks, long names, long job titles, multiple pages, accented characters and missing optional fields.
- Allow users to download and delete their CV data. Do not make a public CV profile or share a CV by default.

## AI assistance and truthful claims

- AI may help rewrite summaries, describe responsibilities and improve clarity using only facts supplied by the user.
- Show generated suggestions for user review before inserting them.
- Never invent employment history, degrees, certifications, skills, language proficiency, dates or measurable achievements.
- ATS assistance may check structure, keywords supplied by the user and readability; never promise ATS acceptance, an interview or employment.
- Do not send CV content to an external AI provider unless the provider, data handling and user consent are explicitly approved. Prefer the existing MARKA AI/Core boundary.

## Privacy and security

CVs contain personal data. Apply data minimization, private-by-default access, tenant/user authorization, encryption in transit and at rest, secure file delivery and audit logging for sensitive access.
- Do not expose CVs through public URLs or guessable IDs.
- Do not use CV content for advertising, model training or public discovery by default.
- Define retention and deletion behavior before launch; deleting a CV must also address generated exports and stored copies under MARKA control.
- Do not collect identity documents or certificates unless a separate, justified verification flow requires them.

## Architecture and integration

- Reuse MARKA ID and existing user profile data only with user consent; allow users to correct every imported field.
- Keep CV document data in a dedicated domain model rather than overloading Marketplace Product or Order records.
- Keep template metadata/versioning separate from user CV content.
- Represent Free/Premium entitlements explicitly and verify them server-side.
- Generate PDF deterministically from a versioned template; watermarking must be applied by the trusted export pipeline, not by hiding a logo in the editor UI.
- Record payment references and entitlement state, not unnecessary payment credentials.

## Release sequence

1. Product discovery entry and category: **Carreira e currículos**.
2. Free editor, template preview, autosave and watermarked PDF export.
3. Automated PDF visual/regression tests and privacy/access-control tests.
4. Premium templates and watermark-free export behind a server-side entitlement gate.
5. Paid unlock only after HappyPay or the approved existing gateway passes sandbox and end-to-end verification.
6. AI assistance only after privacy review, cost controls and explicit user-facing consent.

## Release boundary

This specification and category discovery do not implement the CV editor, PDF generation, AI writing, premium entitlements or payments. They do not authorize a paid service, external provider, production migration or production deployment. Implement each stage in a separate, tested change while preserving existing MARKA functionality.
