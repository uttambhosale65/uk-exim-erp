export type ExportProformaInvoiceItem = {
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

export type ExportProformaInvoiceStatus =
  | "Draft"
  | "Issued"
  | "Sent"
  | "Under Discussion"
  | "Accepted"
  | "Cancelled"
  | "Converted";

export type ExportProformaInvoice = {
  id: string;

  // Document Details
  proformaInvoiceNo: string;
  proformaInvoiceDate: string;
  quotationNo: string;
  enquiryNo: string;
  exportOrderNo: string;
  validityDate: string;
  status: ExportProformaInvoiceStatus;

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

  // Buyer
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

  // Additional Parties
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
  shipmentMode: string;
  estimatedShipmentDate: string;

  // Shipping Information
  portOfLoading: string;
  portOfDischarge: string;
  finalDestination: string;
  countryOfDestination: string;
  countryOfOrigin: string;
  vesselFlightNo: string;
  voyageNo: string;
  containerNo: string;
  sealNo: string;
  blAwbNo: string;
  blAwbDate: string;

  // Goods
  items: ExportProformaInvoiceItem[];

  // Package Summary
  totalPackages: number;
  packageType: string;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalCBM: number;
  marksNumbers: string;

  // Value Summary
  totalGoodsValue: number;
  discount: number;
  freight: number;
  insurance: number;
  otherCharges: number;
  totalProformaValue: number;

  // Currency Conversion
  exchangeRate: number;
  inrEquivalent: number;

  // Payment / Bank
  bankName: string;
  bankBranch: string;
  bankAddress: string;
  bankAccountName: string;
  bankAccountNo: string;
  swiftBic: string;
  adCode: string;
  advancePercentage: number;
  advanceAmount: number;
  balanceAmount: number;

  // Declaration
  declaration: string;
  authorizedSignatory: string;
  signatoryDesignation: string;
  place: string;

  // Remarks / Terms
  remarks: string;
  termsAndConditions: string[];

  // Audit
  createdAt: string;
  updatedAt: string;
};