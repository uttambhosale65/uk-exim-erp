export type ExportReservationItem = {
  productCode: string;
  productName: string;

  lotBatchNo: string;

  orderQty: number;
  reserveQty: number;

  unit: string;

  packingType: string;
  packageQty: number;

  netWeight: number;
  grossWeight: number;
  cbm: number;

  marksNumbers: string;

  reservedStockId: string;
};

export type ExportReservationStatus =
  | "Draft"
  | "Reserved"
  | "Partially Packed"
  | "Packed"
  | "Cancelled";

export type ExportReservation = {
  id: string;

  // Reservation Document
  reservationNo: string;
  reservationDate: string;

  // Source Export Order
  exportOrderNo: string;
  exportOrderDate: string;

  // Customer / Buyer
  customerCode: string;
  customerName: string;
  contactPerson: string;
  buyerCountry: string;

  // Reservation Status
  status: ExportReservationStatus;

  // Reserved Products
  items: ExportReservationItem[];

  // Summary
  totalReservedQty: number;
  totalPackages: number;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalCBM: number;

  // Notes
  remarks: string;

  // Audit
  createdAt: string;
  updatedAt: string;
};