# UK EXIM ERP – PostgreSQL Data Model Proposal v1.0

**Status:** Stage 0 proposal for review; not approved SQL and not implemented.
**Verified source baseline:** `8eba53d2a76b68f9da6780b75b1f0e8449b97738` on `codex/loose-haldi-stock-cutover`.
**Purpose:** Move the existing UK EXIM ENTERPRISES ERP to server-side persistence while preserving current identifiers, document snapshots, historical records and the protected Loose Haldi stock model.
**Out of scope:** Database creation, application code, actual data export/import, production migration, hosting configuration, subscriptions and commercial multi-tenancy.

## 1. Evidence and design boundary

Current source facts are recorded in [Cloud Database Data Dictionary](UK-EXIM-ERP-Cloud-Database-Data-Dictionary-v1.0.md) §2–3 and [Product Master Cloud Mapping](UK-EXIM-ERP-Product-Master-Cloud-Mapping-v1.0.md). The source uses TypeScript objects persisted as JSON arrays/objects under 23 active LocalStorage keys. It has no PostgreSQL schema, database IDs, enforced foreign keys, company ownership field, authentication, or database transaction boundary.

Names, SQL types, constraints and relationships below are proposals. Proposed foreign keys are intentionally marked as candidates because most existing records refer by code, document number, lot number or copied name rather than by relational ID. No production constraints should be applied until an owner-provided export has passed offline validation.

## 2. PostgreSQL mapping rules

| Source property | Proposed initial target | Nullability/default/constraint decision |
|---|---|---|
| Required TypeScript `id: string` | `text` primary key, preserving exact value | Candidate PK. Do not convert to UUID. Confirm there are no duplicates or blanks in the exported source first. |
| Optional TypeScript property (`?`) | Nullable column or nullable child field | `NULL` is a candidate, not a statement about existing values. Preserve missing versus empty string in import metadata if that distinction is material. |
| Required TypeScript property | Target column matching its source type | Required in interface only; do not assume existing JSON rows are complete. Validator must classify invalid/missing values. |
| `string` | `text` | No implicit trim, case-fold, code conversion or empty-string-to-null transformation. Date-like strings need field-specific review. |
| `number` | PostgreSQL `numeric` | Precision/scale unresolved per field. Avoid `real`/`double precision` for financial or stock balances. Record stored source value and compare, not replace, historical totals. |
| `boolean` | `boolean` | Preserve source value; only use a default after confirming form and persisted-data conventions. |
| Literal union/status | `text` initially | `CHECK` constraint candidate only after confirming all historical and current values; defer PostgreSQL enums to avoid blocking later states. |
| Nested arrays | Child tables for reportable/relational/stock-affecting rows; `jsonb` only for suitable snapshots | Preserve ordering and exact source fields. Keep stable `lineId` when present; otherwise use an import-generated child key while retaining source array order. |
| ISO timestamp fields | `timestamptz` candidate | Parse and retain original string in migration audit; invalid timestamp fails validation. |
| Business date strings | `date` candidate only after format review | Do not apply UTC conversion to date-only values or change historical dates. |

**New common ownership/audit columns:** `company_id uuid NOT NULL` on company-owned rows, referencing `companies.id`; `created_by uuid NULL`, `updated_by uuid NULL` referencing authenticated users; server-maintained `created_at`/`updated_at timestamptz` may be added alongside source fields. These are proposed fields and must not overwrite source audit values. For initial single-company use, all imported records map explicitly to the UK EXIM ENTERPRISES company row.

## 3. Proposed tables and source field coverage

The following table inventory covers every persisted business entity/type identified in source. Exact source field names and TypeScript types are listed in Data Dictionary §3. Fields listed there should map one-for-one unless a child table split is explicitly described here. Preserve source snapshots even when adding a relationship ID.

