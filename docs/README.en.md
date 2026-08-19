# Nexo Collections — English guide

Nexo is a modular collections, route, sales, order, and inventory platform. The product catalog is industry-neutral, so it works for blankets as well as other retail businesses.

## Applications

- `back`: Node.js, Express, TypeScript, Prisma, and PostgreSQL API.
- `front`: responsive Next.js/Tailwind admin portal with light/dark themes and Spanish/English UI.
- `movil`: Expo/React Native app with an encrypted offline route database and idempotent synchronization.

## Setup

```bash
cp .env.example .env
cp .env.example back/.env
cp front/.env.example front/.env.local
cp movil/.env.example movil/.env
npm install
npm run db:start:local
npm run db:migrate
# Set explicit SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD values in .env first.
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Start mobile development with `npm run dev:movil`. Use a development build for SQLCipher; Expo Go does not include this custom native option.

There are no built-in administrator credentials. Set an explicit `SEED_ADMIN_EMAIL` and a random 16+ character `SEED_ADMIN_PASSWORD` containing upper/lowercase letters, a number, and a symbol. The seed fails closed when either value is missing, weak, or matches a known example, and the resulting administrator must change it before accessing operational data.

## Domain behavior

- Confirmed sales decrease inventory; purchases increase it.
- Customer card numbers are entered manually by an administrator, accountant, seller, or field collector when outstanding credit is opened; Nexo never generates them and clears them after payoff.
- Each credit sale owns its payment schedule; terms do not belong to the customer record.
- Payments settle the oldest installments first and trigger a fresh risk assessment.
- New orders can only reference active registered products; names and prices are filled from the catalog.
- Orders do not affect balance or inventory until delivery creates a sale.
- Product deactivation is non-destructive: completed sales retain historical name, SKU, brand, cost, price, payment schedule, and payments.
- Customer lookup supports name, phone, address, card number, or location; location selectors support name or state.
- Every new route requires an assigned collector. Legacy unassigned routes remain unavailable to collection users until an administrator assigns them. API row filters restrict collectors to their routes and customers, including extraordinary collection searches.
- Mobile visits, payments, sales, and deliveries remain encrypted in a per-user ledger chained with HMAC-SHA-512. The server verifies each operation, the batch signature, sequence, and continuity from its stored per-device anchor. Stable operation IDs ensure retries never duplicate balances, sales, or stock movements.
- Catalog prices are resolved by the server. Only administrators may authorize overrides or discounts, and no sale may go below recorded cost.
- Refunds record the accounting/administrative authorizer separately from the administrator or collector whose cash drawer pays the money. That operator's daily ledger is locked and charged, so an approved refund cannot bypass a signed close.
- Destructive restore tests query PostgreSQL `current_database()` and proceed only when the connected database name ends exactly in `_restore_test`; text elsewhere in the URL is never accepted as proof.
- The temporary bootstrap password cannot access operational data until it is replaced with a 12+ character password containing upper/lowercase letters, a number, and a symbol.

## Role-aware access

All five roles can sign in. Administrators can use every module; accounting receives financial and read-oriented tools; sellers capture customers, orders, sales, and active cards without seeing purchase costs; warehouse users open inventory and order fulfillment; collectors open routes, field sales, delivery, and encrypted synchronization. Web and mobile navigation guards reject direct links outside the user's role, while the API independently authorizes every sensitive action.

Read the Spanish architecture, security, API, and operations documents for the canonical engineering detail. The source uses descriptive Spanish identifiers consistently so new team members can trace business language directly into code.

## Architecture governance

Current choices are not undocumented shortcuts. [Architecture decisions](DECISIONES_ARQUITECTURA.md) record the context, rationale, accepted consequences, invariants, and measurable trigger for replacing each major decision. [Technical debt](DEUDA_TECNICA.md) records priority, risk, current containment, accountable role, trigger, and objective exit evidence. Both registries are validated by automated tests so architecture changes remain intentional as the data model grows.
