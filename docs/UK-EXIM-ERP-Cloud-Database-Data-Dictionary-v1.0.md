# UK EXIM ERP – Cloud Database Data Dictionary v1.0

**Document status:** Stage 0 source-derived field inventory and migration mapping; PostgreSQL details remain proposals.
**Source baseline:** Repository checkout at Git commit `8eba53d2a76b68f9da6780b75b1f0e8449b97738` (UK EXIM ERP Version 1.0 source), verified on branch `codex/loose-haldi-stock-cutover`.
**Application stack in source:** Next.js / React / TypeScript  
**Important:** This document records fields present in the supplied TypeScript source. Proposed database design notes are clearly labelled; they are not existing application fields.

## 1. Scope and interpretation

- The exact field names and TypeScript types below are copied from the `*Types.ts` files in the current repository checkout recorded above.
- `string`, `number`, `boolean`, literal unions, optional fields (`?`) and arrays are preserved as authored.
- Nested `items`, `cargoItems`, `containers`, `documents`, `certificates`, and `timeline` are currently TypeScript arrays. The source does not itself prove whether they must be separate SQL tables or JSONB; the proposed relational mapping is described later.
- The source contains no `company_id` field in the business types. `company_id` is a proposed ownership boundary for the single-company online database, not an existing application field or authorization to build SaaS subscriptions.
- The source types use string IDs. Do not convert them blindly to UUID until existing ID values and all references are inspected.

## 2. Existing localStorage keys found in source

| localStorage key | Source file |
|---|---|
| `uk-exim-customers` | `app/components/customer/CustomerStorage.ts` |
| `uk-exim-purchases` | `app/components/customer/purchase/PurchaseStorage.ts` |
| `uk-exim-sales` | `app/components/customer/sales/SalesStorage.ts` |
| `uk-exim-stock` | `app/components/stock/StockStorage.ts` |
| `uk-exim-suppliers` | `app/components/supplier/SupplierStorage.ts` |
| `uk-exim-export-customers` | `app/international/export/customer/ExportCustomerStorage.ts` |
| `uk-exim-export-enquiries` | `app/international/export/enquiry/ExportEnquiryStorage.ts` |
| `uk-exim-export-commercial-invoices` | `app/international/export/invoice/ExportCommercialInvoiceStorage.ts` |
| `uk-exim-export-orders` | `app/international/export/order/ExportOrderStorage.ts` |
| `uk-exim-export-packings` | `app/international/export/packing/PackingStorage.ts` |
| `uk-exim-export-reservations` | `app/international/export/reservation/ExportReservationStorage.ts` |
| `uk-exim-export-proforma-invoices` | `app/international/export/proforma/ExportProformaInvoiceStorage.ts` |
| `uk-exim-export-purchases` | `app/international/export/purchase/ExportPurchaseStorage.ts` |
| `uk-exim-export-quotations` | `app/international/export/quotation/ExportQuotationStorage.ts` |
| `uk-exim-export-shipments` | `app/international/export/shipment/ShipmentStorage.ts` |
| `uk-exim-international-export-stock` | `app/international/export/stock/InternationalExportStockStorage.ts` |
| `uk-exim-products` | `app/product/components/ProductStorage.ts` |
| `uk-exim-company-settings` | `app/components/settings/Settings.tsx` |
| `uk-exim-invoice-settings` | `app/components/settings/Settings.tsx` |
| `uk-exim-bank-settings` | `app/components/settings/Settings.tsx` |
| `uk-exim-international-settings` | `app/components/settings/Settings.tsx` |
| `uk-exim-stock-movements-v1` | `app/components/stock/StockMovementStorage.ts` |
| `uk-exim-stock-movement-journal-v1` | `app/components/stock/StockMovementStorage.ts` |

**Active persisted keys found:** 23.

`uk-exim-sales-numbering-v2` is present in `ERPBackup.ts`'s allowlist, but source search found no active application read/write use. Treat it as a backup-only legacy marker, not as an active key. The string `uk-exim-stock-movement-ledger-v1` in `StockMovementStorage.ts` is a Web Lock name, not a LocalStorage key. React state and computed report values are transient/derived, not persisted keys.

### Backup coverage finding

`app/utils/ERPBackup.ts` currently defines `BACKUP_KEYS` with 24 entries: all 23 active keys listed above plus the backup-only legacy marker `uk-exim-sales-numbering-v2`:

- `uk-exim-products`
- `uk-exim-customers`
- `uk-exim-suppliers`
- `uk-exim-purchases`
- `uk-exim-sales`
- `uk-exim-stock`
- `uk-exim-stock-movements-v1`
- `uk-exim-stock-movement-journal-v1`
- `uk-exim-company-settings`
- `uk-exim-invoice-settings`
- `uk-exim-bank-settings`
- `uk-exim-export-customers`
- `uk-exim-export-enquiries`
- `uk-exim-export-commercial-invoices`
- `uk-exim-export-orders`
- `uk-exim-export-packings`
- `uk-exim-export-reservations`
- `uk-exim-export-proforma-invoices`
- `uk-exim-export-purchases`
- `uk-exim-export-quotations`
- `uk-exim-export-shipments`
- `uk-exim-international-export-stock`
- `uk-exim-international-settings`
- `uk-exim-sales-numbering-v2` (backup-only legacy marker; no active application read/write found)

**Source comparison:** All 23 active keys are in the allowlist. The 24th entry is the legacy sales-numbering marker noted above. `createERPBackup()` reads only listed keys that exist and attempts to JSON-parse their values; this is source inspection, not a backup test. Restore writes recognized supplied keys and attempts rollback if a write fails; this is not a tested recovery guarantee. Never use Restore for migration testing.

### 2.1 Active key structure and source read/write summary

All rows below describe code-defined shapes and paths only. They do not describe actual values saved in Chrome. The detailed fields, dates, numeric properties, optional properties and nested arrays for typed records are preserved in §3 under the corresponding source type.

