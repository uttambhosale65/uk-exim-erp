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