| Proposed table | Source type / key | Proposed primary key and core relationship |
|---|---|---|
| `companies` | New online ownership record; not a current source entity | `id uuid`; one initial record for UK EXIM ENTERPRISES. Add `status`, created/updated timestamps. No subscription fields in Phase 1. |
| `users` / auth-provider identity | New auth entity | Provider-managed identity ID; avoid storing password material in ERP tables. |
| `company_members` | New company/user access relation | `id uuid`; FKs to company and auth user; proposed role/status. Unique `(company_id, user_id)`. |
| `products` | `Product`, `uk-exim-products` | Preserve source `id` as text PK; company-scoped candidate unique `(company_id, code)`. `stockBaseCode` is a candidate self-reference by `(company_id, code)`, but retain its exact source value and do not enforce until validated. |
| `customers` | `Customer`, `uk-exim-customers` | Source `id` text PK; candidate unique `(company_id, code)` after validation. |
| `suppliers` | `Supplier`, `uk-exim-suppliers` | Source `id` text PK; candidate unique `(company_id, code)` after validation. |
| `purchases` | `Purchase`, `uk-exim-purchases` | Source `id` text PK; preserve `purchaseNo`, `purchaseDate`, invoice/supplier text snapshots, totals, remarks, `postedAt`, and transaction stock snapshot. Candidate unique document number scope unresolved. |
| `purchase_items` | `PurchaseItem` in `Purchase.items` | Proposed child PK `id uuid`; FK to purchase. Preserve optional `lineId`, source row order, product code/name, HSN, unit, qty/rate/amount/GST/net amount. Product link by code remains a candidate only. |
| `sales` | `Sales`, `uk-exim-sales` | Source `id` text PK; preserve document/customer snapshots, invoice type, status, all totals, payment mode, remarks, `postedAt` and stock movements. Candidate unique document number scope unresolved. |
| `sales_items` | `SalesItem` in `Sales.items` | Proposed child PK `id uuid`; FK to sale. Preserve `lineId?`, item product/name/HSN/unit, quantity/rate/amount/tax fields and grand total as saved snapshots. |
| `stock_baselines` | `Stock`, `uk-exim-stock` | Preserve source stock `id` as text PK; retain product code/name/HSN/unit and opening/purchase/sales/current quantities as imported protected baseline snapshot. Never rebuild from legacy transactions in migration. |
| `stock_movement_transactions` | `StockMovementRecord`, `uk-exim-stock-movements-v1` | Proposed PK `id uuid`; fields `transactionType`, `transactionId`, `postedAt`, `state`; unique candidate `(company_id, transaction_type, transaction_id)` for idempotency. Keep state and event history. |
| `stock_movements` | `StockMovementLine` nested in movement record | Proposed PK `id uuid`; FK to movement transaction; fields `lineId`, `productCode`, `stockCode`, `direction`, `quantityKg`, `unit`, `sourceQuantity`, `netWeightGrams`. Product/stock-code FKs are candidates only. |
| `stock_movement_recovery_journal` | `LedgerJournal`, `uk-exim-stock-movement-journal-v1` | Proposed journal row with transaction type/id, expected purchase or sale snapshot (nullable), movement record snapshot, operation state and timestamps. Add unique transaction identity and retain completed/recovery evidence per approved retention policy. Exact existing journal payload is defined by `StockMovementStorage.ts`; its persisted runtime contents are unknown. |
| `company_settings` | Inline `CompanySettings`, `uk-exim-company-settings` | One row per company; fields `companyName`, `address`, `gstin`, `fssai`, `iec`, `mobile`, `email`, `website`, `logo`. Sensitive values/asset references need access controls. |
| `invoice_settings` | Inline `InvoiceSettings`, `uk-exim-invoice-settings` | One row per company; `invoicePrefix`, `nextInvoiceNumber`, `terms1`–`terms5`. Number allocation must be atomic in online implementation. |
| `bank_settings` | Inline `BankSettings`, `uk-exim-bank-settings` | One row per company; `bankName`, `branch`, `accountName`, `accountNumber`, `ifsc`, `upiId`, `qrImage`. Restrict reads and audit changes. |
| `international_settings` | Inline `InternationalSettings`, `uk-exim-international-settings` | One row per company; `pan`, `udyam`, `iecIssueDate`, `adCode`, `swiftBic`, `exportAccount`, `defaultCurrency`, `defaultIncoterm`, `defaultPortOfLoading`, `defaultPaymentTerms`, `defaultShipmentMode`, `countryOfOrigin`. |
| `export_customers` | `ExportCustomer`, `uk-exim-export-customers` | Source `id` text PK; candidate unique `(company_id, code)`. Optional `businessRole`, `industry`, `sourceEvent`, `interestedProducts` remain nullable candidates. Keep separate from domestic customers. |
| `export_enquiries` / `export_enquiry_items` | `ExportEnquiry` / `ExportEnquiryItem`, `uk-exim-export-enquiries` | Header PK from source `id`; item child table keyed to header; customer code/name and product code/name are snapshots. Document number uniqueness is unresolved. |
| `export_quotations` / `export_quotation_items` | `ExportQuotation` / `ExportQuotationItem`, `uk-exim-export-quotations` | Header and item child tables; `enquiryNo` and customer/product codes are candidate links, not currently enforced. Keep currency, validity, commercial terms and totals. |
| `export_proforma_invoices` / `export_proforma_invoice_items` | `ExportProformaInvoice` / `ExportProformaInvoiceItem`, `uk-exim-export-proforma-invoices` | Header plus item rows; preserve all exporter, buyer, consignee, shipping, banking, declaration, currency conversion and terms snapshots. Document-number references stay text until validated. |
| `export_orders` / `export_order_items` | `ExportOrder` / `ExportOrderItem`, `uk-exim-export-orders` | Header plus item rows; preserve exporter/buyer/consignee/importer snapshots, workflow document numbers, currency, shipment, product, package, payment and total fields. |
| `export_purchases` / `export_purchase_items` | `ExportPurchase` / `ExportPurchaseItem`, `uk-exim-export-purchases` | Header plus item rows; preserve supplier snapshots, received quantities, lot/batch, source currency/rate, status and costs. Export purchase stock is separate from domestic P0006 stock. |
| `international_export_stock` | `InternationalExportStock`, `uk-exim-international-export-stock` | Preserve source `id` text PK; company-scoped candidate identity includes product, lot/batch and purchase reference. Keep quantities, source, purchase reference and source timestamps. Separate inventory domain. |
| `export_reservations` / `export_reservation_items` | `ExportReservation` / `ExportReservationItem`, `uk-exim-export-reservations` | Header plus item rows. `reservedStockId` is a candidate FK to export stock `id`; validate existence and reservation mutation behavior before enforcing. Preserve source document/customer snapshots. |
| `export_packings` / `export_packing_items` | `ExportPacking` / `ExportPackingItem`, `uk-exim-export-packings` | Header plus item rows. Keep order/reservation document numbers as source references; status and quantity summaries remain source values. Packing is not domestic stock deduction. |
| `shipments` plus child tables | `Shipment`, cargo/container/document/certificate/timeline arrays, `uk-exim-export-shipments` | Header source `id` text PK; child rows for each nested array. Preserve each nested `id`; keep order/reservation/packing/invoice numbers and customer snapshots. Document attachments need private object storage plus metadata rows. |
| `export_commercial_invoices` / `export_commercial_invoice_items` | `ExportCommercialInvoice` / `ExportCommercialInvoiceItem`, `uk-exim-export-commercial-invoices` | Header plus item rows. Preserve document, customer, shipping, currency, totals, payment and declaration snapshots. |
| `audit_events` | New application audit record | New UUID; company/user, action, entity type/id, timestamp and minimal redacted metadata. Append-only; never use it to replace source transaction history. |
| `document_sequences` | New online sequence state | New UUID; company, document type, financial year, prefix, next value. Atomic allocation and unique `(company_id, document_type, financial_year)` candidate. Existing numbers are imported unchanged. |
| `import_jobs` / `import_job_rows` | New migration-operation records | New UUIDs; source file checksum/name, status, started/finished timestamps, counts and validation summary. Do not store raw business export content in logs. |
| `backup_jobs` | New backup-operation metadata | New UUID; backup time, provider/object reference, checksum, status, retention metadata. Must not store credentials or expose private backup URLs. |

