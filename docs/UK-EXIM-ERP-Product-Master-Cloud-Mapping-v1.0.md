# UK EXIM ERP – Product Master Cloud Mapping v1.0

**Document status:** Source-derived mapping notes for future cloud design; not an approved database schema.
**Source baseline:** Repository checkout at Git commit `8eba53d2a76b68f9da6780b75b1f0e8449b97738`, branch `codex/loose-haldi-stock-cutover`.
**Scope:** Product Master types, LocalStorage helpers, and product form/register source. No browser data was accessed.

## 1. Current source storage

- Product records use the LocalStorage key `uk-exim-products`, declared in `app/product/components/ProductStorage.ts`.
- `loadProducts()` returns an empty list outside the browser, when the key is absent, when parsed data is not an array, or when an error occurs. Valid arrays are mapped through `normalizeProduct()`.
- `saveProducts()` normalizes each record and writes the serialized array to that key. `clearProducts()` removes that key.
- The active source inventory contains 23 persisted keys. The backup allowlist in `app/utils/ERPBackup.ts` includes `uk-exim-products` and also two stock movement keys; it additionally includes the legacy `uk-exim-sales-numbering-v2` marker. This is source-level coverage only; backup or restore has not been exercised.
- The owner's live Chrome LocalStorage is the business data source. This document describes source definitions only and makes no claims about actual stored records.

## 2. Product type and fields

`app/product/components/ProductTypes.ts` declares `ProductUnit` as the literal union `"Gram" | "KG" | "Pkt"` and a `Product` type with **19 fields**. All fields are required by the TypeScript type except `stockBaseCode`.

| Source field | Type | What source establishes |
|---|---|---|
| `id` | `string` | Product identifier. New forms use `crypto.randomUUID()`; existing IDs are retained by normalization when present. No database ID format is specified. |
| `code` | `string` | Product code. `getNextProductCode()` derives a next `P`-prefixed, four-digit sequence from codes in the supplied product list. This does not establish uniqueness across users or companies. |
| `name` | `string` | Product name; form requires non-empty trimmed name. |
| `category` | `string` | Category string; new form defaults to `Spices`. No closed category list is defined in the type. |
| `hsn` | `string` | HSN value; form requires non-empty trimmed value. |
| `gst` | `string` | GST value represented as text. New form and normalizer default to `5%`; no tax calculation or canonical code set is defined by this type. |
| `unit` | `ProductUnit` | One of `Gram`, `KG`, `Pkt`. Normalization maps unrecognized values to `Gram`. |
| `netWeight` | `number` | Net weight per product unit, as described in the type comments. The field has no explicit weight-unit property; examples are expressed in grams. |
| `stockBaseCode` | `string?` | Optional product-code reference used by source comments/form for packet-to-base product mapping. The type does not enforce a foreign key or referential integrity. |
| `purchase` | `number` | Existing purchase price field. The type does not specify currency or pricing basis. |
| `sale` | `number` | Sale price; form requires it to be greater than zero. |
| `mrp` | `number` | MRP; form requires it to be at least the sale price. |
| `baseCost` | `number` | Base cost component. |
| `packingCost` | `number` | Packing cost component; type comments describe it per product UOM. |
| `otherCharges` | `number` | Other cost component; comments mention processing, handling, or other charges. |
| `totalCost` | `number` | Source calculates as `baseCost + packingCost + otherCharges`. No rounding or currency policy is defined in the type. |
| `stock` | `number` | Product field preserved by the product normalizer. The product page states Product Master does not create or update Stock records; this field's live operational role is not established here. |
| `minimumStock` | `number` | Threshold used by ProductTable when displaying low-stock status against live stock. |
| `active` | `boolean` | Product form defaults true; normalization treats any value other than literal `false` as active. Product UI deactivates by setting this false rather than deleting the product record. |

## 3. Source-supported relationships and behavior

- **Packet/base product link:** ProductForm offers active products other than the current product as base-product options. For `Pkt`, it requires `stockBaseCode`; for non-packet units, the form sets it to the product's own code. This is a code-based application convention, not a database-enforced relation.
- **Different product entry points:** the `/product` route (`app/product/page.tsx`) overrides `stockBaseCode` to literal `P0006` for every `Pkt` product; `app/page.tsx` renders the reusable `ProductMaster` component, which saves the form's selected base code. The actual stock movement functions independently special-case P0001–P0005 to P0006 and P0007 to itself. Do not use Product Master mapping alone as the online stock rule; preserve and test the movement policy separately.
- **Approved domestic stock mapping:** post-cutover movement source maps P0001–P0005 packet sales to P0006 using hardcoded weights (50, 100, 200, 500 and 1000 grams respectively); P0006 stays in its own pool and P0007 is independent. Purchases of P0001–P0005 are excluded by `purchaseMovementForLine`; this agrees with the current owner-approved purchase policy. This is code behavior at the stated source baseline, not a claim about live product records.
- **Historical protection:** `StockStorage.loadStock()` uses the stored stock rows as protected baseline after cutover and projects ledger movements; the legacy rebuilding behavior is retained before cutover. The posting timestamp is stored on purchase/sales records and movement records. Do not re-run legacy transaction rebuild logic over the current baseline during migration.
- **Live stock display:** `ProductTable.tsx` obtains stock via `loadStock()` from `app/components/stock/StockStorage.ts`, matches a stock row's `productCode` to the product's `code`, and displays that row's `currentStock` and unit. The table's displayed live stock therefore comes from the stock module, not from `Product.stock`. `minimumStock` is used for the low-stock display threshold.
- **Product lifecycle:** The page/component deactivates a product by setting `active: false`; existing product entries remain in the product list. No hard-delete behavior is described as the normal UI flow.
- **Cost and form checks:** The form recalculates `totalCost` from its three cost components and checks name, HSN, positive sale price, packet base code, and MRP not below sale price. These are UI behaviors, not database constraints.

## 4. Cloud mapping boundary

The source supports a future mapping of one product record to the fields above and an application-level product-code reference in `stockBaseCode`. It does **not** establish a SQL table name, primary-key strategy, column naming convention, decimal precision, currency, tenant key, uniqueness scope, foreign-key policy, or migration transformation. No database schema is proposed here.

The Cloud Data Dictionary separately discusses proposed SaaS fields such as `company_id`; these are new cloud-design fields, not current `Product` fields. Authentication identity and tenant ownership are not represented in the product type.

## 5. Unknowns and follow-up questions

- Whether both product entry points remain supported, or one is to be retired in a separately approved UI scope; they currently save packet `stockBaseCode` differently.
- Whether `stockBaseCode` must always reference an existing product and how existing references should be validated.
- Whether product codes are unique globally, per company, or only within the current browser dataset.
- The intended operational meaning and lifecycle of `Product.stock`, given live stock is displayed from the separate stock module.
- Currency, precision, rounding, GST representation, and effective dates for prices and cost fields.
- Actual legacy record shapes and values are unknown; they were not read from browser storage.
- Any SQL mapping, tenant design, or migration rule remains proposed/pending until owner decisions and further source review.

## 6. Source files reviewed

- `app/product/components/ProductTypes.ts`
- `app/product/components/ProductStorage.ts`
- `app/product/components/ProductForm.tsx`
- `app/product/components/ProductMaster.tsx`
- `app/product/components/ProductTable.tsx`
- `app/product/page.tsx`
- `app/components/stock/StockStorage.ts` (relationship boundary only)
- `app/utils/ERPBackup.ts` (allowlist membership only)

**Source baseline note:** No live browser data or actual Product Master records were inspected. The product code list and packet mapping above describe source-defined logic only.
