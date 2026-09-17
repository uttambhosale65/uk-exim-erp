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