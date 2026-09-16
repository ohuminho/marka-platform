# MARKA structural-completion baseline

## Verified repository baseline

The repository is a public Next.js 16.3.4 / React 19 / TypeScript project with Prisma 6.19.3 and PostgreSQL configured in `prisma/schema.prisma`. It contains 119 commits and the current main branch includes a 47-model Prisma schema with identity, tenancy, organizations, vendors, stores, catalog, carts, orders, finance, security, audit, automation and mobility foundations.

The codebase already contains several implemented services, especially accounts, checkout, orders, payments, wallet, transactions, vendors, mobility drivers and mobility vehicles. It also contains a large set of domain folders whose current files are mostly type definitions rather than complete ports, policies, state machines, adapters or orchestration boundaries.

## Alignment with the brief

| Brief area | Current evidence | Gap to complete |
|---|---|---|
| Commerce, stores and catalog | Marketplace/module type folders, Prisma Vendor/Store/Category/Product/Inventory models, cart and product services | Missing coherent commerce/store/catalog domain contracts, lifecycle/event abstractions and policy boundaries |
| Restaurant / food commerce | No dedicated restaurant or menu domain found in the inspected tree | Add structural restaurant/menu/order-preparation contracts without inventing business rules |
| Order, fulfillment and checkout | Order and checkout services exist; logistics types exist | Add explicit fulfillment lifecycle, assignment, preparation, pickup, exceptions and event ports |
| Delivery, courier and dispatch | Delivery/driver/route/tracking types exist; no complete dispatch boundary found | Add reusable delivery/courier/dispatch structural contracts and state/event abstractions |
| Mobility | Prisma mobility models and mobility services/state machines exist | Preserve current mobility; add only missing shared dispatch and scheduled-transport structural boundaries |
| Freight and logistics | Logistics engine has delivery, drivers, routes and tracking type folders | Add dedicated freight, contracting, carrier and cargo structural domains rather than reusing passenger mobility concepts |
| Vehicle marketplace | No dedicated vehicle sales/rental marketplace domain found | Add structural vehicle listing, rental, booking, contract and inspection-reference contracts |
| Equipment marketplace | No dedicated equipment marketplace domain found | Add structural equipment listing/rental/booking/contracts |
| Cross-cutting readiness | Security, audit, observability, localization, finance and infrastructure folders exist | Add common domain-event, policy, idempotency and boundary conventions only where missing |

## Constraints to preserve

No unrelated redesign, framework migration, fake business logic, unnecessary dependency, duplicate concept or arbitrary policy should be introduced. The additions should be explicit interfaces, types, lifecycle contracts, event contracts, policy ports and structural module boundaries that can be implemented later when business rules are approved.

## Verification baseline

The repository dependency install was started but did not complete within the sandbox wait window and was stopped after several intervals. The implementation should be verified with `npm ci`, `npm run lint`, `npm run test:unit` and `npm run build` after the structural changes are made.
