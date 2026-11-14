# UK EXIM ERP – Final Go-Live Progress Checkpoint

**Checkpoint date:** 14 November 2026
**Branch:** `codex/uk-exim-owner-login`
**HEAD:** `3b6517f5d32b811c99d22606f46cd5b762e217cc` (no commit created)

This checkpoint records the final go-live work performed in this session. It does not replace prior Stage 2/3 work or claim production readiness.

## Completed in this session

### Native backup and restore

- PostgreSQL 18.6 source verified at `127.0.0.1:5432/uk_exim_erp_dev`.
- The existing native backup/recovery utility created and verified a full DEV backup after transaction and stock imports:
  - File: `C:\Users\ADMIN\Documents\UK-EXIM-ERP-Backups\UK-EXIM-ERP-DEV-20261114T132318Z-1291f8cb.dump`
  - SHA-256: `15D507852D1AE865C83D9C8351E92F4CB7F0DCFECF1F5789916D7047F78248FE`
- Restored into a unique run-owned recovery database, verified identity, row counts, schema object counts, all ten migration checksums, company identity and required relationships, then removed that exact recovery database.
- DEV source writes from backup verification: none.

### Domestic historical transactions

- Original JSON backup SHA-256 matched the approved hash: `A2928CD3E0BDB79CFB64AC264C4E5B0978B40B4BF9071B801A95C2320B8CB7C2`.
- Insert-only transaction import committed atomically to DEV:
  - Purchases: 3 headers / 3 lines.
  - Sales: 88 headers / 92 lines.
  - GST: 6; NON_GST: 82.
  - Completed: 72; Pending: 16.
- Source-to-database header and line reconciliation: zero missing rows and zero mismatches.
- Original source JSON snapshots, IDs, invoice/document numbers, dates, stored tax values and totals were retained. Historical rows are marked `historical_imported`; no historical stock movement was created.
- 37 source Sales did not include `contactPerson`; the required typed column uses an empty value while each original `source_record` preserves the exact omission.
- Purchases date range: 4 June 2025–5 October 2026. Sales date range: 5 June 2025–1 November 2026. The owner confirmed no old-system purchase/sale records from 2–5 November 2026.
- A repeated dry-run after import detected the expected ID/document conflicts and reported `writesPerformed: false`; it would not duplicate the imported rows.

### Stock baseline

- Added and applied migration `010_stock_baseline_provenance_and_effective_date.sql`.
- Recorded exactly two immutable, company-scoped, owner-attested baselines effective `2026-11-06T00:00:00+05:30`:
  - P0006: 79 KG.
  - P0007: 0 KG.
- The records are marked `verification_method='owner_attested'`; they do not claim an independent physical count. The owner-confirmed values were not derived from imported historic transactions.
- The historical Product Master snapshot disagreed (P0006 70 KG; P0007 1 KG); the owner's final Stock Summary values (79 KG / 0 KG) were used. The source discrepancy is retained here as an audit note.
- Stock movement transaction, legacy movement and immutable event counts remain zero. Historical purchases/sales were not double-counted into stock.

### Dashboard accuracy

- Dashboard monthly stock movement now reads verified baselines and company-scoped post-cutover PostgreSQL events. Earlier monthly physical stock movement is shown as unavailable rather than taken from LocalStorage.
- Pending Sales display a record count. Receipt allocations and unpaid balances are not available, so invoice totals are labelled as reference values and are not represented as pending balances.
- Monthly GST and NON_GST sales totals are returned separately.
- Export dashboard counts no longer read browser LocalStorage; they show “Not migrated” until a PostgreSQL Export source is available and authenticity review is complete.

## DEV state verified read-only after import

| Data | Count |
|---|---:|
| Products | 7 |
| Domestic Customers | 39 |
| Suppliers | 1 |
| Purchase headers / lines | 3 / 3 |
| Sales headers / lines | 88 / 92 |
| Stock baselines | 2 |
| Stock movement transactions / legacy movements / immutable events | 0 / 0 / 0 |
| Migration history | 10 applied; all checksums match |

## Verification

- Focused DB-free tests for dashboard summary, domestic transaction validation and owner-attested baseline: **10/10 passed**.
- Actual DEV dashboard DAL query in a read-only transaction: passed; returned supplier count 1, 16 Pending sales records, November stock opening/closing 79 KG, and a separate GST/NON_GST split.
- TypeScript: passed.
- Targeted ESLint: zero errors; two existing Dashboard warnings remain (`<img>` and unused `MonthlyStockGraph`).
- Broader DB-free suite: 128 passed / 2 failed out of 130. The failures are stale assertions in `product-catalog-client.test.mjs` (expects an old provider wrapper) and `windows-erp-runner.test.mjs` (expects an inline `/login` condition while the current proxy delegates to a shared policy). Neither failing test's target file was changed in this session.
- Production build: passed after granting network access for the existing Geist Google Font fetch. No font or typography changes were made.
- `git diff --check`: passed.
- No browser workflow was run in this session.

