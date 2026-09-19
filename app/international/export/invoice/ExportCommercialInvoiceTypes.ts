export type ExportCommercialInvoiceItem = {
  productCode: string;
  productName: string;
  hsCode: string;
  countryOfOrigin: string;

  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;

  packingType: string;
  packageQty: number;
  netWeight: number;
  grossWeight: number;
  cbm: number;

  customerRequirement: string;
  grade: string;
  brand: string;
  specification: string;
  marksNumbers: string;
};

export type ExportCommercialInvoiceStatus =
  | "Draft"
  | "Issued"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Cancelled"
  | "Completed";

export type ExportCommercialInvoice = {
  id: string;

  /* =====================================================
     INVOICE DETAILS
  ====================================================== */

  invoiceNo: string;
  invoiceDate: string;

  orderNo: string;
  proformaInvoiceNo: string;
  quotationNo: string;
  enquiryNo: string;

  /* =====================================================
     EXPORTER / SELLER
  ====================================================== */

  exporterName: string;
  exporterAddress: string;
  exporterCity: string;
  exporterState: string;
  exporterCountry: string;

  exporterIEC: string;
  exporterGSTIN: string;
  exporterPAN: string;

  exporterMobile: string;
  exporterEmail: string;
  exporterWebsite: string;

  /* =====================================================
     BUYER / CONSIGNEE
  ====================================================== */

  customerCode: string;
  customerName: string;
  contactPerson: string;

  buyerAddress: string;
  buyerCity: string;
  buyerStateProvince: string;
  buyerCountry: string;
  buyerPostalCode: string;

  buyerTaxRegistrationNo: string;

  /* =====================================================
     SHIPPING INFORMATION
  ====================================================== */

  countryOfOrigin: string;
  finalDestination: string;

  portOfLoading: string;
  portOfDischarge: string;

  shipmentMode: string;
  incoterm: string;
  currency: string;

  shipmentNo: string;

  containerNo: string;
  sealNo: string;

  vesselName: string;
  voyageNo: string;

  blNo: string;
  blDate: string;

  awbNo: string;
  awbDate: string;

  /* =====================================================
     GOODS
  ====================================================== */

  items: ExportCommercialInvoiceItem[];

  totalPackages: number;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalCBM: number;

  /* =====================================================
     VALUE DETAILS
  ====================================================== */

  totalGoodsValue: number;

  freight: number;
  insurance: number;
  otherCharges: number;

  totalInvoiceValue: number;

  exchangeRate: number;
  inrEquivalent: number;

  /* =====================================================
     PAYMENT
  ====================================================== */

  paymentTerms: string;
  paymentMethod: string;

  advanceReceived: number;
  balanceDue: number;

  bankName: string;
  bankBranch: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankIFSC: string;
  bankSwiftBic: string;

  /* =====================================================
     DOCUMENT / DECLARATION
  ====================================================== */

  marksNumbers: string;

  packingDetails: string;

  declaration: string;

  authorizedSignatory: string;

  /* =====================================================
     STATUS / CONTROL
  ====================================================== */

  status: ExportCommercialInvoiceStatus;

  remarks: string;

  createdAt: string;
  updatedAt: string;
};