| Key | Module / declared source | Type and top-level shape | Read/write and default behavior |
|---|---|---|---|
| `uk-exim-products` | Product / `app/product/components/ProductStorage.ts` | `Product[]`; record key `id`, business code `code` | Load parses array and normalizes records; missing/invalid data returns `[]`; save normalizes array; clear removes key. Product form defaults are in `ProductForm.tsx`; no actual defaults in existing records are known. |
| `uk-exim-customers` | Domestic customers / `app/components/customer/CustomerStorage.ts` | `Customer[]`; `id`, `code` | Load absent/invalid returns `[]`; save JSON array. |
| `uk-exim-suppliers` | Domestic suppliers / `app/components/supplier/SupplierStorage.ts` | `Supplier[]`; `id`, `code` | Load absent/invalid returns `[]`; save/delete helpers operate on key. |
| `uk-exim-purchases` | Domestic purchase/GRN / `app/components/customer/purchase/PurchaseStorage.ts` | `Purchase[]` with nested `items: PurchaseItem[]`; `id`, `purchaseNo`, optional `postedAt`, optional `stockMovements` | Load normalizes supported legacy shapes; confirmed save/update/delete paths persist array. After cutover, posting master coordinates transaction and movement journal; migration must preserve existing source snapshots. |
| `uk-exim-sales` | Domestic sales / `app/components/customer/sales/SalesStorage.ts` | `Sales[]` with nested `items: SalesItem[]`; `id`, `salesNo`, optional `postedAt`, optional `stockMovements` | Load/save/delete helpers persist array. Post-cutover sale posting writes through movement commit flow. |
| `uk-exim-stock` | Domestic stock / `app/components/stock/StockStorage.ts` | `Stock[]`; `id`, product code/name, opening/purchase/sales/current quantities | Before cutover, source rebuild behavior can save recalculated rows. At/after cutover `loadStock()` uses stored rows as protected baseline and projects movements in memory; `saveStock()` returns without writing. Do not invoke rebuild in migration. |
| `uk-exim-stock-movements-v1` | Domestic stock ledger / `app/components/stock/StockMovementStorage.ts` | `StockMovementRecord[]`, each with nested `movements: StockMovementLine[]`; transaction type/id, `postedAt`, `state` | Read/append/update/void through ledger helpers; writes coordinated with transaction journal. Each movement has source and normalized quantities; cutover uses posting timestamp. |
| `uk-exim-stock-movement-journal-v1` | Domestic recovery / `app/components/stock/StockMovementStorage.ts` | Journal payload `LedgerJournal`: `transactionType`, `transactionId`, `expectedTransaction` (Purchase/Sales or null), `movementRecord` | Written before transaction/ledger commit and cleared after successful recovery/commit paths. Recovery may update the key and related transaction/stock keys; never run it against live LocalStorage for Stage 0. |
| `uk-exim-company-settings` | Company settings / `app/components/settings/Settings.tsx` | One `CompanySettings` object | Read on mount; defaults merged when present/absent; saved/reset by settings UI. Inline fields are listed below. |
| `uk-exim-invoice-settings` | Invoice settings / `app/components/settings/Settings.tsx` | One `InvoiceSettings` object | Read on mount; defaults merged; saved/reset. `nextInvoiceNumber` is string; online allocation must be atomic. |
| `uk-exim-bank-settings` | Bank settings / `app/components/settings/Settings.tsx` | One `BankSettings` object | Read on mount; defaults merged; saved/reset. Includes account and UPI fields; restrict future access. |
| `uk-exim-international-settings` | International settings / `app/components/settings/Settings.tsx` | One `InternationalSettings` object | Read on mount; defaults merged; saved/reset. Contains business identifiers and default export terms. |
| `uk-exim-export-customers` | Export customer / `app/international/export/customer/ExportCustomerStorage.ts` | `ExportCustomer[]`; `id`, `code` | Load absent/invalid returns `[]`; save writes full array. |
| `uk-exim-export-enquiries` | Export enquiry / `app/international/export/enquiry/ExportEnquiryStorage.ts` | `ExportEnquiry[]` with `items: ExportEnquiryItem[]`; `id`, `enquiryNo` | Load absent/invalid returns `[]`; save writes full array. |
| `uk-exim-export-quotations` | Export quotation / `app/international/export/quotation/ExportQuotationStorage.ts` | `ExportQuotation[]` with item snapshots; `id`, `quotationNo` | Load absent/invalid returns `[]`; save writes full array. |
| `uk-exim-export-proforma-invoices` | Proforma invoice / `app/international/export/proforma/ExportProformaInvoiceStorage.ts` | `ExportProformaInvoice[]` with item/terms arrays; `id`, `proformaInvoiceNo` | Load absent/invalid returns `[]`; save writes full array. |
| `uk-exim-export-orders` | Export order / `app/international/export/order/ExportOrderStorage.ts` | `ExportOrder[]` with `items`, `termsAndConditions`; `id`, `exportOrderNo` | Load absent/invalid returns `[]`; save writes full array. |
| `uk-exim-export-purchases` | Export purchase / `app/international/export/purchase/ExportPurchaseStorage.ts` | `ExportPurchase[]` with items; `id`, `purchaseNo` | Load absent/invalid returns `[]`; save writes array; associated export stock rebuild operates on separate export stock key. |
| `uk-exim-international-export-stock` | Export stock / `app/international/export/stock/InternationalExportStockStorage.ts` | `InternationalExportStock[]`; item `id`, product code, `lotBatchNo`, quantities/source/references | Load/save array. Rebuild uses export purchases and preserves manual Opening Stock records, but is distinct from domestic stock. Do not run in Stage 0. |
| `uk-exim-export-reservations` | Export reservation / `app/international/export/reservation/ExportReservationStorage.ts` | `ExportReservation[]` with nested reservation items; `id`, `reservationNo` | Load/save; reserve/release/replace/cancel paths also update export stock. `reservedStockId` references export stock row ID in source logic. |
| `uk-exim-export-packings` | Export packing / `app/international/export/packing/PackingStorage.ts` | `ExportPacking[]` with nested items; `id`, `packingNo` | Load/save; source sync updates reservation status and storage. Reads order/reservation keys; it is not domestic stock deduction. |
| `uk-exim-export-shipments` | Shipment / `app/international/export/shipment/ShipmentStorage.ts` | `Shipment[]` with nested cargo, containers, documents, certificates and timeline; header and child IDs | Load/save/add/update/delete; forms read related reservation/commercial invoice data. Attachments are names/metadata in source types, not proof file bytes are stored in this key. |
| `uk-exim-export-commercial-invoices` | Export commercial invoices / `app/international/export/invoice/ExportCommercialInvoiceStorage.ts` | `ExportCommercialInvoice[]` with nested invoice items; `id`, `invoiceNo` | Load/save full array. Snapshot fields include parties, shipping, banking, values and payment. |

`Settings.tsx` inline record fields are: `CompanySettings { companyName, address, gstin, fssai, iec, mobile, email, website, logo }`; `InvoiceSettings { invoicePrefix, nextInvoiceNumber, terms1, terms2, terms3, terms4, terms5 }`; `BankSettings { bankName, branch, accountName, accountNumber, ifsc, upiId, qrImage }`; `InternationalSettings { pan, udyam, iecIssueDate, adCode, swiftBic, exportAccount, defaultCurrency, defaultIncoterm, defaultPortOfLoading, defaultPaymentTerms, defaultShipmentMode, countryOfOrigin }`. These are all declared `string`; defaults are established in source code and do not establish actual saved values.