All non-ID source fields in the Data Dictionary's source-type blocks are mapped one-for-one to the corresponding table above. Optional TypeScript properties remain nullable candidates. For all other fields, retain source property names in an explicit mapping layer; converting to snake_case is a naming proposal only. No form default becomes a database default automatically.

### Field-by-field application rules

Apply the following mapping to **each named property** in every source type block in Data Dictionary §3, including all nested item/child types:

| Field classification in source | Target field mapping | PK / FK / unique / default / validation / transformation |
|---|---|---|
| `id: string` on a persisted header/master record | Same source field as `text` | Candidate primary key; no generated UUID replacement. No uniqueness other than candidate PK until duplicate checks. No conversion. |
| `id: string` on a nested child type | Child `id` as `text` where declared | Candidate unique within parent/company only after validation. Child types without a declared `id` receive a new internal key while source row order is retained. |
| Other required `string` field | Same field as `text` | No default, FK or unique constraint unless the relationship/constraint table below explicitly proposes one. Required in TS does not prove non-null source data. Preserve text exactly. |
| Optional `string?` field | Same field as nullable `text` | Candidate nullable. Do not collapse empty string and missing value without owner-approved mapping. |
| `number` field | Same field as `numeric` | No scale/default/check finalized. Money, GST, unit price, exchange rate, quantity, weight and package fields require separate range/scale/rounding policy. No automatic `toFixed` transformation. |
| `boolean` field | Same field as `boolean` | No database default unless separately verified and approved. |
| Literal union field | Same field as `text` | Candidate `CHECK` only after source and exported value inventories confirm all historical states. No spelling/case rewrite. |
| Array field | Parent-child table or exact JSON snapshot according to table inventory | Preserve array order and nested snapshots. Foreign keys only where specified below; no inferred FK from names alone. |