## Still pending / go-live blockers

- Export PostgreSQL schema, DAL, authenticated APIs, UI integration and legacy migration are not complete. Export source authenticity must be reviewed before operational records are imported; uncertain sample/test-looking records must remain on hold.
- Domestic receipt/payment ledger is absent. The 16 Pending statuses are preserved, but paid amounts and balances are unknown; do not treat invoice totals as receivables.
- Accountant/owner approval is still required for new GST Tax Invoice versus Without GST handling, place of supply, CGST/SGST versus IGST, and export GST/LUT treatment. Historical GST/NON_GST invoice classifications and recorded amounts remain separate and unchanged.
- Company, invoice and bank settings are not verified as PostgreSQL-backed in this checkpoint.
- No fresh authenticated browser verification was performed after these changes.
- No production provider, domain, HTTPS endpoint or authorized production credentials were supplied; nothing was deployed.
- One previously existing database named `uk_exim_erp_recovery_20261114` was found during investigation. It was not created by this session's recovery utility and was not inspected, changed or removed.

## Next checkpoint action

Obtain the accountant-approved tax matrix for domestic GST/NON_GST invoices and place-of-supply treatment before enabling real Sales posting. Then finish Export migration/authenticity review and run an authenticated browser acceptance pass before production deployment preparation.

## Phase 6 source reconciliation – 2026-11-14

This checkpoint records source-only findings. No application code, database schema/data, browser storage, or backup files were changed during this review.

### Export backup inventory

The supplied 12 November backup reports all 11 export record keys present and parseable: Export Customers 66; Enquiries 1; Quotations 2; Proforma Invoices 2; Orders 2; Export Purchases 2; International Export Stock 2; Reservations 2; Packing 1; Shipments 1; Commercial Invoices 1. International Export Settings is present as an object. The two domestic stock movement keys are absent from this backup; that does not establish export history completeness.

The read-only date-field scan found: Enquiry 2026-01-08; Quotations 2026-01-01 through 2026-01-10; Export Purchases and Reservations 2026-09-26 through 2026-10-07; Packing, Shipment, and Commercial Invoice dates on 2026-10-07. The scan did not find date fields for Export Customers, Proforma Invoices, or Export Stock. Therefore the snapshot alone cannot prove a complete date-wise export history or all records were created before the domestic cutover.

A privacy-safe placeholder-word heuristic flagged 4 Export Customer records, 1 Proforma Invoice, 2 Orders, 1 Shipment, and 1 Commercial Invoice for manual review. These are review flags only, not findings that a record is fictitious. Do not import these records into an operational/export ledger until the owner confirms their authenticity and source relationships. Preserve their source backup unchanged.

Export data is still stored by the existing LocalStorage storage helpers. Export Purchases feed separate International Export Stock; reservation/packing/shipment flows reference other export documents. Export forms also still have Product LocalStorage dependencies. A safe integration needs export-specific tables, company-scoped DAL/API, migration mapping retaining each source JSON snapshot and relationships, then UI migration as a coordinated workflow. Domestic customers, transactions and stock must stay separate.

### Settings and settlement findings

`app/components/settings/Settings.tsx` still reads and writes `uk-exim-company-settings`, `uk-exim-invoice-settings`, `uk-exim-bank-settings`, and `uk-exim-international-settings` in browser LocalStorage. The backup contains these keys as settings objects, but their live values were not accessed. Invoice settings are independent from the permanent GST and NON_GST invoice types. Export quotation printing also reads legacy company/international settings. Do not switch the Settings or print UI to an empty PostgreSQL source before a separately verified, secret-redacted transfer plan exists.

No domestic receipt/payment LocalStorage key, PostgreSQL payment ledger, DAL, or API exists. Existing Sales `Completed`/`Pending` and `paymentMode` are not receipts or paid-balance evidence. Do not calculate historic paid/outstanding balances from them. New settlement work needs a separate append-only/voidable receipt and supplier-payment ledger with invoice allocations; legacy imported invoices must remain balance-unverified unless source evidence establishes opening balances.

### Phase 6 status and blockers