## 3. Source-derived business entities and exact fields

### `app/components/customer/CustomerTypes.ts`

```ts
export type Customer = {
  id: string;
  code: string;

  // Basic Details
  name: string;
  contactPerson: string;
  mobile: string;
  email: string;

  // Tax Details
  gst: string;
  pan: string;

  // Address
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;

  // Financial
  openingBalance: number;
  creditLimit: number;

  // Status
  status: "Active" | "Inactive";

  // Optional (Recommended)
  whatsapp?: string;
  paymentTerms?: string;
  remarks?: string;
};
```

### `app/components/customer/purchase/PurchaseTypes.ts`

```ts
/* =========================================================
   UK EXIM ERP – PURCHASE / GRN TYPES
   VERSION 1.0 – PROFESSIONAL ERP ARCHITECTURE
========================================================= */

/* =========================================================
   PURCHASE ITEM
   प्रत्येक GRN मधील स्वतंत्र Product Row
========================================================= */

export type PurchaseItem = {
  productCode: string;
  productName: string;

  hsn: string;
  unit: string;

  qty: number;
  rate: number;
  amount: number;

  gst: number;
  gstAmount: number;
  netAmount: number;
};

/* =========================================================
   PURCHASE / GRN
   एक GRN = एक Document
   त्यामध्ये अनेक PurchaseItem असू शकतात.
========================================================= */

export type Purchase = {
  /* -------------------------------------------------------
     DOCUMENT INFORMATION
  ------------------------------------------------------- */

  id: string;

  purchaseNo: string;
  purchaseDate: string;
  invoiceNo: string;

  /* -------------------------------------------------------
     SUPPLIER INFORMATION
  ------------------------------------------------------- */

  supplierCode: string;
  supplierName: string;
  contactPerson: string;

  /* -------------------------------------------------------
     GRN ITEMS
     Multi Product structure
  ------------------------------------------------------- */

  items: PurchaseItem[];

  /* -------------------------------------------------------
     GRN TOTALS
  ------------------------------------------------------- */

  totalQty: number;
  totalAmount: number;
  totalGstAmount: number;
  totalNetAmount: number;

  /* -------------------------------------------------------
     REMARKS
  ------------------------------------------------------- */

  remarks: string;
};
```

### `app/components/customer/sales/SalesTypes.ts`

```ts
export type SalesItem = {
  productCode: string;
  productName: string;

  hsn: string;
  unit: string;

  qty: number;
  rate: number;

  amount: number;

  gst: number;
  gstAmount: number;

  taxableAmount: number;

  cgst: number;
  sgst: number;
  igst: number;

  grandTotal: number;
};

export type Sales = {
  id: string;

  // Sales Details
  salesNo: string;
  salesDate: string;
  invoiceNo: string;
  invoiceType: "GST" | "NON_GST";
  // Customer
  customerCode: string;
  customerName: string;
  contactPerson: string;
  // Multiple Products
  items: SalesItem[];

  // Invoice Totals
  taxableAmount: number;
  gstAmount: number;

  cgst: number;
  sgst: number;
  igst: number;

  grandTotal: number;

  // Payment Details
  paymentMode:
    | "Cash"
    | "UPI"
    | "Card"
    | "Bank"
    | "Credit";

  // Status
  status:
    | "Completed"
    | "Pending"
    | "Cancelled";

  // Other Details
  remarks: string;

  // Audit
  createdAt: string;
  updatedAt: string;
};
```

### `app/components/stock/StockTypes.ts`

```ts
export type Stock = {
  id: string;

  productCode: string;
  productName: string;

  hsn: string;
  unit: string;

  openingStock: number;
  purchaseQty: number;
  salesQty: number;
  currentStock: number;
};
```

### `app/components/stock/StockMovementStorage.ts` (source-defined ledger structures)

```ts
export type StockMovementLine = {
  lineId: string;
  productCode: string;
  stockCode: string;
  direction: "in" | "out";
  quantityKg: number;
  unit: string;
  sourceQuantity: number;
  netWeightGrams: number;
};

export type StockMovementRecord = {
  transactionType: "sale" | "purchase";
  transactionId: string;
  postedAt: string;
  state: "posted" | "voided";
  movements: StockMovementLine[];
};

type LedgerJournal = {
  transactionType: "sale" | "purchase";
  transactionId: string;
  expectedTransaction: Sales | Purchase | null;
  movementRecord: StockMovementRecord;
};
```

`MovementProduct` is a transient calculation input, not a persisted key. The journal is one recovery payload under `uk-exim-stock-movement-journal-v1`; a journal's actual presence/content is unknown. The Web Lock name `uk-exim-stock-movement-ledger-v1` is not persisted data.

### `app/components/supplier/SupplierTypes.ts`

```ts
export type Supplier = {
  id: string;
  code: string;

  name: string;
  contactPerson: string;

  mobile: string;
  email: string;

  gst: string;
  pan: string;

  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;

  openingBalance: number;
  creditLimit: number;

  status: "Active" | "Inactive";
};
```

### `app/international/export/customer/ExportCustomerTypes.ts`

```ts

export type ExportCustomer = {
  id: string;
  code: string;

  // Basic Details
  name: string;
  contactPerson: string;
  mobile: string;
  email: string;

  // Business Details
  businessRole?:
    | "Importer"
    | "Exporter"
    | "Importer & Exporter"
    | "Manufacturer"
    | "Trader"
    | "Distributor"
    | "Agent/Broker"
    | "Service Provider"
    | "Other";

  industry?:
    | "Food & Agriculture"
    | "Spices"
    | "Engineering"
    | "Textiles & Garments"
    | "Chemicals"
    | "Pharmaceuticals"
    | "Packaging"
    | "Consumer Goods"
    | "Other";

  // International Details
  country: string;
  currency: string;

  // Address
  address: string;
  city: string;
  stateProvince: string;
  postalCode: string;

  // Tax / Registration
  taxRegistrationNo: string;

  // Commercial Terms
  paymentTerms: string;

  // Source / Event
  sourceEvent?: string;

  // Interested Products
  interestedProducts?: string;

  // Status
  status: "Active" | "Inactive";

  // Additional Information
  remarks: string;
};
```

### `app/international/export/enquiry/ExportEnquiryTypes.ts`

```ts
export type ExportEnquiryItem = {
  productCode: string;
  productName: string;
  qty: number;
  unit: string;
  customerRequirement: string;
};

export type ExportEnquiry = {
  id: string;
  enquiryNo: string;
  enquiryDate: string;

  // Export Customer Reference
  customerCode: string;
  customerName: string;
  country: string;
  contactPerson: string;
  currency: string;

  // Product Details
  items: ExportEnquiryItem[];

  // Delivery & Commercial Requirements
  requiredDeliveryDate: string;
  incoterm: string;

  // Additional Information
  remarks: string;

  // Enquiry Status
  status:
    | "Open"
    | "Quoted"
    | "Under Discussion"
    | "Won"
    | "Lost"
    | "Cancelled";

  // Audit Information
  createdAt: string;
  updatedAt: string;
};
```

