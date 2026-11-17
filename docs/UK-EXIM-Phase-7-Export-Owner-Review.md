# UK EXIM ERP – Phase 7 Export Owner Review

## Purpose and handling

This is a sanitized review list derived from the 12 November 2026 full backup. It contains source record IDs, business document numbers, relationship references, and names of fields matched by a placeholder-word heuristic. It deliberately omits customer names, emails, addresses, tax identifiers, bank data, and raw LC/shipping values.

**A heuristic match is not proof that a record is false or fraudulent.** Preserve every source record. Keep the records below out of confirmed operational Export reporting/import until the owner reviews them. Do not rewrite the source backup.

## Records requiring owner review

| Record type | Source ID | Code/document number | Flagged field names | Source-linked documents | Owner decision required |
|---|---|---|---|---|---|
| Export Customer | `7d70833c-b14c-4d91-ae35-22d4f1ca67de` | `EXP-CUST-0002` | `email` | Referenced by export documents, if present | Confirm this is a genuine export customer and approve the contact record for operational use. |
| Export Customer | `2b23391f-251b-4b45-957b-141b12fd91f8` | `EXP-CUST-0003` | `email` | Referenced by export documents, if present | Confirm this is a genuine export customer and approve the contact record for operational use. |
| Export Customer | `45ce45ff-9eb7-43db-ad12-9d57c9f96ca4` | `EXP-CUST-0004` | `email` | Referenced by export documents, if present | Confirm this is a genuine export customer and approve the contact record for operational use. |
| Export Customer | `89361c26-7eb0-45de-bf3b-2b816828e655` | `EXP-CUST-0005` | `email` | Referenced by export documents, if present | Confirm this is a genuine export customer and approve the contact record for operational use. |
| Proforma Invoice | `57003b1c-4ca5-4a7f-ba3b-106666973df6` | `EXP-PI-0001` | `lcNo`, `vesselFlightNo`, `containerNo`, `blAwbNo`, `remarks` | `EXP-QTN-0002`, `EXP-ENQ-0001`, `EXP-ORD-0002` | Confirm whether this is a genuine commercial document, whether its stated status and shipping/LC references are real, and whether the linked quotation, enquiry, and order are correct. |
| Export Order | `d1a2c139-d728-4fc1-bdde-144f65ab98b4` | `EXP-ORD-0001` | `lcNo`, `remarks` | `EXP-PI-0001`, `EXP-QTN-0002`, `EXP-ENQ-0001` | Confirm order authenticity/status and the source links. Resolve the apparent shared PI/quotation/enquiry references against original records. |
| Export Order | `0a232d05-a65f-4cc5-8682-e3317807d493` | `EXP-ORD-0002` | `lcNo`, `remarks` | `EXP-PI-0001`, `EXP-QTN-0002`, `EXP-ENQ-0001` | Confirm order authenticity/status and the source links. Resolve the apparent shared PI/quotation/enquiry references against original records. |
| Shipment | `shipment-1791371565322-va5llf` | `SHP-0001` | `chaCode`, `insurancePolicyNo`, `insuranceCertificateNo`, `documents`, `certificates`, `remarks` | `EXP-ORD-0002`, `EXP-RES-0002`, `EXP-PKG-0001`, `EXP-INV-0001` | Confirm shipment completion and supporting transport/insurance documents; verify the linked order, reservation, packing, and invoice. |
| Commercial Invoice | `8d66ccf8-1b78-4805-903c-9aa77823aeef` | `EXP-INV-0001` | `containerNo`, `vesselName`, `blNo`, `remarks` | `EXP-ORD-0002`, `EXP-PI-0001`, `EXP-QTN-0002`, `EXP-ENQ-0001`; source shipment number is blank | Confirm invoice authenticity, legal/operational status, the relationship chain, and whether its missing shipment reference is correct. |

## Review notes

- Export Customers `EXP-CUST-0002` through `EXP-CUST-0005` were flagged only because their `email` fields matched the heuristic. No email values are included here.
- The PI, Order, Shipment, and Commercial Invoice flags came from one or more listed fields containing heuristic-matched text. The report intentionally does not expose those values.
- Some records refer to the same PI/quotation/enquiry/order chain. Referential consistency by document number alone does not establish that the underlying transactions occurred.
- The source inventory contains additional unflagged export records. They still require count, ID, document-number, date, line-item, amount/currency, and relationship reconciliation before import.
- Owner response should identify each row as **verified operational**, **synthetic/sample**, or **unresolved**, and provide documentary evidence for the verification where available. “Synthetic/sample” is a review outcome, not permission to delete the source record.

## Import gate

No export records were imported as part of this review. Once the owner resolves this list, only verified records with valid relationships should be eligible for an insert-only company-scoped migration. Preserve all source JSON snapshots and original IDs/document numbers. Keep unverified rows retained in the source archive and excluded from operational figures until separately resolved.

## Accountant/owner tax decisions still required

The ERP must keep **GST Tax Invoice** and **Without GST Invoice** as separate billing options and separate historical records/numbering. Before enabling new taxable Sales posting, record an accountant-approved answer for each item below; no rate or legal treatment is presumed here:

1. Which registered supplier/entity and dispatch location determine the seller tax location for each domestic sale?
2. Which customer/place-of-supply evidence determines the buyer tax location, and how should missing or conflicting evidence block posting?
3. Which approved conditions choose CGST+SGST versus IGST for a domestic taxable supply?
4. Which supply types and seller registration circumstances allow a Without GST document, and when is the correct document a Bill of Supply versus an ordinary Commercial Invoice?
5. Which taxable supplies must remain blocked from Without GST billing, even when the buyer cannot claim ITC?
6. For exports, which approved route applies: LUT/bond without IGST, IGST-paid export, or another documented treatment? Which documents/evidence are required before posting?
7. Who approves changes to the tax matrix, and what effective date/version should be stored so historical invoices remain unchanged?

Until these decisions are recorded, retain historical tax values as imported and block any new posting path that requires an unapproved treatment. Do not recalculate or rewrite past invoices.