- Export PostgreSQL schema/DAL/API/UI and export record import: **not implemented**. Manual authenticity review is required for the heuristic-flagged records and relationships before any operational import.
- PostgreSQL-backed Settings: **not implemented**. Live settings values remain uninspected; migration must preserve them, including sensitive fields, without diagnostic output.
- Customer Receipts/Supplier Payments: **not implemented**. No historical receipts or balances were invented.
- Billing separation remains intact in the current trade schema (`GST` / `NON_GST`). New Sales tax activation remains blocked on the accountant-approved domestic place-of-supply/CGST-SGST-vs-IGST and export LUT/IGST matrix.
- Phase 6 authenticated browser acceptance: **not run** in this review. No TEST fixtures, server, or browser session were started.
- TypeScript, lint, build and database integration results from the prior checkpoint above were not rerun because this source-only reconciliation introduced no application code change.

No DEV or TEST database was connected to, and no business rows were modified. No LocalStorage was accessed. No migration, import, cleanup, commit, or push was performed.

### Recommended next safe action

Have the owner/accountant review the export authenticity flags and approve the export document relationship interpretation, and separately approve the tax matrix. In parallel, prepare migration proposals and synthetic TEST-only integration tests for the export domain, settings, and future settlement ledger. Do not move their UI or DEV data until each source-preserving mapping and TEST workflow is verified.

## Phase 7 implementation checkpoint – 2026-11-14

### Implemented in source (not database-active)

- Added Export schema foundation in migration `011_export_domain_foundation.sql`: separate Export Customers, Export documents, source JSON snapshots, company-scoped document/customer references, and separate Export Stock. Export entities are not mixed with domestic customers, purchases, sales, or stock. Export APIs/DAL are company-scoped and authenticated. New export records can be created/edited; import/review state is represented separately. The owner-review list is in `docs/UK-EXIM-Phase-7-Export-Owner-Review.md`.
- Added company-scoped JSONB Settings schema/API in migration `012_company_settings.sql`. It does not seed defaults or overwrite values. **The Settings UI remains on its existing LocalStorage source** until its existing values are transferred and reconciled safely.
- Added customer receipt and supplier payment ledger schema/API in migration `013_settlement_ledger.sql`, with transaction-scoped allocations, replay keys, immutable entries/one-way void, company-scoped invoice references, and outstanding queries that exclude `historical_imported` invoices. Historical balances remain unverified.
- Added a fail-closed Sales posting guard: until an approved tax policy is supplied, new Sales writes return an explicit conflict. Historical imports are unchanged; GST and NON_GST remain distinct. No tax rates or place-of-supply rules were invented.

### Verification in this checkpoint

- Focused merged DB-free tests: **40/40 passed** (Export, Settings, settlement, trade domain/routes and schema guards).
- TypeScript: passed (`npx tsc --noEmit`).
- Targeted ESLint for Phase 7 and Sales tax-guard files: passed with no findings.
- Production build: passed on Next.js 16.4.5; authenticated Export, Settings, Receipts and Supplier Payments API routes compiled.
- `git diff --check`: passed; Git emitted existing LF/CRLF normalization notices only.
- No TEST or DEV database was connected to; migrations were not applied. No backup import, fixture operation, browser session, or LocalStorage access occurred.

### Still incomplete / not active

- Export screens remain LocalStorage-backed; Export source records were not imported. The flagged IDs/document numbers and source-linked records await owner authenticity/relationship decisions.
- Settings API/schema are present, but Settings UI is not PostgreSQL-integrated and the legacy settings values were not read or migrated.
- Receipts/Payments API/schema are present, but no user-facing register/forms/reports are connected. No receipts, paid amounts, or historical balances were fabricated.
- Export dashboard summaries are not connected to the new Export tables. Existing dashboard reporting remains subject to the prior checkpoint limitations.
- New Sales posting is intentionally blocked until the accountant/owner approves the tax matrix. The Sales transaction integration test harness's tax approval must be synthetic/test-only; it is not a production approval mechanism.
- No PostgreSQL migration execution, TEST database integration, or authenticated browser acceptance was run for these additions. The APIs/schema foundations are therefore **implemented, not database-active or browser-accepted**.
- Production hosting, credentials, domain/HTTPS, deployment, backup automation, and rollback rehearsal remain pending. No commit, push, or deployment was performed.

### Next actions

