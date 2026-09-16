export type ExportOrderItem = {
  productCode: string;
  productName: string;
  hsCode: string;
  countryOfOrigin: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discount: number;
  amount: number;
  customerRequirement: string;
  packingType: string;
  packageQty: number;
  netWeight: number;
  grossWeight: number;
  cbm: number;
  marksNumbers: string;
  grade: string;
  brand: string;
  specification: string;
};

export type ExportOrderStatus =
  | "Draft"
  | "Confirmed"
  | "Processing"
  | "Partially Shipped"
  | "Shipped"
  | "Completed"
  | "Cancelled";

export type ExportOrder = {
  id: string;

  // Document / Workflow
  exportOrderNo: string;
  exportOrderDate: string;
  proformaInvoiceNo: string;
  quotationNo: string;
  enquiryNo: string;
  status: ExportOrderStatus;

  // Exporter / Seller
  exporterName: string;
  exporterAddress: string;
  exporterCity: string;
  exporterState: string;
  exporterCountry: string;
  exporterMobile: string;
  exporterEmail: string;
  exporterWebsite: string;
  exporterIEC: string;
  exporterGSTIN: string;
  exporterPAN: string;

  // Customer / Buyer
  customerCode: string;
  customerName: string;
  contactPerson: string;
  buyerAddress: string;
  buyerCity: string;
  buyerStateProvince: string;
  buyerPostalCode: string;
  buyerCountry: string;
  buyerTaxRegistrationNo: string;
  buyerEmail: string;
  buyerMobile: string;

  // Consignee / Importer
  consigneeName: string;
  consigneeAddress: string;
  consigneeCountry: string;

  importerName: string;
  importerAddress: string;
  importerCountry: string;

  notifyParty: string;

  // Buyer References
  buyerReferenceNo: string;
  buyerPONo: string;
  buyerPODate: string;

  lcNo: string;
  lcDate: string;

  // Commercial / Trade Terms
  currency: string;
  incoterm: string;
  incotermPlace: string;
  paymentTerms: string;
  paymentMethod: string;

  // Shipment Planning
  shipmentMode: string;
  estimatedShipmentDate: string;

  portOfLoading: string;
  portOfDischarge: string;
  finalDestination: string;
  countryOfDestination: string;
  countryOfOrigin: string;

  // Products
  items: ExportOrderItem[];

  // Package / Weight Summary
  totalPackages: number;
  packageType: string;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalCBM: number;
  marksNumbers: string;

  // Commercial Value
  totalGoodsValue: number;
  discount: number;
  freight: number;
  insurance: number;
  otherCharges: number;
  totalOrderValue: number;

  // Currency Conversion
  exchangeRate: number;
  inrEquivalent: number;

  // Payment Summary
  advancePercentage: number;
  advanceAmount: number;
  balanceAmount: number;

  // Order / Execution Notes
  remarks: string;
  termsAndConditions: string[];

  // Audit
  createdAt: string;
  updatedAt: string;
};