# UK EXIM ERP – Cloud Database Data Dictionary v1.0

**Document status:** Source-derived draft for architecture and migration planning  
**Source baseline:** Current repository checkout at Git commit `29db49d` (UK EXIM ERP Version 1.0 source).
**Application stack in source:** Next.js / React / TypeScript  
**Important:** This document records fields present in the supplied TypeScript source. Proposed database design notes are clearly labelled; they are not existing application fields.

## 1. Scope and interpretation

- The exact field names and TypeScript types below are copied from the `*Types.ts` files in the current repository checkout recorded above.
- `string`, `number`, `boolean`, literal unions, optional fields (`?`) and arrays are preserved as authored.
- Nested `items`, `cargoItems`, `containers`, `documents`, `certificates`, and `timeline` are currently TypeScript arrays. The source does not itself prove whether they must be separate SQL tables or JSONB; the proposed relational mapping is described later.
- The source contains no `company_id` field in the business types. `company_id` is a **new SaaS tenancy field to be added during migration**, not an existing field.
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
| `uk-exim-sales-numbering-v2` | `app/sales/page.tsx` |

**Keys found:** 22

### Backup coverage finding

`app/utils/ERPBackup.ts` currently defines `BACKUP_KEYS` with all 22 source-identified keys:

- `uk-exim-products`
- `uk-exim-customers`
- `uk-exim-suppliers`
- `uk-exim-purchases`
- `uk-exim-sales`
- `uk-exim-stock`
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
- `uk-exim-sales-numbering-v2`

**Source comparison:** All 22 keys in the inventory above are included in the current `BACKUP_KEYS` allowlist. There are no inventory keys currently missing from that allowlist. `createERPBackup()` reads only listed keys that exist and attempts to JSON-parse their values; this statement describes source code and is not a backup or restore test. The current restore implementation accepts recognized keys, snapshots values for those keys, writes supplied recognized entries, and attempts rollback if a write fails. Do not use Restore for migration testing. Backup and recovery reliability, backup file validation, and operational procedures remain unverified and require separate review before migration.

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

### 4.1 Common SaaS columns to add

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
| `PurchaseItem` | `purchaseitems` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `Purchase` | `purchases` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `SalesItem` | `salesitems` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `Sales` | `saless` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `Stock` | `stocks` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `Supplier` | `suppliers` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportCustomer` | `export_customers` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportEnquiryItem` | `exportenquiryitems` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `ExportEnquiry` | `export_enquirys` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportCommercialInvoiceItem` | `exportcommercialinvoiceitems` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `ExportCommercialInvoiceStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ExportCommercialInvoice` | `export_commercial_invoices` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportOrderItem` | `exportorderitems` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `ExportOrderStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ExportOrder` | `export_orders` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportPackingStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ExportPackingItem` | `exportpackingitems` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `ExportPacking` | `export_packings` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportProformaInvoiceItem` | `exportproformainvoiceitems` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `ExportProformaInvoiceStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ExportProformaInvoice` | `export_proforma_invoices` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportPurchaseItem` | `exportpurchaseitems` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `ExportPurchaseStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ExportPurchase` | `export_purchases` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportQuotationItem` | `exportquotationitems` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `ExportQuotation` | `export_quotations` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ExportReservationItem` | `exportreservationitems` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `ExportReservationStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ExportReservation` | `export_reservations` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ShipmentStatus` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ShipmentMode` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `ShipmentCargoItem` | `shipmentcargoitems` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `ShipmentContainer` | `shipmentcontainers` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `ShipmentDocument` | `shipmentdocuments` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `ShipmentCertificate` | `shipmentcertificates` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `ShipmentTimelineItem` | `shipmenttimelineitems` | Nested source structure; decide separate child table vs JSONB after checking how UI queries/updates it. |
| `Shipment` | `shipments` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `InternationalExportStockSource` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `InternationalExportStock` | `international_export_stocks` | Main entity candidate; add company_id and tenant-scoped constraints. |
| `ProductUnit` | `(enum / check constraint candidate)` | Preserve exact literal values from source. |
| `Product` | `products` | Main entity candidate; add company_id and tenant-scoped constraints. |

### 4.3 Type mapping guidance

| TypeScript source type | Suggested PostgreSQL type | Caution |
|---|---|---|
| `string` | `text` initially | For date-like strings, inspect actual values and UI format before choosing `date` / `timestamptz`. |
| `number` | `numeric(18, 4)` candidate | Do not use floating-point for currency/quantity totals without reviewing precision and calculations. Choose precision per field. |
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

## 6. SaaS control-plane tables (new; not present in current source)

| Proposed table | Core columns (proposal) |
|---|---|
| `companies` | `id uuid`, `name`, `slug`, `status`, `created_at` |
| `profiles` | `id uuid` (auth user id), `full_name`, `email`, `created_at` |
| `company_members` | `id uuid`, `company_id`, `user_id`, `role`, `status`, `created_at` |
| `plans` | `id`, `code`, `name`, `billing_interval`, `limits_jsonb`, `active` |
| `subscriptions` | `id`, `company_id`, `plan_id`, `status`, `start_at`, `end_at`, `billing_customer_ref` |
| `audit_logs` | `id`, `company_id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `metadata_jsonb`, `created_at` |
| `document_sequences` | `id`, `company_id`, `document_type`, `financial_year`, `prefix`, `next_number` |

These are proposed SaaS tables only. They must not be confused with existing fields or implemented until access rules and numbering behavior are specified.

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

## 8. Items requiring further source inspection before final SQL

- Actual data values and null/empty-string conventions in localStorage records.
- Full storage mutation logic, especially Purchase, Sales, Stock, Export Reservation, Packing and Shipment.
- Company, Invoice, Bank and International Settings object shapes; the audit source stores these in Settings.tsx rather than dedicated `*Types.ts` files.
- Document numbering generation and whether numbers are globally unique or company/financial-year scoped.
- Whether stock quantities are derived from transactions or persisted as current balances in each module.
- Exact relationships between Export documents, currently represented by document number strings in source types.
- The current source allowlist covers all 22 inventoried keys. Backup and recovery reliability, restore behavior under real browser conditions, and operational procedures have not been tested in this documentation audit; review those separately before migration. Do not test against the owner's live Chrome LocalStorage.

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

---
**Status:** This is a source-derived Data Dictionary draft. It is not yet an approved production SQL schema. The next safe deliverable is a field-by-field relational mapping and migration specification, followed by SQL migrations in a separate development environment.
