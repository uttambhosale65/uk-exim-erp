export type Sales = {
  id: string;

  // Sales Details
  salesNo: string;
  salesDate: string;
  invoiceNo: string;

  // Customer
  customerCode: string;
  customerName: string;

  // Product
  productCode: string;
  productName: string;

  // Product Details
  hsn: string;
  unit: string;

  // Quantity & Rate
  qty: number;
  rate: number;

  // Amount Details
  amount: number;
  gst: number;
  gstAmount: number;
  netAmount: number;

  // GST Breakup (Future Use)
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;

  // Other Details
  remarks: string;
};