### `app/international/export/invoice/ExportCommercialInvoiceTypes.ts`

```ts
export type ExportCommercialInvoiceItem = {
  productCode: string;
  productName: string;
  hsCode: string;
  countryOfOrigin: string;

  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;

  packingType: string;
  packageQty: number;
  netWeight: number;
  grossWeight: number;
  cbm: number;

  customerRequirement: string;
  grade: string;
  brand: string;
  specification: string;
  marksNumbers: string;
};

export type ExportCommercialInvoiceStatus =
  | "Draft"
  | "Issued"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Cancelled"
  | "Completed";

export type ExportCommercialInvoice = {
  id: string;

  /* =====================================================
     INVOICE DETAILS
  ====================================================== */

  invoiceNo: string;
  invoiceDate: string;

  orderNo: string;
  proformaInvoiceNo: string;
  quotationNo: string;
  enquiryNo: string;

  /* =====================================================
     EXPORTER / SELLER
  ====================================================== */

  exporterName: string;
  exporterAddress: string;
  exporterCity: string;
  exporterState: string;
  exporterCountry: string;

  exporterIEC: string;
  exporterGSTIN: string;
  exporterPAN: string;

  exporterMobile: string;
  exporterEmail: string;
  exporterWebsite: string;

  /* =====================================================
     BUYER / CONSIGNEE
  ====================================================== */

  customerCode: string;
  customerName: string;
  contactPerson: string;

  buyerAddress: string;
  buyerCity: string;
  buyerStateProvince: string;
  buyerCountry: string;
  buyerPostalCode: string;

  buyerTaxRegistrationNo: string;

  /* =====================================================
     SHIPPING INFORMATION
  ====================================================== */

  countryOfOrigin: string;
  finalDestination: string;

  portOfLoading: string;
  portOfDischarge: string;

  shipmentMode: string;
  incoterm: string;
  currency: string;

  shipmentNo: string;

  containerNo: string;
  sealNo: string;

  vesselName: string;
  voyageNo: string;

  blNo: string;
  blDate: string;

  awbNo: string;
  awbDate: string;

  /* =====================================================
     GOODS
  ====================================================== */

  items: ExportCommercialInvoiceItem[];

  totalPackages: number;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalCBM: number;

  /* =====================================================
     VALUE DETAILS
  ====================================================== */

  totalGoodsValue: number;

  freight: number;
  insurance: number;
  otherCharges: number;

  totalInvoiceValue: number;

  exchangeRate: number;
  inrEquivalent: number;

  /* =====================================================
     PAYMENT
  ====================================================== */

  paymentTerms: string;
  paymentMethod: string;

  advanceReceived: number;
  balanceDue: number;

  bankName: string;
  bankBranch: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankIFSC: string;
  bankSwiftBic: string;

  /* =====================================================
     DOCUMENT / DECLARATION
  ====================================================== */

  marksNumbers: string;

  packingDetails: string;

  declaration: string;

  authorizedSignatory: string;

  /* =====================================================
     STATUS / CONTROL
  ====================================================== */

  status: ExportCommercialInvoiceStatus;

  remarks: string;

  createdAt: string;
  updatedAt: string;
};
```

### `app/international/export/order/ExportOrderTypes.ts`

```ts
export type ExportOrderItem = {
  productCode: string;
  productName: string;
  hsCode: string;
  countryOfOrigin: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discount: number;
  amount: number;
  customerRequirement: string;
  packingType: string;
  packageQty: number;
  netWeight: number;
  grossWeight: number;
  cbm: number;
  marksNumbers: string;
  grade: string;
  brand: string;
  specification: string;
};

export type ExportOrderStatus =
  | "Draft"
  | "Confirmed"
  | "Processing"
  | "Partially Shipped"
  | "Shipped"
  | "Completed"
  | "Cancelled";

export type ExportOrder = {
  id: string;

  // Document / Workflow
  exportOrderNo: string;
  exportOrderDate: string;
  proformaInvoiceNo: string;
  quotationNo: string;
  enquiryNo: string;
  status: ExportOrderStatus;

  // Exporter / Seller
  exporterName: string;
  exporterAddress: string;
  exporterCity: string;
  exporterState: string;
  exporterCountry: string;
  exporterMobile: string;
  exporterEmail: string;
  exporterWebsite: string;
  exporterIEC: string;
  exporterGSTIN: string;
  exporterPAN: string;

  // Customer / Buyer
  customerCode: string;
  customerName: string;
  contactPerson: string;
  buyerAddress: string;
  buyerCity: string;
  buyerStateProvince: string;
  buyerPostalCode: string;
  buyerCountry: string;
  buyerTaxRegistrationNo: string;
  buyerEmail: string;
  buyerMobile: string;

  // Consignee / Importer
  consigneeName: string;
  consigneeAddress: string;
  consigneeCountry: string;

  importerName: string;
  importerAddress: string;
  importerCountry: string;

  notifyParty: string;

  // Buyer References
  buyerReferenceNo: string;
  buyerPONo: string;
  buyerPODate: string;

  lcNo: string;
  lcDate: string;

  // Commercial / Trade Terms
  currency: string;
  incoterm: string;
  incotermPlace: string;
  paymentTerms: string;
  paymentMethod: string;

  // Shipment Planning
  shipmentMode: string;
  estimatedShipmentDate: string;

  portOfLoading: string;
  portOfDischarge: string;
  finalDestination: string;
  countryOfDestination: string;
  countryOfOrigin: string;

  // Products
  items: ExportOrderItem[];

  // Package / Weight Summary
  totalPackages: number;
  packageType: string;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalCBM: number;
  marksNumbers: string;

  // Commercial Value
  totalGoodsValue: number;
  discount: number;
  freight: number;
  insurance: number;
  otherCharges: number;
  totalOrderValue: number;

  // Currency Conversion
  exchangeRate: number;
  inrEquivalent: number;

  // Payment Summary
  advancePercentage: number;
  advanceAmount: number;
  balanceAmount: number;

  // Order / Execution Notes
  remarks: string;
  termsAndConditions: string[];

  // Audit
  createdAt: string;
  updatedAt: string;
};
```

### `app/international/export/packing/PackingTypes.ts`