No existing source type declares a PostgreSQL FK, unique index or SQL default. Current form/storage checks remain application behavior and are not automatically equivalent to DB constraints. Documented examples include Product form checks for name/HSN/sale price/packet mapping/MRP; stock conversion rejects unsupported units and posting validates aggregate stock. The importer must report other invalid values rather than silently coerce them.

## 4. Stock ledger and transaction invariants

The source cutover instant is `2026-11-05T18:30:00.000Z` (06 November 2026, 00:00 IST). Current code distinguishes this from dates on business documents. For the online system:

1. Import each existing `Stock` row unchanged as a protected baseline; do not recompute `openingStock`, historical `purchaseQty`, `salesQty` or `currentStock` from old documents.
2. Keep imported historical purchase/sale records and their item values unchanged. Historical data must not be remapped using current packet weights.
3. Preserve existing post-cutover movement records as a separate movement set after owner-controlled export and reconciliation; source movement and recovery-journal contents are not known from this audit.
4. New eligible P0001–P0005 sales create P0006 out-movements using 50/100/200/500/1000g per packet respectively. New P0006 purchases add to P0006; loose P0006 sales subtract from P0006. P0007 movements remain on P0007.
5. A single server-side database transaction writes the transaction header/lines, idempotency identity, movement journal/event and updated stock projection. Enforce uniqueness for the posting identity and lock the affected stock row(s) for aggregate availability checks.
6. Corrections use explicit reversal/void events and replacement movements within a transaction; preserve audit history. Define whether editing a posted sale is reversal-plus-repost before implementation.
7. Available balance is baseline quantity plus eligible committed movements. Monthly reports query the persisted baseline and movements with their posting timestamps; do not mutate old records to produce reports.
8. Do not import a pending journal as committed without recovery validation. Quarantine ambiguous/incomplete journal entries for owner review; never automatically replay them.

**Important boundary:** Current code contains a LocalStorage journal/recovery mechanism, Web Lock and stock snapshot fields on purchase/sale records. These provide source evidence for data to preserve, not a proven server concurrency or crash-recovery design. Database transactions and row-level concurrency control are new implementation requirements.

### Verified current posting/edit/delete behavior in source

- `app/sales/page.tsx` and `app/components/customer/purchase/PurchaseMaster.tsx` assign `postedAt` from `new Date().toISOString()` for new post-cutover documents and preserve the original `postedAt` when editing an eligible posted document. A date-only `salesDate`/`purchaseDate` is not the stock cutover timestamp.
- When the current clock is at/after cutover, edits and deletes are blocked unless the existing record has a valid post-cutover `postedAt`. Duplicate new posts are blocked when the transaction ID already exists in the corresponding collection.
- Sales save validates the aggregate stock need across lines and adds back the existing eligible movements when replacing an edited sale. Purchase save checks eligible purchase lines and movement mapping. P0001–P0005 purchases are not movement-eligible; the approved purchase policy is P0006 purchases only.
- Commit requires the browser `navigator.locks` API; if unavailable, it fails closed. Under the lock it attempts pending journal recovery, checks ledger/baseline health, validates the movement and stock, writes a journal intent, saves the transaction, then finishes the movement commit. These sequential browser writes are recoverable by source logic but are not a PostgreSQL atomic transaction.
- Post-cutover sale/purchase edits replace the current transaction and movement record under the same transaction identity; delete removes the business record and writes a `voided` empty movement record. Cancelled sales are saved with a voided empty movement. This source behavior should be translated to explicit audited reversal/void events online, not assumed to be immutable append-only as currently implemented.
- Historical records without qualifying `postedAt` are protected from post-cutover edit/delete. Opening screens call stock read paths; after cutover those paths project protected baseline plus ledger without saving/rebuilding the domestic stock rows. Pre-cutover legacy `loadStock()` retains rebuild behavior.
- Browser implementation, interrupted-tab recovery, same/different-device semantics and actual local values were not exercised for Stage 0. The Web Lock is per browser origin and does not provide cross-device coordination; PostgreSQL locking/unique constraints must replace it online.
- Separate export-side effect to account for: `PackingMaster` calls `syncReservationStatuses()` during its load path; that helper recalculates statuses and writes the reservations array with a fresh `updatedAt`. This affects export reservation records, not domestic P0006 stock, but means screen opening is not universally read-only across the ERP. Define a server-side, explicit/idempotent synchronization policy before migrating this path.

