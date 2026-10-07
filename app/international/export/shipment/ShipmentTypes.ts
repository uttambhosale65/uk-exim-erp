export type ShipmentStatus =
  | "Draft"
  | "Booked"
  | "Cargo Ready"
  | "Stuffed"
  | "Customs Filed"
  | "Customs Cleared"
  | "LEO Received"
  | "Gate Out"
  | "Shipped"
  | "In Transit"
  | "Arrived"
  | "Closed"
  | "Cancelled";

export type ShipmentMode =
  | "Sea"
  | "Air"
  | "Road"
  | "Courier"
  | "Multimodal"
  | "Other";

export interface ShipmentCargoItem {
  id: string;
  productCode: string;
  productName: string;
  hsCode: string;
  lotBatchNo: string;
  quantity: number;
  unit: string;
  packingType: string;
  packages: number;
  netWeight: number;
  grossWeight: number;
  cbm: number;
  marksNumbers: string;
}

export interface ShipmentContainer {
  id: string;
  containerNo: string;
  containerType: string;
  containerSize: string;
  sealNo: string;
  sealDate: string;
  packages: number;
  netWeight: number;
  grossWeight: number;
  cbm: number;
  stuffingDate: string;
  stuffingLocation: string;
  remarks: string;
}

export interface ShipmentDocument {
  id: string;
  documentType: string;
  documentNo: string;
  documentDate: string;
  issueDate: string;
  expiryDate: string;
  issuedBy: string;
  referenceNo: string;
  status: string;
  attachmentName: string;
  remarks: string;
}

export interface ShipmentCertificate {
  id: string;
  certificateType: string;
  required: boolean;
  documentNo: string;
  issueDate: string;
  expiryDate: string;
  issuedBy: string;
  status: string;
  attachmentName: string;
  remarks: string;
}

export interface ShipmentTimelineItem {
  id: string;
  status: ShipmentStatus;
  date: string;
  remarks: string;
}

export interface Shipment {
  id: string;

  shipmentNo: string;
  shipmentDate: string;

  exportOrderNo: string;
  reservationNo: string;
  packingNo: string;
  commercialInvoiceNo: string;

  customerCode: string;
  customerName: string;
  country: string;
  currency: string;

  shipmentMode: ShipmentMode;
  freightType: string;

  freightForwarder: string;
  customsBroker: string;
  transporter: string;
  shippingLine: string;
  airline: string;

  bookingNo: string;
  bookingDate: string;

  portOfLoading: string;
  portOfDischarge: string;
  finalDestination: string;
  countryOfDischarge: string;
  countryOfFinalDestination: string;

  vehicleNo: string;
  pickupDate: string;

  shippingBillNo: string;
  shippingBillDate: string;
  shippingBillType: string;
  customsLocation: string;
  iec: string;
  chaCode: string;

  fobValue: number;
  fobCurrency: string;

  customsStatus: string;

  leoNo: string;
  leoDate: string;
  leoStatus: string;

  blNo: string;
  blDate: string;
  masterBlNo: string;
  houseBlNo: string;

  awbNo: string;
  awbDate: string;
  mawbNo: string;
  hawbNo: string;

  etd: string;
  eta: string;
  actualDeparture: string;
  actualArrival: string;

  bookingMilestoneDate: string;
  cargoReadyDate: string;
  stuffingDate: string;
  gateInDate: string;
  customsFilingDate: string;
  gateOutDate: string;

  insuranceRequired: boolean;
  insuranceCompany: string;
  insurancePolicyNo: string;
  insuranceCertificateNo: string;
  insurancePolicyDate: string;
  insuranceExpiryDate: string;
  insuranceValue: number;
  insuranceCurrency: string;
  insuranceCoverage: string;
  insurancePremium: number;

  freightAmount: number;
  freightCurrency: string;
  freightPaidBy: string;
  oceanFreight: number;
  airFreight: number;
  chaCharges: number;
  transportCharges: number;
  portCharges: number;
  documentationCharges: number;
  otherCharges: number;
  totalShipmentCharges: number;

  invoiceAmount: number;
  paymentStatus: string;

  status: ShipmentStatus;

  cargoItems: ShipmentCargoItem[];
  containers: ShipmentContainer[];
  documents: ShipmentDocument[];
  certificates: ShipmentCertificate[];
  timeline: ShipmentTimelineItem[];

  remarks: string;

  createdAt: string;
  updatedAt: string;
}