```ts
export type ExportPackingStatus =
  | "Draft"
  | "Partially Packed"
  | "Packed"
  | "Cancelled";

export type ExportPackingItem = {
  productCode: string;
  productName: string;
  hsCode: string;
  lotBatchNo: string;

  orderQty: number;
  reserveQty: number;

  previouslyPackedQty: number;
  packedQty: number;
  remainingQty: number;

  unit: string;

  packingType: string;
  packageQty: number;

  netWeightPerPackage: number;
  totalNetWeight: number;

  grossWeight: number;
  cbm: number;

  marksNumbers: string;

  grade: string;
  brand: string;
  specification: string;
};

export type ExportPacking = {
  id: string;

  /* =========================
     PACKING DOCUMENT
  ========================= */

  packingNo: string;
  packingDate: string;

  /* =========================
     SOURCE DOCUMENTS
  ========================= */

  exportOrderNo: string;
  exportOrderDate: string;

  reservationNo: string;
  reservationDate: string;

  /* =========================
     CUSTOMER / BUYER
  ========================= */

  customerCode: string;
  customerName: string;
  contactPerson: string;
  buyerCountry: string;

  /* =========================
     STATUS
  ========================= */

  status: ExportPackingStatus;

  /* =========================
     PACKED PRODUCTS
  ========================= */

  items: ExportPackingItem[];

  /* =========================
     PACKING SUMMARY
  ========================= */

  totalPackages: number;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalCBM: number;

  marksNumbers: string;

  /* =========================
     NOTES
  ========================= */

  remarks: string;

  /* =========================
     AUDIT
  ========================= */

  createdAt: string;
  updatedAt: string;
};
```

### `app/international/export/proforma/ExportProformaInvoiceTypes.ts`

```ts
export type ExportProformaInvoiceItem = {
  productCode: string;
  productName: string;
  hsCode: string;
  countryOfOrigin: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discount: number;
  amount: number;
  customerRequirement: string;
  packingType: string;
  packageQty: number;
  netWeight: number;
  grossWeight: number;
  cbm: number;
  marksNumbers: string;
  grade: string;
  brand: string;
  specification: string;
};

export type ExportProformaInvoiceStatus =
  | "Draft"
  | "Issued"
  | "Sent"
  | "Under Discussion"
  | "Accepted"
  | "Cancelled"
  | "Converted";

export type ExportProformaInvoice = {
  id: string;

  // Document Details
  proformaInvoiceNo: string;
  proformaInvoiceDate: string;
  quotationNo: string;
  enquiryNo: string;
  exportOrderNo: string;
  validityDate: string;
  status: ExportProformaInvoiceStatus;

  // Exporter / Seller
  exporterName: string;
  exporterAddress: string;
  exporterCity: string;
  exporterState: string;
  exporterCountry: string;
  exporterMobile: string;
  exporterEmail: string;
  exporterWebsite: string;
  exporterIEC: string;
  exporterGSTIN: string;
  exporterPAN: string;

  // Buyer
  customerCode: string;
  customerName: string;
  contactPerson: string;
  buyerAddress: string;
  buyerCity: string;
  buyerStateProvince: string;
  buyerPostalCode: string;
  buyerCountry: string;
  buyerTaxRegistrationNo: string;
  buyerEmail: string;
  buyerMobile: string;

  // Additional Parties
  consigneeName: string;
  consigneeAddress: string;
  consigneeCountry: string;
  importerName: string;
  importerAddress: string;
  importerCountry: string;
  notifyParty: string;

  // Buyer References
  buyerReferenceNo: string;
  buyerPONo: string;
  buyerPODate: string;
  lcNo: string;
  lcDate: string;

  // Commercial / Trade Terms
  currency: string;
  incoterm: string;
  incotermPlace: string;
  paymentTerms: string;
  paymentMethod: string;
  shipmentMode: string;
  estimatedShipmentDate: string;

  // Shipping Information
  portOfLoading: string;
  portOfDischarge: string;
  finalDestination: string;
  countryOfDestination: string;
  countryOfOrigin: string;
  vesselFlightNo: string;
  voyageNo: string;
  containerNo: string;
  sealNo: string;
  blAwbNo: string;
  blAwbDate: string;

  // Goods
  items: ExportProformaInvoiceItem[];

  // Package Summary
  totalPackages: number;
  packageType: string;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalCBM: number;
  marksNumbers: string;

  // Value Summary
  totalGoodsValue: number;
  discount: number;
  freight: number;
  insurance: number;
  otherCharges: number;
  totalProformaValue: number;

  // Currency Conversion
  exchangeRate: number;
  inrEquivalent: number;

  // Payment / Bank
  bankName: string;
  bankBranch: string;
  bankAddress: string;
  bankAccountName: string;
  bankAccountNo: string;
  swiftBic: string;
  adCode: string;
  advancePercentage: number;
  advanceAmount: number;
  balanceAmount: number;

  // Declaration
  declaration: string;
  authorizedSignatory: string;
  signatoryDesignation: string;
  place: string;

  // Remarks / Terms
  remarks: string;
  termsAndConditions: string[];

  // Audit
  createdAt: string;
  updatedAt: string;
};
```

### `app/international/export/purchase/ExportPurchaseTypes.ts`

```ts
export type ExportPurchaseItem = {
  productCode: string;
  productName: string;
  lotBatchNo: string;

  qty: number;
  receivedQty: number;

  unit: string;
  unitPrice: number;
  amount: number;

  packingType: string;
  packageQty: number;

  /**
   * Net weight of one package.
   *
   * Example:
   * 3 Bags × 25 KG = 75 KG
   */
  netWeightPerPackage?: number;

  /**
   * Total net weight of the item.
   */
  netWeight: number;

  grossWeight: number;
  cbm: number;

  remarks: string;
};

export type ExportPurchaseStatus =
  | "Draft"
  | "Received"
  | "Partially Received"
  | "Cancelled";

export type ExportPurchase = {
  id: string;

  purchaseNo: string;
  purchaseDate: string;

  supplierCode: string;
  supplierName: string;
  contactPerson: string;

  supplierInvoiceNo: string;
  supplierInvoiceDate: string;

  currency: string;
  exchangeRate: number;

  paymentTerms: string;
  paymentMethod: string;

  incoterm: string;
  shipmentMode: string;

  expectedReceiptDate: string;

  items: ExportPurchaseItem[];

  totalPackages: number;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalCBM: number;

  totalGoodsValue: number;

  freight: number;
  insurance: number;
  customsDuty: number;
  portCharges: number;
  clearingCharges: number;
  otherCharges: number;

  totalPurchaseValue: number;
  inrEquivalent: number;

  status: ExportPurchaseStatus;

  remarks: string;

  createdAt: string;
  updatedAt: string;
};
```

### `app/international/export/quotation/ExportQuotationTypes.ts`

