# UK EXIM ERP – Stage 1 Database Foundation

**Status:** Stage 1A local PostgreSQL foundation and synthetic integration verification completed. The ERP remains LocalStorage-based; no production or cloud integration is active.
**Implementation baseline:** `f7c0f7e5aa19426d152067db4ec8508bf41fcfed` on `codex/loose-haldi-stock-cutover`.
**Purpose:** Establish a local-only PostgreSQL schema/migration foundation and a server-only connection boundary without changing the working LocalStorage ERP.

The Stage 0 documents identify `8eba53d2a76b68f9da6780b75b1f0e8449b97738` as their source snapshot. A repository diff from that commit through the current implementation baseline showed no changes under `app/` or `package.json`; this Stage 1 implementation is based on the newer checkout and the installed dependency manifest was checked directly.

## 1. Technology decision

- PostgreSQL is the target relational database because the Stage 0 proposal needs foreign keys, transactions, decimal numeric values, and a separate stock baseline plus movement ledger.
- A server-only DAL is the intended Next.js App Router boundary. This follows the installed Next.js 16 data-security guidance: isolate privileged data access, keep database code out of Client Components, and do not pass raw database records to the client.
- Prisma was evaluated. The current recommended Prisma 7 PostgreSQL setup requires the Prisma CLI/client and a PostgreSQL driver adapter. npm registry access stalled twice and left an incomplete local CLI tree. To avoid shipping a broken ORM install or blocking the foundation, this implementation uses the already-resolved `pg` driver and a small SQL migration runner. This is an explicit Stage 1 alternative, not a claim that Prisma is unsuitable in general.
- No ORM has been selected as a permanent production standard. Revisit Prisma once package resolution is reliable and before expanding the model or implementing business persistence.

## 2. Database boundary

The connection factory in `app/lib/db/pool.ts` is server-only and lazy. It requires `DATABASE_URL` to point to loopback and the exact database name `uk_exim_erp_dev`; other hosts and database names are rejected. The migration CLI has the same target restriction and refuses to run with `NODE_ENV=production`. The synthetic integration script accepts only a loopback database named `uk_exim_erp_test` through `TEST_DATABASE_URL`.

The ERP UI does not import this DAL, and no API Route Handler or Server Action was added. No LocalStorage records, current stock rows, historical transactions, or export records are read or written. No credentials are in the repository; `.env.example` contains placeholders only.

## 3. Initial schema boundary

`db/migrations/001_initial_foundation.sql` is a development schema migration covering:

- `companies` as the ownership root;
- products, customers, suppliers, purchase and sales headers/items;
- `stock_baselines`, represented separately from transactions;
- post-cutover `stock_movement_transactions` and `stock_movements`.

The business entity primary keys remain text where source IDs are text. Company IDs are UUIDs and `company_id` is required on company-owned entities. Product prices, costs, quantities, and transaction numbers use PostgreSQL `numeric` without a declared scale so this proposal does not impose a rounding policy. Product/document code uniqueness is not enforced because its scope remains unresolved. Product/customer/supplier references on transaction snapshots remain text rather than inferred foreign keys.

The baseline table rejects update/delete statements. The movement table has one transaction identity per company/type/source transaction, giving the future posting service an idempotency constraint. Ledger timestamps earlier than `2026-11-05T18:30:00Z` (06-11-2026 00:00 IST) are rejected. The schema does not calculate stock or encode P0001–P0007 mapping logic. Future posting must update business records and movement rows inside one PostgreSQL transaction; this foundation is not wired to existing posting code.

The customer/supplier header tables retain a JSONB source snapshot because this first migration intentionally avoids guessing nullable and optional field behavior. Export tables, authentication, memberships, roles, settings, backups, audit logs, document numbering, currency precision policy, and migration/import jobs are deferred for source/owner review.

## 4. Local PostgreSQL setup and migrations

The runner in `scripts/db/migrate-lib.mjs` serializes concurrent migration commands with a PostgreSQL advisory lock, records migration names and SHA-256 checksums, applies each migration transactionally, and refuses to reapply a changed migration. On first use it refuses to initialize a database that already has user tables. Migrations live in `db/migrations/` and use names matching `NNN_description.sql`.

1. PostgreSQL 18.6 was installed locally. The owner-created databases `uk_exim_erp_dev` and `uk_exim_erp_test` were verified empty before migration and used on `127.0.0.1:5432`. The application scripts do not create databases.
2. Local connection settings are loaded from `.env.local` using `DATABASE_URL` for `uk_exim_erp_dev` and `TEST_DATABASE_URL` for `uk_exim_erp_test`. `.env.local` is ignored by Git; secret values are not documented here.
3. `npm run db:check` was verified as a read-only identity check against the development database.
4. `npm run db:migrate` applied `001_initial_foundation.sql` to the development database. A subsequent run reported that migrations were current; the history contains one record with checksum `2cacb641f0274878b6e8e33e9661ef59b5f1d6fae523f5c380ea7d243936f655`.
5. `npm run db:test` applied the same migration to the separate test database, verified repeatability, ran synthetic CRUD and constraint checks in a transaction, and rolled back the fixtures. The timezone-sensitive cutover assertion was corrected to identify the named CHECK constraint and test the timestamp boundary using PostgreSQL timestamp semantics.

No step in this implementation creates a database automatically, imports ERP data, or contacts hosted PostgreSQL. Do not reuse these development commands with production or owner business data.

## 5. Verified implementation and integration results

The following Stage 1A checks completed against the two local databases:

- PostgreSQL identity: version 18.6, `127.0.0.1:5432`; development and test commands were restricted to their respective database names.
- Both databases contain the expected 11 ERP tables plus `_schema_migrations`, 20 indexes and 31 primary-key, foreign-key, unique and check constraints.
- Development migration repeatability was verified. The history has exactly one `001_initial_foundation.sql` record with the checksum recorded above; all 11 ERP tables remain empty.
- The test database has the same single migration record and checksum. Synthetic create/read/update/delete, numeric precision, company foreign-key, stock baseline immutability, movement uniqueness and cutover-boundary checks passed. Fixture rows were rolled back; all 11 ERP tables remain empty.
- `tests/db-foundation.test.mjs` passed 10/10 tests, including local target guards and UTC/Asia/Calcutta cutover instant equivalence. TypeScript no-emit and targeted Stage 1 ESLint checks passed.
- A read-only isolation check confirmed both database identities, schema counts, migration checksums and empty ERP tables. No real ERP records were imported.

## 6. Pending work and limits

- Authentication is not implemented. Authorization and PostgreSQL row-level security (RLS) are not implemented; foreign keys do not provide tenant access isolation.
- The server-only database DAL is not connected to the ERP UI, API Route Handlers or Server Actions. The ERP continues to use its existing LocalStorage behavior.
- No real ERP data migration has been performed. No production database or cloud service is configured, and no deployment has occurred.
- A production build was not executed during the read-only final review because `next build` writes generated build files. Production build status is therefore unverified.
- The final npm audit reported 19 findings (1 critical, 8 high, 10 moderate), including a critical finding for the installed Next.js 16.2.9. Dependency remediation is pending; do not expose this foundation publicly until the security plan is reviewed and the patched dependency tree is verified.

Stage 1A verifies a local database foundation only. It does not make UK EXIM ERP online or production-ready. Do not connect it to live LocalStorage business data or use it for production until authentication, authorization/RLS, application integration, security remediation, build verification and a separately approved migration plan are complete.
