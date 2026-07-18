export type Sales = {
  id: string;

  salesNo: string;
  salesDate: string;
  invoiceNo: string;

  customerCode: string;
  customerName: string;

  productCode: string;
  productName: string;

  hsn: string;
  unit: string;

  qty: number;
  rate: number;
  amount: number;

  gst: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
};