```ts
export type ExportQuotationItem = {
  productCode: string;
  productName: string;
  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;
  customerRequirement: string;
};

export type ExportQuotation = {
  id: string;

  quotationNo: string;
  quotationDate: string;

  enquiryNo: string;

  customerCode: string;
  customerName: string;
  contactPerson: string;
  country: string;

  currency: string;

  items: ExportQuotationItem[];

  validityDate: string;

  incoterm: string;
  paymentTerms: string;

  freight: number;
  insurance: number;
  otherCharges: number;

  totalGoodsValue: number;
  totalQuotationValue: number;

  remarks: string;

  status:
    | "Draft"
    | "Sent"
    | "Under Discussion"
    | "Accepted"
    | "Rejected"
    | "Cancelled";

  createdAt: string;
  updatedAt: string;
};
```

### `app/international/export/reservation/ExportReservationTypes.ts`

```ts
export type ExportReservationItem = {
  productCode: string;
  productName: string;

  hsCode: string;

  lotBatchNo: string;

  orderQty: number;
  reserveQty: number;

  unit: string;

  packingType: string;
  packageQty: number;

  netWeight: number;
  grossWeight: number;
  cbm: number;

  marksNumbers: string;

  reservedStockId: string;
};

export type ExportReservationStatus =
  | "Draft"
  | "Reserved"
  | "Partially Packed"
  | "Packed"
  | "Cancelled";

export type ExportReservation = {
  id: string;

  // Reservation Document
  reservationNo: string;
  reservationDate: string;

  // Source Export Order
  exportOrderNo: string;
  exportOrderDate: string;

  // Customer / Buyer
  customerCode: string;
  customerName: string;
  contactPerson: string;
  buyerCountry: string;

  // Reservation Status
  status: ExportReservationStatus;

  // Reserved Products
  items: ExportReservationItem[];

  // Summary
  totalReservedQty: number;
  totalPackages: number;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalCBM: number;

  // Notes
  remarks: string;

  // Audit
  createdAt: string;
  updatedAt: string;
};
```

### `app/international/export/shipment/ShipmentTypes.ts`

```ts
export type ShipmentStatus =
  | "Draft"
  | "Booked"
  | "Cargo Ready"
  | "Stuffed"
  | "Customs Filed"
  | "Customs Cleared"
  | "LEO Received"
  | "Gate Out"
  | "Shipped"
  | "In Transit"
  | "Arrived"
  | "Closed"
  | "Cancelled";

export type ShipmentMode =
  | "Sea"
  | "Air"
  | "Road"
  | "Courier"
  | "Multimodal"
  | "Other";

export interface ShipmentCargoItem {
  id: string;
  productCode: string;
  productName: string;
  hsCode: string;
  lotBatchNo: string;
  quantity: number;
  unit: string;
  packingType: string;
  packages: number;
  netWeight: number;
  grossWeight: number;
  cbm: number;
  marksNumbers: string;
}

export interface ShipmentContainer {
  id: string;
  containerNo: string;
  containerType: string;
  containerSize: string;
  sealNo: string;
  sealDate: string;
  packages: number;
  netWeight: number;
  grossWeight: number;
  cbm: number;
  stuffingDate: string;
  stuffingLocation: string;
  remarks: string;
}

export interface ShipmentDocument {
  id: string;
  documentType: string;
  documentNo: string;
  documentDate: string;
  issueDate: string;
  expiryDate: string;
  issuedBy: string;
  referenceNo: string;
  status: string;
  attachmentName: string;
  remarks: string;
}

export interface ShipmentCertificate {
  id: string;
  certificateType: string;
  required: boolean;
  documentNo: string;
  issueDate: string;
  expiryDate: string;
  issuedBy: string;
  status: string;
  attachmentName: string;
  remarks: string;
}

export interface ShipmentTimelineItem {
  id: string;
  status: ShipmentStatus;
  date: string;
  remarks: string;
}

export interface Shipment {
  id: string;

  shipmentNo: string;
  shipmentDate: string;

  exportOrderNo: string;
  reservationNo: string;
  packingNo: string;
  commercialInvoiceNo: string;

  customerCode: string;
  customerName: string;
  country: string;
  currency: string;

  shipmentMode: ShipmentMode;
  freightType: string;

  freightForwarder: string;
  customsBroker: string;
  transporter: string;
  shippingLine: string;
  airline: string;

  bookingNo: string;
  bookingDate: string;

  portOfLoading: string;
  portOfDischarge: string;
  finalDestination: string;
  countryOfDischarge: string;
  countryOfFinalDestination: string;

  vehicleNo: string;
  pickupDate: string;

  shippingBillNo: string;
  shippingBillDate: string;
  shippingBillType: string;
  customsLocation: string;
  iec: string;
  chaCode: string;

  fobValue: number;
  fobCurrency: string;

  customsStatus: string;

  leoNo: string;
  leoDate: string;
  leoStatus: string;

  blNo: string;
  blDate: string;
  masterBlNo: string;
  houseBlNo: string;

  awbNo: string;
  awbDate: string;
  mawbNo: string;
  hawbNo: string;

  etd: string;
  eta: string;
  actualDeparture: string;
  actualArrival: string;

  bookingMilestoneDate: string;
  cargoReadyDate: string;
  stuffingDate: string;
  gateInDate: string;
  customsFilingDate: string;
  gateOutDate: string;

  insuranceRequired: boolean;
  insuranceCompany: string;
  insurancePolicyNo: string;
  insuranceCertificateNo: string;
  insurancePolicyDate: string;
  insuranceExpiryDate: string;
  insuranceValue: number;
  insuranceCurrency: string;
  insuranceCoverage: string;
  insurancePremium: number;

  freightAmount: number;
  freightCurrency: string;
  freightPaidBy: string;
  oceanFreight: number;
  airFreight: number;
  chaCharges: number;
  transportCharges: number;
  portCharges: number;
  documentationCharges: number;
  otherCharges: number;
  totalShipmentCharges: number;

  invoiceAmount: number;
  paymentStatus: string;

  status: ShipmentStatus;

  cargoItems: ShipmentCargoItem[];
  containers: ShipmentContainer[];
  documents: ShipmentDocument[];
  certificates: ShipmentCertificate[];
  timeline: ShipmentTimelineItem[];

  remarks: string;

  createdAt: string;
  updatedAt: string;
}
```

### `app/international/export/stock/InternationalExportStockTypes.ts`

```ts
export type InternationalExportStockSource =
  | "Opening Stock"
  | "Purchase";

export type InternationalExportStock = {
  id: string;

  productCode: string;
  productName: string;

  lotBatchNo: string;

  availableQty: number;
  reservedQty: number;
  packedQty: number;
  loadedQty: number;
  shippedQty: number;

  unit: string;

  source: InternationalExportStockSource;
  purchaseReference: string;

  createdAt: string;
  updatedAt: string;
};
```