1. Owner reviews the specific Export review list and approves which source records/relationships are genuine operational history.
2. Accountant/owner signs off the tax matrix in `docs/UK-EXIM-Phase-7-Export-Owner-Review.md`.
3. Build a source-preserving Export/settings importer with collision checks, then test migrations and CRUD on a run-owned disposable TEST database before any DEV operation.
4. Connect Export, Settings, Receipts and Payments UIs to their authenticated APIs, add company-scoped dashboard/report metrics, then perform isolated browser acceptance.
5. Only after test evidence and verified backups, schedule separately approved DEV migration/import work.

## Phase 8 implementation and isolated acceptance – 2026-11-14

### Implemented in source (not DEV-active)

- Export Customer, Export document, Export Stock, Settings, receipt/payment and dashboard summary screens now use their authenticated company-scoped PostgreSQL APIs; these modules have no LocalStorage fallback for operational reads/writes. Export Stock remains read-only because no stock posting API/policy exists.
- Payments UI supports receipt/payment entry, verified invoice selection, partial allocation, register search, allocation display, void action and dashboard summary refresh. Imported historical invoice balances remain excluded.
- Export document/customer data is represented in the source-to-database manifest at `.local-test/phase8-source-to-database-manifest.json` (ignored local test artifact); original backup is unchanged. The manifest contains hashes/IDs/field names/status only, not the full source records. Source review flags remain owner decisions.
- Settings UI saves one category per authenticated API request and reloads persisted PostgreSQL settings. Tax approval checklist retains the permanent GST Tax Invoice / Without GST Invoice distinction and the fail-closed Sales policy.
- Settlement UI now prevents concurrent duplicate submits and reuses one request key for the same payload after an uncertain failure; payload changes receive a new key. A repeated-key API request is rejected by the existing unique constraint and transaction rollback.

### Disposable TEST database and migrations

- A fresh native backup of persistent TEST was integrity-checked with `pg_restore --list`; a run-owned disposable clone was created from persistent TEST and verified against its source snapshot.
- Migrations `009`–`013` were applied only to the current disposable clone. The clone verified 13 migration checksums and the required schema. No DEV migration was applied.
- Synthetic fixtures in the clone: one company, owner/membership, supplier, customer, seven products, two protected synthetic stock baselines, one Purchase and one GST Sale. The browser added one synthetic Export Customer, one Enquiry linked to that customer, one Quotation linked to the Enquiry, one synthetic International settings category, one ₹1 receipt and one ₹1 supplier payment. All are disposable; no legacy export record or DEV business record was imported/changed.
- Browser acceptance at `http://localhost:3002` used the authenticated synthetic owner. Export Customer create/view/edit/search/deactivate/reactivate passed; linked Enquiry and Quotation create/detail passed; Export Stock showed a separate empty PostgreSQL collection and read-only notice. Settings synthetic save/reload passed without changing populated company/bank fields. Receipt and supplier payment each allocated ₹1 to a verified synthetic invoice; register and outstanding balances updated to ₹104 and ₹9.50. Dashboard summary reflected one Export Customer, one Enquiry, ₹1 receipt, ₹1 supplier payment and the updated balances. Sales UI showed both GST and Without GST options; no production tax policy was created.
- Browser console contained no errors or warnings during the checked flows. Unauthenticated API 401 JSON and company-scoping/replay behavior were covered by automated route/DAL regression tests; a second-company browser session was not run.

### Verification after Phase 8 changes

- Focused DB-free suite after settlement submit guard change: **43 passed, 0 failed**.
- TypeScript: passed.
- Targeted ESLint for settlement UI and Phase 8 UI regression test: passed with no findings.
- Production build after the final settlement submit guard change: passed on Next.js 16.4.5, including TypeScript and route compilation. The earlier dev-server session logged Google Fonts fetch warnings and used fallback fonts; no typography change was made.
- `git diff --check`: passed after all code/documentation changes; Git reported only existing LF/CRLF normalization notices.
- The exact run-owned disposable database was dropped after its server stopped. Cleanup reported `disposableDatabaseAbsent=true`, `persistentTestUnchanged=true`, `persistentTestRateLimitRowsTouched=false`, and `developmentDatabaseConnected=false`; the manifest was removed only after verification. Port 3002 is free.

### Phase 8 remaining work / approvals

