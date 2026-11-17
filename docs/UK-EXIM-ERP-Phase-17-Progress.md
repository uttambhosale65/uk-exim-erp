# UK EXIM ERP Phase 17 Progress Checkpoint

Updated: 16 November 2026

## Implemented in this checkpoint

- Added a PostgreSQL-backed, authenticated-company-scoped Export Document Centre summary for the nine document kinds represented by the current export schema. It reports available, Draft, Issued, and review-pending counts.
- Added compact dashboard register links and quick navigation for the existing Export Customer and document pages.
- Evidence attachment status is explicitly shown as **Not tracked** because the current schema does not represent evidence attachments. CHA document-pack action is visibly unavailable rather than redirected to an unrelated shipment workflow.
- Export document creation is restricted to Draft; only owner-verified Draft documents can be edited. Unique document conflicts return a conflict response. Existing review-required records remain read-only.
- Added a labelled A4 browser preview with print / Save as PDF for current source-backed Export records. The preview preserves original values, does not render raw JSON, and identifies unverified or unissued content.

## Preserved data and boundaries

- No database was connected; no migration, import, business-data write, LocalStorage access, fixture operation, or server restart was performed for this checkpoint.
- Existing Export source records and their review statuses were not changed.
- Existing API company scoping and authentication were retained.
- No Domestic, Stock, tax, or financial logic was changed.

## Not yet implemented or verified

- The current schema only supports customers, stock and nine export document kinds. The additional certificate, CHA, shipping instruction, Shipping Bill / LEO / EGM, eSanchit, bank-document and eBRC/payment-realisation workflows require a reviewed schema/API design and versioned migration.
- No attachment storage, document revision/audit history, audited cancellation/void workflow, sequence allocator, or evidence checklist exists in this checkpoint.
- Existing records that are review-required cannot be edited or issued; owner evidence review and explicit approval remain necessary.
- Customer profile actions are limited by existing API capabilities; delete/soft-delete and document-history-aware deactivation have not been added here.
- The preview is a source-backed generic print preview, not a legally complete Proforma Invoice, Commercial Invoice, Packing List, CHA, or customs filing template. Statutory/company data and tax/export routes must not be inferred.
- Official compliance references, version/effective-date catalogue, export reports, real authenticated browser flows, A4 print QA, desktop viewport measurements, production build, and full regression suite remain pending.

## Acceptance status

This is an implementation checkpoint, not Phase 17 acceptance or production readiness. Run the focused tests, TypeScript and targeted lint before further work. Do not apply DEV migrations or change review states without the required backup, reconciliation, and owner authorization.
