export type Purchase = {
  id: string;

  purchaseNo: string;
  purchaseDate: string;
  invoiceNo: string;

  supplierCode: string;
  supplierName: string;

  productCode: string;
  productName: string;

  hsn: string;
  unit: string;

  qty: number;
  rate: number;
  amount: number;
};