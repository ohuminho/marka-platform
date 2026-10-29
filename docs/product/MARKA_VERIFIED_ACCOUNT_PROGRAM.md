# MARKA Verified Account Program — Product and Trust Specification

**Status:** Product specification; not yet a live paid product.
**Scope:** MARKA consumer accounts and public Marketplace identity surfaces. This is separate from driver onboarding (KYD) and business verification (KYB).

## 1. Recommendation

Use a **recurring subscription** for the public MARKA Verified badge, with monthly and annual options. Do not sell a permanent one-time badge.

Identity review and the paid badge are different controls:

- **KYC identity review:** establishes that the person behind the account has been reviewed. It is evidence-based, may require document expiry/re-review, and must not be bypassed by payment.
- **MARKA Verified subscription:** pays for the active public badge and its associated trust/support benefits. The badge is displayed only when KYC is approved, the subscription is active, and the account is in good standing.

A paid subscription must never turn a pending, rejected, expired, or suspended KYC profile into a verified identity.

## 2. Badge and account states

| KYC state | Subscription | Public badge |
| --- | --- | --- |
| Not started / pending / in review | Any | No verified check; show application state only to the account owner |
| Rejected / expired / suspended | Active | No verified check; suspend badge and explain next step privately |
| Verified and unexpired | Inactive / cancelled / expired | No paid badge |
| Verified and unexpired | Active and paid/comped | Show verified check beside the display name |
| Verified and unexpired | Payment grace period | Keep badge only during a short, clearly defined grace period |
| Account suspended or high-risk lock | Any | Hide badge while the account is restricted |

The check must be a server-derived state. It must never be set by a client request, profile text, vendor self-service field, or a user-editable boolean.

## 3. Suggested commercial packaging

- **Monthly subscription:** accessible entry price, automatically renewed only with clear consent.
- **Annual subscription:** discounted relative to twelve monthly payments.
- **Founder entitlement:** the founder account may receive a complimentary subscription entitlement. This removes the subscription charge, not the identity review. The same KYC approval and account-good-standing rules apply.
- Do not set prices in code until Angolan payment costs, taxes, consumer terms, chargeback risk, and local willingness-to-pay are reviewed.

Benefits should be explicit and operationally deliverable: visible verification check, stronger impersonation reporting, priority account-support queue, and a clear verification-status page. Do not promise reach, sales, ranking, or guaranteed protection.

## 4. Reuse existing MARKA compliance infrastructure

The repository already has the Compliance layer with KYC, KYD, and KYB profiles and review states. Reuse it; do not create a competing KYC database.

The public badge predicate should be equivalent to:

1. KYC profile belongs to the authenticated user and has no organization scope.
2. KYC status is `VERIFIED`.
3. `expiresAt` is null or in the future.
4. Account is active and not restricted.
5. MARKA Verified entitlement is active (paid or explicitly comped).

KYC document references, IDs, review notes, and rejection reasons must never be exposed on public profiles.

## 5. Implementation sequence

1. **Trust baseline:** confirm KYC review and expiry handling; add audit events for decisions and badge changes.
2. **Billing entitlement:** add a subscription/entitlement record using the existing payment infrastructure; persist provider subscription IDs, status, plan, current period, cancellation and grace-period dates. Never trust a client-side payment-success redirect.
3. **Server-derived badge:** create one shared badge component and one server-side status resolver used by Marketplace profile cards, seller/store pages, account header, and other public name surfaces.
4. **Owner/founder account:** create a comped entitlement after the owner account is identified, but show the verified check only after an authorized KYC reviewer has approved the identity. Do not mark the account verified merely because it owns the platform.
5. **Self-service:** pricing/benefits page, checkout, renewal/cancellation controls, invoices/receipts, and clear status messages.
6. **Operations:** admin review queue, audit log, abuse/impersonation reports, renewal failure notifications, and suspension/revocation path.
7. **Launch gates:** payment webhook tests, expiry tests, KYC rejection tests, subscription cancellation tests, permission tests, and public/private data-leak checks.

## 6. UX direction

Use a small, crisp blue verification check immediately after the display name, with an accessible tooltip such as “Identidade verificada pela MARKA”. Keep the subscription/renewal details private in account settings. The visual badge must be recognizable but restrained and consistent across Marketplace, account profiles, and seller surfaces.

Do not use a gold “founder” ornament as a substitute for the blue verified check. If a founder marker is desired, label it separately as “Fundador MARKA”.

## 7. Safety and launch constraints

- Payment is not identity evidence.
- Email verification is not KYC.
- A profile photo or document upload is not proof of authenticity by itself.
- Reverification is event-driven (document expiry, account changes, credible fraud signals, legal requirements), not an arbitrary recurring identity fee.
- Do not activate the paid badge until subscription state is linked to confirmed billing events.
- Do not manually mark the owner verified until the exact MARKA account is identified and its KYC review is approved.