## 5. Relationships: candidates versus established source links

| Source reference | Proposed database relationship | Evidence and caveat |
|---|---|---|
| `PurchaseItem.productCode`, `SalesItem.productCode` | Candidate FK to `(company_id, Product.code)` | Source stores product code and product name snapshots; no product ID FK. Preserve both snapshots and unresolved codes. |
| `Purchase.supplierCode`, `Sales.customerCode` | Candidate FK to supplier/customer code | Source also stores supplier/customer names and contact person. Preserve these transaction snapshots. |
| Export document `customerCode` | Candidate FK to export customer | Export customer is a distinct type from domestic customer. Resolve references by code only after checking duplicates. |
| Export workflow `enquiryNo`, `quotationNo`, `proformaInvoiceNo`, `exportOrderNo`, `reservationNo`, `packingNo`, `shipmentNo`, `invoiceNo` | Candidate FKs by company and document number | Source stores document-number strings. Preserve the text even if no matching source document exists; do not fabricate a parent relation. |
| `ExportReservationItem.reservedStockId` | Candidate FK to `international_export_stock.id` | Source comment/logic links reserved stock by ID; validate all IDs. |
| `StockMovementRecord.transactionId` | Candidate FK to domestic purchase/sales `id`, selected by `transactionType` | Polymorphic relationship cannot be a conventional single FK. Use separate nullable FKs or validated service-layer integrity. |
| `StockMovementLine.stockCode` | Candidate reference to stock/product code | Code may be pool code or product code. Preserve exact value; only approved P0006/P0007 rules define new mapping. |
| Settings keys | One-to-one by `company_id` | Source has one object per settings key and no user or company relation. |
| Shipment nested IDs | Child rows linked to shipment header | Types declare child `id` values; other export item types often do not declare stable row IDs. |

Potential duplicate documents include repeated source IDs, repeated document numbers, repeated product codes, duplicate line IDs and repeated export references. Potential orphans include missing customer/supplier/product codes, missing parent document numbers, reservation stock IDs and stock movement transaction IDs. The actual counts are unknown and must be reported by the offline validator.

## 6. Financial, quantity, date and snapshot handling

- Domestic Purchase fields include item `qty`, `rate`, `amount`, `gst`, `gstAmount`, `netAmount`; header `totalQty`, `totalAmount`, `totalGstAmount`, `totalNetAmount`. `Purchase` also contains supplier and product name/code snapshots.
- Domestic Sales items include `qty`, `rate`, `amount`, `gst`, `gstAmount`, `taxableAmount`, `cgst`, `sgst`, `igst`, `grandTotal`; header totals repeat taxable/tax split/grand total and include payment mode/status.
- Sales form source currently divides GST equally into CGST/SGST and sets IGST to zero in that calculation path. This is source behavior, not a tax-compliance determination. Preserve stored historical tax values; do not change GST or recompute invoices during migration.
- Domestic Sales currently stores a `paymentMode` and transaction `status`, but there is no separate payment/receipt entity or payment-history ledger in the inspected types. Do not invent historical payment events during import.
- Domestic Purchase is the persisted Purchase/GRN document type; there is no separate domestic `GRN` TypeScript entity in the current source. Keep its existing `purchaseNo` and other GRN-facing references intact.
- Export values use currency strings plus `number` values for unit prices, charges, exchange rates and INR equivalents. Currency is present in relevant records but there is no universal currency field on every amount. The target design must not assume all monetary values are INR.
- `number` serialization does not specify decimal scale. Define separate scale/range decisions for money, GST percentages, exchange rates, weight, quantity, package counts and CBM after reviewing calculations and business-approved rounding. Keep source totals as imported snapshots and report recalculated deltas separately.
- Purchase form rounds line amount/GST/net amount and aggregate totals to two decimal places via `toFixed(2)` during calculation. Sales form calculations store JavaScript numeric intermediate values; `toFixed(2)` is used for display in some views, not as proof that stored values were rounded. Preserve source values; any new online calculation policy is a separate owner decision.
- Source date-like strings include document dates, due/validity dates, shipment milestones, audit dates, `postedAt`, `createdAt` and `updatedAt`. Identify date-only versus instant values; only `postedAt` is used by current stock cutover logic as an instant. Do not timezone-shift date-only historical values.
- Snapshot fields such as product/customer/supplier names, HSN/HS code, address, tax values, exchange rate, exporter/buyer/bank details, rates and document references must remain on historical document records even when foreign keys are introduced.

