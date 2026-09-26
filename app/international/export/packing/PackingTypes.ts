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