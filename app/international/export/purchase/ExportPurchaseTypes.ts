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