## 7. Index and constraint proposals

Candidate indexes for review: `(company_id, code)` on product/customer/supplier tables; `(company_id, document_number)` on each document table; `(company_id, business_date)` for report filters; purchase/sales item `product_code`; stock movement `(company_id, stock_code, posted_at)`; movement transaction identity; export inventory `(company_id, product_code, lot_batch_no)`; reservation `reserved_stock_id`; shipment child parent IDs. Create only after migration validation and query-plan review.

Candidate checks: nonnegative quantity/weight where business rules support them, valid `direction`, `state`, document status, finite decimal amounts and permitted ranges. Do not encode current UI-only checks as permanent database rules until owner confirms them. Product-code uniqueness, document-number uniqueness, status constraints, nullability, cascade behavior and deletes are unresolved. Prefer restrictive deletes for records referenced by posted transactions; preserve cancellation/reversal history.

## 8. Migration and recovery specification

1. Owner performs an explicitly approved export using an agreed process; never access Chrome or read LocalStorage directly.
2. Preserve the untouched original export, calculate a checksum, and restrict access to the working copy.
3. Offline validator reports each key, JSON type, row count, missing/duplicate IDs, duplicate document numbers, invalid dates/numbers, orphan codes, unknown fields and line counts. It must not silently normalize, recalculate or repair records.
4. Map every source key, record type and field using the Data Dictionary and mapping above. Preserve original IDs/documents and snapshots; create a mapping report for any required structural transform.
5. Test importer with synthetic fixtures only, then use a separate staging PostgreSQL database. Import must be repeatable/idempotent and produce before/after counts and totals.
6. Reconcile purchase and sales counts/totals, export counts, product/customer/supplier references and stock by code. Verify opening quantities P0001–P0006 are unchanged; P0007 remains separate; compare post-cutover movement history and journal statuses without replaying unverified records.
7. Keep import rollback as deletion/recreation of the isolated staging database or transactionally clearing the staging import namespace. Never rollback by modifying the original export.
8. Production import, access cutover, any data write, and eventual retirement of LocalStorage require separate explicit owner approval. Retain original LocalStorage and approved export until the owner separately authorizes any later change.

## 9. Unresolved owner decisions before Stage 1

- Confirm ORM/database access layer and hosting/auth providers.
- Define employee roles and access to bank settings, exports, backups and restore.
- Approve how posted purchases/sales may be edited, cancelled or deleted online and how reversals appear in reports.
- Approve stock baseline timestamp and reconciliation procedure for all movements from cutover onward.
- Define document numbering scope, financial-year rules, prefixes and behavior under concurrent users.
- Approve currency, decimal precision, quantity scale and rounding policy for new online transactions; preserve historical stored amounts regardless.
- Decide attachment storage retention/backup and whether all document files are in source records or referenced externally.
- Approve uniqueness, deletion, nullability, and legacy-invalid-record handling only after offline validator results.

## 10. Source files reviewed for this proposal

All discovered `*Types.ts`, `*Storage.ts`, relevant purchase/sales/product forms and masters, stock report/rebuild code, inline settings shapes, and `app/utils/ERPBackup.ts` at the stated commit. Review was repository-only. No browser profile, live LocalStorage values, database, migration, application startup, build or stock tests were accessed/run for this documentation task.