- Do not apply migrations `011`–`013` to DEV or import legacy Export/settings records without a verified DEV backup, source reconciliation and separate approval. Nine source records remain flagged for owner authenticity/relationship review.
- No source settings migration was performed; populated Settings categories were not changed in the disposable UI session. Only a synthetic International settings test value was saved to the disposable clone.
- Export UI is a generic source-field editor rather than the old specialized legacy forms. Export Stock is read-only. Invoice-wise/customer-wise/supplier-wise payment history screens beyond allocations and searchable registers are not implemented.
- The live Sales tax matrix is not approved; domestic place of supply, CGST/SGST versus IGST and export GST/LUT treatment remain owner/accountant blockers. New Sales must remain fail-closed.
- No production hosting, domain, TLS, deployment, authentication hardening review, or production backup automation was performed.

## Phase 9 DEV activation and source-preserving settings/Export import – 2026-11-14

### DEV migration and backup

- Confirmed the exact local DEV identity: `uk_exim_erp_dev`, `127.0.0.1:5432`, PostgreSQL 18.6. Read-only validation found exactly migrations 001–013; the native recovery utility now checks all 13 migration checksums and the Phase 9 tables.
- Created a fresh native PostgreSQL backup and restored it into a uniquely named recovery database. All 13 checksums, 29 table counts, 77 indexes, 406 constraints, the company identity, and domestic purchase/sales relationships matched. The exact run-owned restore database was dropped after verification. No DEV source rows were changed by backup/restore.
- Applied migrations 011–013 through the official migration runner. They were already current at execution; no earlier migration was rerun. Read-only post-check confirms all 13 migrations/checksums and required tables.

### Settings and Export source preservation

- Verified the source full-backup SHA-256 against the reviewed snapshot. An insert-only importer performs exact DEV/company/migration checks, duplicate-ID/code/document/settings checks, an advisory lock, transactional writes, and exact post-insert reconciliation. Its default is a read-only dry-run; `--apply` also requires the current native DEV dump and matching SHA-256.
- Migrated the four settings categories (`company`, `invoice`, `bank`, `international`) without logging their values. Source objects are retained in JSONB; no existing settings row was overwritten.
- Preserved all 66 Export Customers, 14 Export documents, and 2 separate Export Stock rows with original IDs and full source JSONB. All 36 source-resolved normalized document/customer relationships were inserted. No unresolved source references or ID/code/document/settings conflicts were found.
- Nine records listed in `docs/UK-EXIM-Phase-7-Export-Owner-Review.md` remain explicit authenticity/relationship review flags. Because the other source rows also lack independent authenticity approval, all 82 imported Export rows are stored as `review_required`; none is promoted as a confirmed operational transaction. Export Stock remains in its separate export table and does not affect domestic inventory.
- Export Dashboard summary now counts only `owner_verified` rows as confirmed operational totals and reports review-required Customers, documents, and stock separately. Pending source records therefore remain visible for review without being counted as confirmed trade activity.
- No receipts, supplier payments, allocations, historic payment balances, or payment records were inserted. Migration 013 and its APIs/tables are active; the 16 historical Pending sales remain unchanged and balance-unverified.

### Post-import verification and checks

- DEV counts remain: Products 7, Domestic Customers 39, Suppliers 1, Purchases 3 / lines 3, Sales 88 / lines 92, stock baselines 2, domestic movement transactions/movements/events 0. Baseline rows remain one each for P0006 (79) and P0007 (0).
- Phase 9 counts: settings 4, Export Customers 66, Export documents 14, document references 24, customer references 12, Export Stock 2; receipt/payment/allocation rows remain 0. A second dry-run reports all source rows as exact matches and zero conflicts, demonstrating repeat-safe behavior.
- Focused Phase 9/export/settings/settlement/trade/dashboard suite: 45/45 passed. TypeScript passed; targeted ESLint passed without findings; Node syntax checks and `git diff --check` passed (only existing LF/CRLF notices). Production build passed on Next.js 16.4.5.
- Authenticated DEV browser verification of migrated Settings/Export pages remains pending. The browser login URL was observed with query parameters that may contain credentials; the agent did not submit them or retain their values. Although the owner reported rotating the password and signing in, subsequent independent browser checks still showed the login form and a query string, not the dashboard. Stop further sign-in attempts until the owner confirms the clean login form is being used; rotate any credential entered in a URL and review browser history/request logs. No LocalStorage was accessed.

### Remaining owner decisions

- Review and classify the nine flagged Export records and approve any relationships/authenticity before moving any record from review-only into operational use. Current unflagged rows also remain review-required pending independent source verification.
- Owner/accountant tax matrix for GST Tax Invoice vs Without GST, CGST/SGST vs IGST, place of supply, and export LUT/IGST remains required. No Sales tax guard was changed.
- Production deployment, hosting, TLS/domain, backup automation and operational recovery rehearsal remain pending. No commit, push, or deployment was performed.