### `app/product/components/ProductTypes.ts`

```ts
/* =========================================================
   UK EXIM ERP – PRODUCT TYPES
   VERSION 1.0 – FINAL PRODUCT MASTER

   UOM:
   Gram | KG | Pkt

   COST:
   Base Cost + Packing Cost + Other Charges
   = Total Cost
========================================================= */

export type ProductUnit =
  | "Gram"
  | "KG"
  | "Pkt";

export type Product = {
  /* =========================
     BASIC PRODUCT DETAILS
  ========================= */

  id: string;

  code: string;

  name: string;

  category: string;

  hsn: string;

  gst: string;

  /* =========================
     UOM / PACKING
  ========================= */

  unit: ProductUnit;

  /*
    Net Weight of one product unit.

    Examples:
    Uttam Haldi 50 g  → 50
    Uttam Haldi 100 g → 100
    Loose Haldi       → 0 or actual weight
  */

  netWeight: number;
  stockBaseCode?: string;
  /* =========================
     EXISTING PRICING
     KEEPING THESE FIELDS
     FOR LIVE DATA COMPATIBILITY
  ========================= */

  purchase: number;

  sale: number;

  mrp: number;

  /* =========================
     PRODUCT COST STRUCTURE
  ========================= */

  /*
    Basic raw-material / product cost
  */

  baseCost: number;

  /*
    Packing cost per Product UOM

    Example:
    50 g Pkt → packing cost per packet
  */

  packingCost: number;

  /*
    Other applicable cost per Product UOM

    Processing / handling / other charges
  */

  otherCharges: number;

  /*
    Automatically calculated:

    baseCost
    + packingCost
    + otherCharges
  */

  totalCost: number;

  /* =========================
     STOCK
  ========================= */

  stock: number;

  minimumStock: number;

  /* =========================
     STATUS
  ========================= */

  active: boolean;
};
```

## 4. Proposed PostgreSQL mapping (design proposal, not existing code)

### 4.1 Common online ownership and audit columns to add

| Proposed column | PostgreSQL type | Purpose |
|---|---|---|
| `company_id` | `uuid NOT NULL` | Tenant ownership; added to every company-owned business record. |
| `created_at` | `timestamptz` | Server-side creation timestamp; where source has `createdAt`, map carefully and preserve source value. |
| `updated_at` | `timestamptz` | Server-side update timestamp; where source has `updatedAt`, preserve and map carefully. |
| `created_by` | `uuid NULL` | Authenticated user who created record; new audit field. |
| `updated_by` | `uuid NULL` | Authenticated user who last updated record; new audit field. |

Do not rename or remove existing source fields during first migration. Prefer snake_case database columns with an explicit TypeScript mapping layer, or retain camelCase columns if minimizing mapping risk is more important. Pick one convention before SQL migrations are generated.

### 4.2 Candidate tables based on source types

| Source type | Candidate SQL table | Notes |
|---|---|---|
| `Customer` | `customers` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `PurchaseItem` | `purchase_items` | Embedded in `Purchase.items`; relational child table proposed to support reporting and stock movement linking. Preserve line snapshots. |
| `Purchase` | `purchases` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `SalesItem` | `sales_items` | Embedded in `Sales.items`; relational child table proposed to support reporting and stock movement linking. Preserve line snapshots. |
| `Sales` | `sales` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `Stock` | `stock_baselines` | Proposed protected imported baseline; source type has no separate database concept. Do not rebuild from historical transactions. |
| `StockMovementRecord` | `stock_movement_transactions` | New representation of `uk-exim-stock-movements-v1`; append-only transaction-level movement state. |
| `StockMovementLine` | `stock_movements` | New child rows; preserve line/product/stock codes, direction, converted quantity and source-unit snapshot. |
| `LedgerJournal` | `stock_movement_recovery_journal` | New recovery intent record corresponding to the journal LocalStorage key; include expected transaction snapshot and movement record. Exact JSON shape is source-defined in `StockMovementStorage.ts`. |
| `CompanySettings` | `company_settings` | Inline type in Settings.tsx; one row per company in the proposed online model. |
| `InvoiceSettings` | `invoice_settings` | Inline type in Settings.tsx; numbering behavior requires locking/transaction handling online. |
| `BankSettings` | `bank_settings` | Inline type in Settings.tsx; protect account details and limit access. |
| `InternationalSettings` | `international_settings` | Inline type in Settings.tsx. |
| `Supplier` | `suppliers` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportCustomer` | `export_customers` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportEnquiryItem` | `export_enquiry_items` | Embedded child rows; preserve item snapshots. |
| `ExportEnquiry` | `export_enquiries` | Main entity candidate; company-owned. |
| `ExportCommercialInvoiceItem` | `export_commercial_invoice_items` | Embedded child rows; preserve item snapshots. |
| `ExportCommercialInvoiceStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ExportCommercialInvoice` | `export_commercial_invoices` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportOrderItem` | `export_order_items` | Embedded child rows; preserve item snapshots. |
| `ExportOrderStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ExportOrder` | `export_orders` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportPackingStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ExportPackingItem` | `export_packing_items` | Embedded child rows; preserve item snapshots. |
| `ExportPacking` | `export_packings` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportProformaInvoiceItem` | `export_proforma_invoice_items` | Embedded child rows; preserve item snapshots. |
| `ExportProformaInvoiceStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ExportProformaInvoice` | `export_proforma_invoices` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportPurchaseItem` | `export_purchase_items` | Embedded child rows; preserve item and received quantity snapshots. |
| `ExportPurchaseStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ExportPurchase` | `export_purchases` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportQuotationItem` | `export_quotation_items` | Embedded child rows; preserve item snapshots. |
| `ExportQuotation` | `export_quotations` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportReservationItem` | `export_reservation_items` | Embedded child rows; preserve reserved stock references and quantities. |
| `ExportReservationStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ExportReservation` | `export_reservations` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ShipmentStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ShipmentMode` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ShipmentCargoItem` | `shipment_cargo_items` | Embedded child rows; preserve cargo snapshots. |
| `ShipmentContainer` | `shipment_containers` | Embedded child rows. |
| `ShipmentDocument` | `shipment_documents` | Embedded metadata rows; attachment files are separate private objects. |
| `ShipmentCertificate` | `shipment_certificates` | Embedded metadata rows; attachment files are separate private objects. |
| `ShipmentTimelineItem` | `shipment_timeline_items` | Embedded event history; preserve dates and status values. |
| `Shipment` | `shipments` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `InternationalExportStockSource` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `InternationalExportStock` | `international_export_stock` | Separate export inventory table; preserve lot/batch and source references; do not merge with domestic stock. |
| `ProductUnit` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `Product` | `products` | Main entity candidate; add company_id and tenant-scoped constraints. |

