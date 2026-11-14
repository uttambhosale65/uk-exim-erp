# UK EXIM ERP – India GST Tax Decision Report

**Status (2026-11-14):** GST engine and migration `014_india_gst_tax_engine.sql` are implemented and migration 014 is applied to DEV after a verified native backup/restore check. The company tax configuration is not yet persisted; Sales posting remains fail-closed.

## Implemented behavior

- The owner-controlled, company-scoped tax configuration records seller scheme, GSTIN/state evidence, product/HSN classifications, effective dates and rates, export route, owner attestation and accountant review reference. Configuration is stored only after migration `014_india_gst_tax_engine.sql` is applied.
- New PostgreSQL Sales transactions use the server-side tax engine. Client-provided tax totals are not authoritative. Taxable sales by a verified regular GST seller require the `GST` option. `NON_GST` remains a separate permanent business option and resolves to a Bill of Supply or Commercial Invoice only when the saved classification supports that document. Composition configuration permits only a Bill of Supply with no separately collected GST.
- Place of Supply state, statutory basis and location/address are required. The engine does not infer Place of Supply from the Customer Master. Intra-state taxable lines use CGST/SGST; inter-state taxable lines use IGST. Composition outward goods supply across state boundaries and composition export are blocked.
- Domestic approval does not require an export route to be enabled. Export treatment is a separate engine path for a verified LUT/Bond route or an explicitly permitted IGST-paid route; an unverified export remains blocked and is not treated as an ordinary domestic `NON_GST` invoice. An unclassified product can coexist with an approved domestic policy but is blocked when selected for a sale.
- The saved tax decision includes a transaction snapshot. Existing/historical Sales without a snapshot are not recalculated under current rules; their tax decision cannot be silently changed through the new editing path.

## Owner and accountant verification still required

The owner supplied the official GST Portal taxpayer-search result for UK EXIM ENTERPRISES: proprietor, active Regular GST registration, Maharashtra (state code 27), effective 11 March 2025. This is owner-provided evidence, not independently queried by the ERP. The DEV schema migration is present, but the company configuration table currently has no row for this company; the profile has not yet been saved. No accountant approval or current LUT evidence was supplied. The seller details and the owner-directed product classification may be recorded in draft, but domestic tax approval and new Sales posting remain blocked until the accountant verifies and records:

1. Confirm the owner-provided Registration/GSTIN evidence and registration validity at the time of first posting.
2. Each enabled Product's description and HSN. The owner directed 5% for processed turmeric powder HSN `09103030`. The CBIC rate schedule lists heading 0910 (excluding fresh turmeric) at 2.5% CGST + 2.5% SGST / 5% IGST; the GST Council FAQ also distinguishes fresh turmeric from dried or ground turmeric. Accountant confirmation of the actual goods/HSN and the effective date is still required before enabling a product. Do not apply this rate to P0007 or other unverified classifications. Historical invoices are not recalculated.
3. Accountant-approved Place of Supply handling, including delivery destination and bill-to/ship-to or other statutory exceptions, and when the invoice is intra-state versus inter-state.
4. Treatment/document type for Nil-rated, exempt and non-GST products, and the applicable `GST Tax Invoice`, `Bill of Supply` or `Commercial Invoice` printing and numbering requirements.
5. Before enabling exports only: verified export route, destination and supporting evidence, including LUT/Bond reference and validity or whether IGST-paid export is permitted. Shipping Bill references are collected where applicable; the operational timing/source needs accountant confirmation.

The application does not decide whether UK EXIM ENTERPRISES is Regular or Composition from the GSTIN. A GSTIN format/state-code check is only structural validation, not proof of active registration or scheme.

## Tax-law and technical references

- CBIC GST goods/services rate schedule: [CBIC rate schedule](https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html). The schedule includes heading 0910 treatment with an exception for fresh turmeric; the exact product description and tariff classification must still be verified by the accountant before configuration.
- Place of Supply and inter-/intra-State framework: [Integrated Goods and Services Tax Act](https://cbic-gst.gov.in/hindi/IGST-bill-e.html), including the goods movement and third-party direction rules and export provisions.
- Export zero-rating and LUT/payment route: [IGST Act](https://cbic-gst.gov.in/hindi/IGST-bill-e.html), including Section 16; the application requires an explicitly verified route and does not infer eligibility.
- Invoice/Bill of Supply provisions: [CBIC GST invoice rules](https://cbic-gst.gov.in/hindi/gst-invoice-rules.html) and [CGST Act](https://cbic-gst.gov.in/hindi/CGST-bill-e.html).
- Composition scheme restriction on inter-State outward supplies of goods: [CBIC composition FAQ](https://cbic-gst.gov.in/pdf/faq-manual/faq-composition-levy-revised.pdf).
- SAP GST configuration is used only as a technical reference for condition-based tax configuration and business-place/state data: [SAP India GST configuration overview](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/240fcdcc71c640ea9aa9691500b34889/442dc7da1cd54ae58757c45e3602c40f.html). It is not a legal source.

This report records implementation behavior and verification gates; it is not tax or legal advice. Migration 014 was applied to DEV and verified; no seller/product tax configuration row has been saved yet. Existing historical invoice tax fields, Sales records, stock baselines and stock movements were unchanged. No browser LocalStorage data was accessed.
