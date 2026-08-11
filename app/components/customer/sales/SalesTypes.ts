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

  // Customer
  customerCode: string;
  customerName: string;

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