### 4.3 Type mapping guidance

| TypeScript source type | Suggested PostgreSQL type | Caution |
|---|---|---|
| `string` | `text` initially | For date-like strings, inspect actual values and UI format before choosing `date` / `timestamptz`. |
| `number` | PostgreSQL `numeric` candidate; precision/scale unresolved per field | JavaScript numbers are binary floating point. Review each amount, rate, percentage, weight and quantity's permitted range and rounding before choosing precision/scale. Preserve stored historical totals; do not recompute them on import. |
| `boolean` | `boolean` | Preserve true/false semantics. |
| literal union | `text` + `CHECK` or PostgreSQL enum | Keep exact spelling/case/spaces; statuses may evolve. |
| `T[]` nested arrays | child table or `jsonb` | Prefer child tables for independently searched, joined, stock-affecting or reportable rows; JSONB only where appropriate. |

## 5. Relationship candidates inferred from source field names

These are **inferences**, not enforced relationships in the current source. Existing documents often store both codes and display names. Migration must preserve those snapshots even after normalized foreign keys are added.

- `products` ↔ `purchase_items` / `sales_items`: source uses `productCode` and `productName`; confirm product code uniqueness per company.
- `suppliers` ↔ `purchases`: source uses `supplierCode` and `supplierName` in Purchase; Export Purchase uses the same supplier code/name pattern.
- `customers` ↔ `sales`: source uses `customerCode` and `customerName`.
- `export_customers` ↔ export enquiries, quotations, proforma invoices, orders, reservations, shipments and commercial invoices: source uses customer code/name fields. Do not assume export customer and domestic customer are the same entity.
- Export workflow document references: enquiry → quotation → proforma invoice → export order → reservation → packing → shipment → commercial invoice. The source records reference documents mainly by document-number strings; confirm actual linking logic in Storage files before adding foreign keys.
- `international_export_stock` and reservation items use `lotBatchNo`, `reservedStockId`, and quantity fields; inspect stock mutation logic carefully before relational stock ledger design.

## 6. Single-company online ownership and future control-plane (proposed)

The immediate online release is for UK EXIM ENTERPRISES only. `companies`, `profiles`, `company_members` and `document_sequences` are proposed foundations for company ownership, login membership and safe numbering. Subscription, plan and SaaS billing tables are explicitly deferred to a later approved phase.

| Proposed table | Core columns (proposal) |
|---|---|
| `companies` | `id uuid`, `name`, `slug`, `status`, `created_at` |
| `profiles` | `id uuid` (auth user id), `full_name`, `email`, `created_at` |
| `company_members` | `id uuid`, `company_id`, `user_id`, `role`, `status`, `created_at` |
| `audit_logs` | `id`, `company_id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `metadata_jsonb`, `created_at` |
| `document_sequences` | `id`, `company_id`, `document_type`, `financial_year`, `prefix`, `next_number` |

These are proposed new online fields/tables, not current source fields. The owner must approve role definitions, sequence reset/financial-year rules and retention before implementation.

## 7. Migration rules and safeguards

1. Preserve original string IDs and document numbers during first migration; add new internal UUID primary keys only with a stable legacy ID mapping if needed.
2. Add `company_id` to every tenant-owned record. Never infer a company from customer/supplier names; map records explicitly to the correct tenant.
3. Keep original `productCode`, `customerCode`, `supplierCode`, invoice/document numbers and their exact values.
4. Keep document line-item values and header totals as stored; separately compare recalculated totals. Do not silently recompute and overwrite historical values.
5. Use database transactions for document header + child rows + stock effects.
6. Create tenant-scoped unique constraints, for example `(company_id, product_code)` only after confirming uniqueness requirements.
7. Enable and test PostgreSQL RLS on every tenant-owned table. Client-side filtering alone is not security.
8. Test cross-company read, insert, update and delete denial with two separate test companies.
9. Keep the existing Version 1.0 project and localStorage data unchanged during development. Perform migration only from an exported copy into a separate test database.
10. Do not use the existing Restore function for migration testing.

## 8. Remaining questions before final SQL or real-data import

- Actual record values, shape drift, null/empty-string conventions, duplicates and orphan references remain unknown because browser storage was not accessed.
- Whether every current source field is populated in existing records remains unknown; interface-required does not prove stored-record validity.
- Product codes, customer/supplier codes, document numbers and export references have no verified database uniqueness scope yet.
- Date-only business fields are strings; distinguish local business dates from instants before choosing `date` or `timestamptz`. `postedAt` is an ISO timestamp and cutover comparison uses an explicit IST-equivalent UTC instant.
- Amount, tax, foreign-currency, exchange-rate and quantity precision/rounding policies are unresolved. Preserve stored totals and compare recomputed totals separately during staging.
- Settings shapes are inline in `Settings.tsx`; form defaults are source behavior, not database defaults and may differ from actual saved settings.
- Export document associations are mainly code/number snapshots; exact storage mutation relationships must be retained without inventing foreign keys.
- Backup allowlist coverage was source-inspected, but runtime backup, restore, encryption, offsite retention and recovery procedures remain untested. Do not test against Chrome LocalStorage.

## 9. Source files reviewed

- `app/components/customer/CustomerTypes.ts`
- `app/components/customer/purchase/PurchaseTypes.ts`
- `app/components/customer/sales/SalesTypes.ts`
- `app/components/stock/StockTypes.ts`
- `app/components/supplier/SupplierTypes.ts`
- `app/international/export/customer/ExportCustomerTypes.ts`
- `app/international/export/enquiry/ExportEnquiryTypes.ts`
- `app/international/export/invoice/ExportCommercialInvoiceTypes.ts`
- `app/international/export/order/ExportOrderTypes.ts`
- `app/international/export/packing/PackingTypes.ts`
- `app/international/export/proforma/ExportProformaInvoiceTypes.ts`
- `app/international/export/purchase/ExportPurchaseTypes.ts`
- `app/international/export/quotation/ExportQuotationTypes.ts`
- `app/international/export/reservation/ExportReservationTypes.ts`
- `app/international/export/shipment/ShipmentTypes.ts`
- `app/international/export/stock/InternationalExportStockTypes.ts`
- `app/product/components/ProductTypes.ts`
- `app/utils/ERPBackup.ts`
- `app/components/settings/Settings.tsx`
- All discovered `*Storage.ts` files for localStorage key declarations.
- `app/components/stock/StockMovementStorage.ts` for post-cutover movement, journal and lock definitions.
- Relevant transaction forms/masters and reports for source defaults, write flows and calculations.

---
**Status:** Source field inventories and storage definitions are documented from the specified repository baseline. The companion PostgreSQL proposal is not an approved production schema. Do not create a database or begin migration until the owner approves the next stage.
