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