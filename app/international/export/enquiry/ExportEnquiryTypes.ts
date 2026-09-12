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