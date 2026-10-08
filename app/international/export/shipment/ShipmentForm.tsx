"use client";

import React, { useEffect, useMemo, useState } from "react";

import {
  Shipment,
  ShipmentCargoItem,
  ShipmentCertificate,
  ShipmentContainer,
  ShipmentDocument,
  ShipmentTimelineItem,
  ShipmentStatus,
  ShipmentMode,
} from "./ShipmentTypes";

import {
  loadPackings,
  getPackingById,
} from "../packing/PackingStorage";

import { ExportPacking } from "../packing/PackingTypes";

type ReservationItem = {
  productCode: string;
  productName: string;
  hsCode: string;
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
};

type CommercialInvoice = {
  invoiceNo: string;
  invoiceDate: string;
  orderNo: string;
  shipmentNo: string;
  customerCode: string;
  customerName: string;
  buyerCountry: string;
  currency: string;
  totalInvoiceValue: number;
  status: string;
};

type Reservation = {
  reservationNo: string;
  reservationDate: string;
  exportOrderNo: string;
  exportOrderDate: string;
  customerCode: string;
  customerName: string;
  contactPerson: string;
  buyerCountry: string;
  status: string;
  items: ReservationItem[];
  totalReservedQty: number;
  totalPackages: number;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalCBM: number;
  remarks: string;
};

interface ShipmentFormProps {
  initialData?: Shipment | null;
  shipmentNo: string;
  shipmentDate: string;
  onSave: (shipment: Shipment) => void;
  onCancel: () => void;
}

const SHIPMENT_STATUSES: ShipmentStatus[] = [
  "Draft",
  "Booked",
  "Cargo Ready",
  "Stuffed",
  "Customs Filed",
  "Customs Cleared",
  "LEO Received",
  "Gate Out",
  "Shipped",
  "In Transit",
  "Arrived",
  "Closed",
  "Cancelled",
];

const SHIPMENT_MODES: ShipmentMode[] = [
  "Sea",
  "Air",
  "Road",
  "Courier",
  "Multimodal",
  "Other",
];

const CUSTOMS_STATUSES = [
  "Not Filed",
  "Filed",
  "Assessment Pending",
  "Assessment Completed",
  "Examination Pending",
  "Examination Completed",
  "LEO Pending",
  "LEO Received",
  "Query Raised",
  "Amendment Required",
  "Cleared",
];

const LEO_STATUSES = [
  "Pending",
  "Received",
  "Not Applicable",
];

const CONTAINER_TYPES = [
  "20 GP",
  "40 GP",
  "40 HC",
  "20 RF",
  "40 RF",
  "Other",
];

const DOCUMENT_TYPES = [
  "Commercial Invoice",
  "Packing List",
  "Shipping Bill",
  "Bill of Lading",
  "Airway Bill",
  "Certificate of Origin",
  "Other",
];

const CERTIFICATE_TYPES = [
  "CoO",
  "Preferential CoO",
  "Inspection Certificate",
  "Certificate of Analysis",
  "Phytosanitary",
  "Fumigation",
  "Health Certificate",
  "Sanitary Certificate",
  "Quality Certificate",
  "Weight Certificate",
  "Export Licence",
  "Permit",
  "NOC",
  "Other",
];

function formatDateForDisplay(value: string): string {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function formatDateForStorage(value: string): string {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) return "";

  const [, day, month, year] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function isValidDateDisplay(value: string): boolean {
  if (!value.trim()) return false;
  return Boolean(formatDateForStorage(value));
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function todayValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function loadReservations(): Reservation[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(
      "uk-exim-export-reservations"
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadCommercialInvoices(): CommercialInvoice[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(
      "uk-exim-export-commercial-invoices"
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function findMatchingCommercialInvoice(
  invoices: CommercialInvoice[],
  orderNo: string,
  customerCode: string,
  customerName: string,
  shipmentNo: string = ""
): CommercialInvoice | undefined {
  const normalizedOrder = orderNo.trim().toLowerCase();
  const normalizedCode = customerCode.trim().toLowerCase();
  const normalizedName = customerName.trim().toLowerCase();
  const normalizedShipment = shipmentNo.trim().toLowerCase();

  const validInvoices = invoices.filter(
    (invoice) =>
      invoice.status !== "Cancelled" &&
      Boolean(invoice.invoiceNo)
  );

  if (normalizedShipment) {
    const byShipment = validInvoices.find(
      (invoice) =>
        String(invoice.shipmentNo || "")
          .trim()
          .toLowerCase() === normalizedShipment
    );

    if (byShipment) {
      return byShipment;
    }
  }

  if (normalizedOrder) {
    const byOrder = validInvoices.find(
      (invoice) =>
        String(invoice.orderNo || "")
          .trim()
          .toLowerCase() === normalizedOrder &&
        (!normalizedCode ||
          String(invoice.customerCode || "")
            .trim()
            .toLowerCase() === normalizedCode)
    );

    if (byOrder) {
      return byOrder;
    }

    const byOrderOnly = validInvoices.find(
      (invoice) =>
        String(invoice.orderNo || "")
          .trim()
          .toLowerCase() === normalizedOrder
    );

    if (byOrderOnly) {
      return byOrderOnly;
    }
  }

  if (normalizedCode) {
    const byCustomerCode = validInvoices.find(
      (invoice) =>
        String(invoice.customerCode || "")
          .trim()
          .toLowerCase() === normalizedCode &&
        (!normalizedName ||
          String(invoice.customerName || "")
            .trim()
            .toLowerCase() === normalizedName)
    );

    if (byCustomerCode) {
      return byCustomerCode;
    }
  }

  return validInvoices.find(
    (invoice) =>
      normalizedName &&
      String(invoice.customerName || "")
        .trim()
        .toLowerCase() === normalizedName
  );
}

function emptyCargo(): ShipmentCargoItem {
  return {
    id: createId("cargo"),
    productCode: "",
    productName: "",
    hsCode: "",
    lotBatchNo: "",
    quantity: 0,
    unit: "",
    packingType: "",
    packages: 0,
    netWeight: 0,
    grossWeight: 0,
    cbm: 0,
    marksNumbers: "",
  };
}

function emptyContainer(): ShipmentContainer {
  return {
    id: createId("container"),
    containerNo: "",
    containerType: "40 HC",
    containerSize: "",
    sealNo: "",
    sealDate: "",
    packages: 0,
    netWeight: 0,
    grossWeight: 0,
    cbm: 0,
    stuffingDate: "",
    stuffingLocation: "",
    remarks: "",
  };
}

function emptyDocument(): ShipmentDocument {
  return {
    id: createId("document"),
    documentType: "Commercial Invoice",
    documentNo: "",
    documentDate: "",
    issueDate: "",
    expiryDate: "",
    issuedBy: "",
    referenceNo: "",
    status: "Pending",
    attachmentName: "",
    remarks: "",
  };
}

function emptyCertificate(): ShipmentCertificate {
  return {
    id: createId("certificate"),
    certificateType: "CoO",
    required: false,
    documentNo: "",
    issueDate: "",
    expiryDate: "",
    issuedBy: "",
    status: "Pending",
    attachmentName: "",
    remarks: "",
  };
}

function emptyTimeline(
  status: ShipmentStatus = "Draft"
): ShipmentTimelineItem {
  return {
    id: createId("timeline"),
    status,
    date: todayValue(),
    remarks: "",
  };
}

function buildInitialShipment(
  shipmentNo: string,
  shipmentDate: string
): Shipment {
  const now = new Date().toISOString();

  return {
    id: createId("shipment"),
    shipmentNo,
    shipmentDate,
    exportOrderNo: "",
    reservationNo: "",
    packingNo: "",
    commercialInvoiceNo: "",
    customerCode: "",
    customerName: "",
    country: "",
    currency: "USD",

    shipmentMode: "Sea",
    freightType: "",
    freightForwarder: "",
    customsBroker: "",
    transporter: "",
    shippingLine: "",
    airline: "",
    bookingNo: "",
    bookingDate: "",

    portOfLoading: "",
    portOfDischarge: "",
    finalDestination: "",
    countryOfDischarge: "",
    countryOfFinalDestination: "",
    vehicleNo: "",
    pickupDate: "",

    shippingBillNo: "",
    shippingBillDate: "",
    shippingBillType: "",
    customsLocation: "",
    iec: "",
    chaCode: "",
    fobValue: 0,
    fobCurrency: "USD",
    customsStatus: "Not Filed",

    leoNo: "",
    leoDate: "",
    leoStatus: "Pending",

    blNo: "",
    blDate: "",
    masterBlNo: "",
    houseBlNo: "",

    awbNo: "",
    awbDate: "",
    mawbNo: "",
    hawbNo: "",

    etd: "",
    eta: "",
    actualDeparture: "",
    actualArrival: "",
    bookingMilestoneDate: "",
    cargoReadyDate: "",
    stuffingDate: "",
    gateInDate: "",
    customsFilingDate: "",
    gateOutDate: "",

    insuranceRequired: false,
    insuranceCompany: "",
    insurancePolicyNo: "",
    insuranceCertificateNo: "",
    insurancePolicyDate: "",
    insuranceExpiryDate: "",
    insuranceValue: 0,
    insuranceCurrency: "USD",
    insuranceCoverage: "",
    insurancePremium: 0,

    freightAmount: 0,
    freightCurrency: "USD",
    freightPaidBy: "",
    oceanFreight: 0,
    airFreight: 0,
    chaCharges: 0,
    transportCharges: 0,
    portCharges: 0,
    documentationCharges: 0,
    otherCharges: 0,
    totalShipmentCharges: 0,

    invoiceAmount: 0,
    paymentStatus: "Pending",

    status: "Draft",

    cargoItems: [],
    containers: [],
    documents: [],
    certificates: [],
    timeline: [emptyTimeline("Draft")],

    remarks: "",

    createdAt: now,
    updatedAt: now,
  };
}

export default function ShipmentForm({
  initialData,
  shipmentNo,
  shipmentDate,
  onSave,
  onCancel,
}: ShipmentFormProps) {
  const [reservations, setReservations] = useState<
    Reservation[]
  >([]);

  const [packings, setPackings] = useState<
    ExportPacking[]
  >([]);

  const [commercialInvoices, setCommercialInvoices] =
    useState<CommercialInvoice[]>([]);

  const [form, setForm] = useState<Shipment>(() =>
    initialData
      ? {
          ...initialData,
          cargoItems: initialData.cargoItems || [],
          containers: initialData.containers || [],
          documents: initialData.documents || [],
          certificates: initialData.certificates || [],
          timeline: initialData.timeline || [],
        }
      : buildInitialShipment(
          shipmentNo,
          shipmentDate
        )
  );

  const [activeSection, setActiveSection] =
    useState("Basic");

  const isEdit = Boolean(initialData);

  useEffect(() => {
    setReservations(loadReservations());
    setPackings(loadPackings());
    setCommercialInvoices(loadCommercialInvoices());
  }, []);

  useEffect(() => {
    const refresh = () => {
      setReservations(loadReservations());
      setPackings(loadPackings());
      setCommercialInvoices(loadCommercialInvoices());
    };

    window.addEventListener(
      "storage",
      refresh
    );

    window.addEventListener(
      "focus",
      refresh
    );

    return () => {
      window.removeEventListener(
        "storage",
        refresh
      );

      window.removeEventListener(
        "focus",
        refresh
      );
    };
  }, []);

  const selectedReservation = useMemo(
    () =>
      reservations.find(
        (item) =>
          item.reservationNo ===
          form.reservationNo
      ),
    [reservations, form.reservationNo]
  );

  const selectedPacking = useMemo(
    () =>
      packings.find(
        (item) =>
          item.packingNo ===
          form.packingNo
      ),
    [packings, form.packingNo]
  );

  const matchingCommercialInvoices = useMemo(() => {
    const orderNo = form.exportOrderNo.trim().toLowerCase();
    const customerCode = form.customerCode.trim().toLowerCase();
    const customerName = form.customerName.trim().toLowerCase();

    const matches = commercialInvoices.filter((invoice) => {
      if (invoice.status === "Cancelled") {
        return false;
      }

      const invoiceOrder = String(invoice.orderNo || "")
        .trim()
        .toLowerCase();
      const invoiceCode = String(invoice.customerCode || "")
        .trim()
        .toLowerCase();
      const invoiceName = String(invoice.customerName || "")
        .trim()
        .toLowerCase();

      if (orderNo && invoiceOrder === orderNo) {
        return !customerCode || invoiceCode === customerCode;
      }

      return Boolean(customerCode)
        ? invoiceCode === customerCode
        : Boolean(customerName) && invoiceName === customerName;
    });

    if (form.commercialInvoiceNo && !matches.some(
      (invoice) => invoice.invoiceNo === form.commercialInvoiceNo
    )) {
      const selected = commercialInvoices.find(
        (invoice) => invoice.invoiceNo === form.commercialInvoiceNo
      );

      if (selected) {
        return [selected, ...matches];
      }
    }

    return matches;
  }, [
    commercialInvoices,
    form.exportOrderNo,
    form.customerCode,
    form.customerName,
    form.commercialInvoiceNo,
  ]);

  const totalPackages = useMemo(
    () =>
      form.cargoItems.reduce(
        (sum, item) =>
          sum + toNumber(item.packages),
        0
      ),
    [form.cargoItems]
  );

  const totalNetWeight = useMemo(
    () =>
      form.cargoItems.reduce(
        (sum, item) =>
          sum + toNumber(item.netWeight),
        0
      ),
    [form.cargoItems]
  );

  const totalGrossWeight = useMemo(
    () =>
      form.cargoItems.reduce(
        (sum, item) =>
          sum + toNumber(item.grossWeight),
        0
      ),
    [form.cargoItems]
  );

  const totalCBM = useMemo(
    () =>
      form.cargoItems.reduce(
        (sum, item) =>
          sum + toNumber(item.cbm),
        0
      ),
    [form.cargoItems]
  );

  const calculatedCharges = useMemo(
    () =>
      toNumber(form.oceanFreight) +
      toNumber(form.airFreight) +
      toNumber(form.chaCharges) +
      toNumber(form.transportCharges) +
      toNumber(form.portCharges) +
      toNumber(form.documentationCharges) +
      toNumber(form.otherCharges),
    [form]
  );

  function updateField<K extends keyof Shipment>(
    field: K,
    value: Shipment[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateCargo(
    id: string,
    field: keyof ShipmentCargoItem,
    value: string | number
  ) {
    setForm((current) => ({
      ...current,
      cargoItems: current.cargoItems.map(
        (item) =>
          item.id === id
            ? {
                ...item,
                [field]: value,
              }
            : item
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateContainer(
    id: string,
    field: keyof ShipmentContainer,
    value: string | number
  ) {
    setForm((current) => ({
      ...current,
      containers: current.containers.map(
        (item) =>
          item.id === id
            ? {
                ...item,
                [field]: value,
              }
            : item
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateDocument(
    id: string,
    field: keyof ShipmentDocument,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      documents: current.documents.map(
        (item) =>
          item.id === id
            ? {
                ...item,
                [field]: value,
              }
            : item
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateCertificate(
    id: string,
    field: keyof ShipmentCertificate,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      certificates:
        current.certificates.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  [field]: value,
                }
              : item
        ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateTimeline(
    id: string,
    field: keyof ShipmentTimelineItem,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      timeline: current.timeline.map(
        (item) =>
          item.id === id
            ? {
                ...item,
                [field]: value,
              }
            : item
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function applyReservation(
    reservationNo: string
  ) {
    const reservation =
      reservations.find(
        (item) =>
          item.reservationNo ===
          reservationNo
      );

    if (!reservation) {
      updateField(
        "reservationNo",
        reservationNo
      );
      return;
    }

    const cargo: ShipmentCargoItem[] =
      (reservation.items || []).map(
        (item) => ({
          id: createId("cargo"),
          productCode:
            item.productCode || "",
          productName:
            item.productName || "",
          hsCode: item.hsCode || "",
          lotBatchNo:
            item.lotBatchNo || "",
          quantity: toNumber(
            item.reserveQty
          ),
          unit: item.unit || "",
          packingType:
            item.packingType || "",
          packages: toNumber(
            item.packageQty
          ),
          netWeight: toNumber(
            item.netWeight
          ),
          grossWeight: toNumber(
            item.grossWeight
          ),
          cbm: toNumber(item.cbm),
          marksNumbers:
            item.marksNumbers || "",
        })
      );

    const matchingInvoice = findMatchingCommercialInvoice(
      commercialInvoices,
      reservation.exportOrderNo || "",
      reservation.customerCode || "",
      reservation.customerName || "",
      form.shipmentNo
    );

    setForm((current) => ({
      ...current,

      reservationNo:
        reservation.reservationNo,

      exportOrderNo:
        reservation.exportOrderNo || "",

      customerCode:
        reservation.customerCode || "",

      customerName:
        reservation.customerName || "",

      country:
        reservation.buyerCountry || "",

      commercialInvoiceNo:
        matchingInvoice?.invoiceNo ||
        current.commercialInvoiceNo ||
        "",

      invoiceAmount:
        matchingInvoice
          ? toNumber(matchingInvoice.totalInvoiceValue)
          : current.invoiceAmount,

      currency:
        matchingInvoice?.currency ||
        current.currency ||
        "USD",

      cargoItems: cargo,

      remarks:
        current.remarks ||
        reservation.remarks ||
        "",

      updatedAt:
        new Date().toISOString(),
    }));
  }

  function applyPacking(
    packingNo: string
  ) {
    const packing =
      getPackingById(
        packings.find(
          (item) =>
            item.packingNo ===
            packingNo
        )?.id || ""
      );

    if (!packing) {
      updateField(
        "packingNo",
        packingNo
      );
      return;
    }

    const cargo: ShipmentCargoItem[] =
      (packing.items || []).map(
        (item) => ({
          id: createId("cargo"),
          productCode:
            item.productCode || "",
          productName:
            item.productName || "",
          hsCode: item.hsCode || "",
          lotBatchNo:
            item.lotBatchNo || "",
          quantity: toNumber(
            item.packedQty
          ),
          unit: item.unit || "",
          packingType:
            item.packingType || "",
          packages: toNumber(
            item.packageQty
          ),
          netWeight: toNumber(
            item.totalNetWeight
          ),
          grossWeight: toNumber(
            item.grossWeight
          ),
          cbm: toNumber(item.cbm),
          marksNumbers:
            item.marksNumbers ||
            packing.marksNumbers ||
            "",
        })
      );

    const matchingInvoice = findMatchingCommercialInvoice(
      commercialInvoices,
      packing.exportOrderNo || form.exportOrderNo || "",
      packing.customerCode || form.customerCode || "",
      packing.customerName || form.customerName || "",
      form.shipmentNo
    );

    setForm((current) => ({
      ...current,

      packingNo:
        packing.packingNo,

      reservationNo:
        packing.reservationNo ||
        current.reservationNo,

      exportOrderNo:
        packing.exportOrderNo ||
        current.exportOrderNo,

      customerCode:
        packing.customerCode ||
        current.customerCode,

      customerName:
        packing.customerName ||
        current.customerName,

      country:
        packing.buyerCountry ||
        current.country,

      commercialInvoiceNo:
        matchingInvoice?.invoiceNo ||
        current.commercialInvoiceNo ||
        "",

      invoiceAmount:
        matchingInvoice
          ? toNumber(matchingInvoice.totalInvoiceValue)
          : current.invoiceAmount,

      currency:
        matchingInvoice?.currency ||
        current.currency ||
        "USD",

      cargoItems: cargo,

      stuffingDate:
        current.stuffingDate ||
        packing.packingDate ||
        "",

      cargoReadyDate:
        current.cargoReadyDate ||
        packing.packingDate ||
        "",

      remarks:
        current.remarks ||
        packing.remarks ||
        "",

      updatedAt:
        new Date().toISOString(),
    }));
  }

  function addCargo() {
    setForm((current) => ({
      ...current,
      cargoItems: [
        ...current.cargoItems,
        emptyCargo(),
      ],
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeCargo(id: string) {
    setForm((current) => ({
      ...current,
      cargoItems:
        current.cargoItems.filter(
          (item) => item.id !== id
        ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function addContainer() {
    setForm((current) => ({
      ...current,
      containers: [
        ...current.containers,
        emptyContainer(),
      ],
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeContainer(id: string) {
    setForm((current) => ({
      ...current,
      containers:
        current.containers.filter(
          (item) => item.id !== id
        ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function addDocument() {
    setForm((current) => ({
      ...current,
      documents: [
        ...current.documents,
        emptyDocument(),
      ],
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeDocument(id: string) {
    setForm((current) => ({
      ...current,
      documents:
        current.documents.filter(
          (item) => item.id !== id
        ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function addCertificate() {
    setForm((current) => ({
      ...current,
      certificates: [
        ...current.certificates,
        emptyCertificate(),
      ],
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeCertificate(id: string) {
    setForm((current) => ({
      ...current,
      certificates:
        current.certificates.filter(
          (item) => item.id !== id
        ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function addTimeline() {
    setForm((current) => ({
      ...current,
      timeline: [
        ...current.timeline,
        emptyTimeline(current.status),
      ],
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeTimeline(id: string) {
    setForm((current) => ({
      ...current,
      timeline:
        current.timeline.filter(
          (item) => item.id !== id
        ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function validateForm(): boolean {
    if (!form.shipmentNo.trim()) {
      alert("Shipment No. is required.");
      return false;
    }

    if (!form.shipmentDate) {
      alert("Shipment Date is required.");
      return false;
    }

    if (!form.reservationNo) {
      alert("Please select Reservation.");
      return false;
    }

    if (!form.packingNo) {
      alert("Please select Packing.");
      return false;
    }

    if (form.cargoItems.length === 0) {
      alert(
        "At least one cargo item is required."
      );
      return false;
    }

    if (
      form.shipmentMode === "Sea" &&
      !form.portOfLoading.trim()
    ) {
      alert(
        "Port of Loading is required for Sea shipment."
      );
      return false;
    }

    if (
      form.shipmentMode === "Sea" &&
      !form.portOfDischarge.trim()
    ) {
      alert(
        "Port of Discharge is required for Sea shipment."
      );
      return false;
    }

    if (
      form.shipmentMode === "Air" &&
      !form.airline.trim()
    ) {
      alert(
        "Airline is required for Air shipment."
      );
      return false;
    }

    if (
      form.insuranceRequired &&
      !form.insuranceCompany.trim()
    ) {
      alert(
        "Insurance Company is required when Insurance is marked Required."
      );
      return false;
    }

    return true;
  }

  function handleSave() {
    if (!validateForm()) {
      return;
    }

    const now =
      new Date().toISOString();

    const updatedTimeline = [
      ...(form.timeline || []),
    ];

    const lastTimeline =
      updatedTimeline[
        updatedTimeline.length - 1
      ];

    if (
      !lastTimeline ||
      lastTimeline.status !==
        form.status
    ) {
      updatedTimeline.push({
        id: createId("timeline"),
        status: form.status,
        date: form.shipmentDate,
        remarks:
          "Shipment status updated.",
      });
    }

    const shipmentToSave: Shipment = {
      ...form,

      totalShipmentCharges:
        calculatedCharges,

      timeline: updatedTimeline,

      updatedAt: now,

      createdAt:
        form.createdAt || now,
    };

    onSave(shipmentToSave);
  }

  const sectionButtons = [
    "Basic",
    "Cargo",
    "Logistics",
    "Containers",
    "Customs",
    "BL / AWB",
    "Documents",
    "Certificates",
    "Insurance",
    "Charges",
    "Invoice / Payment",
    "Timeline",
    "Remarks",
  ];

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100";

  const labelClass =
    "mb-1 block text-xs font-semibold text-gray-600";

  const sectionClass =
    "rounded-xl border border-gray-200 bg-white p-4 shadow-sm";

  return (
    <div className="space-y-4">
      {/* HEADER */}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                🚢
              </span>

              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {isEdit
                    ? "Edit Shipment"
                    : "New Shipment"}
                </h2>

                <p className="text-xs text-gray-500">
                  International Export →
                  Shipment & Logistics
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
              <div className="text-[10px] font-bold uppercase text-gray-500">
                Shipment No.
              </div>

              <div className="font-bold text-green-700">
                {form.shipmentNo}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
              <div className="text-[10px] font-bold uppercase text-gray-500">
                Status
              </div>

              <div className="font-bold text-gray-800">
                {form.status}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION NAVIGATION */}

      <div className="sticky top-0 z-20 overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-2">
          {sectionButtons.map(
            (section) => (
              <button
                key={section}
                type="button"
                onClick={() =>
                  setActiveSection(
                    section
                  )
                }
                className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                  activeSection === section
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {section}
              </button>
            )
          )}
        </div>
      </div>

      {/* BASIC */}

      {activeSection === "Basic" && (
        <div className={sectionClass}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800">
                Basic Details
              </h3>

              <p className="text-xs text-gray-500">
                Reservation आणि Packing
                मधून shipment data
                auto-fill होईल.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>
                Shipment No.
              </label>

              <input
                value={form.shipmentNo}
                onChange={(e) =>
                  updateField(
                    "shipmentNo",
                    e.target.value
                  )
                }
                className={inputClass}
                disabled={isEdit}
              />
            </div>

            <div>
              <DateField
                label="Shipment Date *"
                value={form.shipmentDate}
                onChange={(value) =>
                  updateField(
                    "shipmentDate",
                    value
                  )
                }
              />
            </div>

            <div>
              <label className={labelClass}>
                Reservation No. *
              </label>

              <select
                value={
                  form.reservationNo
                }
                onChange={(e) =>
                  applyReservation(
                    e.target.value
                  )
                }
                onFocus={() =>
                  setReservations(
                    loadReservations()
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Select Reservation
                </option>

                {reservations.map(
                  (reservation) => (
                    <option
                      key={
                        reservation.reservationNo
                      }
                      value={
                        reservation.reservationNo
                      }
                    >
                      {
                        reservation.reservationNo
                      }{" "}
                      -{" "}
                      {
                        reservation.customerName
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Packing No. *
              </label>

              <select
                value={
                  form.packingNo
                }
                onChange={(e) =>
                  applyPacking(
                    e.target.value
                  )
                }
                onFocus={() =>
                  setPackings(
                    loadPackings()
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Select Packing
                </option>

                {packings
                  .filter(
                    (packing) =>
                      !form.reservationNo ||
                      packing.reservationNo ===
                        form.reservationNo
                  )
                  .map((packing) => (
                    <option
                      key={packing.id}
                      value={
                        packing.packingNo
                      }
                    >
                      {
                        packing.packingNo
                      }{" "}
                      -{" "}
                      {
                        packing.customerName
                      }
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Export Order No.
              </label>

              <input
                value={
                  form.exportOrderNo
                }
                onChange={(e) =>
                  updateField(
                    "exportOrderNo",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Commercial Invoice No.
              </label>

              <select
                value={form.commercialInvoiceNo}
                onChange={(e) => {
                  const invoice = commercialInvoices.find(
                    (item) => item.invoiceNo === e.target.value
                  );

                  if (!invoice) {
                    updateField(
                      "commercialInvoiceNo",
                      ""
                    );
                    return;
                  }

                  setForm((current) => ({
                    ...current,
                    commercialInvoiceNo: invoice.invoiceNo,
                    invoiceAmount: toNumber(
                      invoice.totalInvoiceValue
                    ),
                    currency:
                      invoice.currency || current.currency,
                    updatedAt: new Date().toISOString(),
                  }));
                }}
                onFocus={() =>
                  setCommercialInvoices(
                    loadCommercialInvoices()
                  )
                }
                className={inputClass}
              >
                <option value="">
                  {matchingCommercialInvoices.length === 0
                    ? "No Invoice Found"
                    : "Select Commercial Invoice"}
                </option>

                {matchingCommercialInvoices.map(
                  (invoice) => (
                    <option
                      key={invoice.invoiceNo}
                      value={invoice.invoiceNo}
                    >
                      {invoice.invoiceNo} - {invoice.customerName}
                    </option>
                  )
                )}
              </select>

              <p className="mt-1 text-[10px] text-gray-500">
                Order / Customer शी संबंधित Commercial Invoice auto-linked होईल.
              </p>
            </div>

            <div>
              <label className={labelClass}>
                Customer
              </label>

              <input
                value={
                  form.customerName
                }
                onChange={(e) =>
                  updateField(
                    "customerName",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Customer Code
              </label>

              <input
                value={
                  form.customerCode
                }
                onChange={(e) =>
                  updateField(
                    "customerCode",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Country
              </label>

              <input
                value={form.country}
                onChange={(e) =>
                  updateField(
                    "country",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Currency
              </label>

              <input
                value={
                  form.currency
                }
                onChange={(e) =>
                  updateField(
                    "currency",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Shipment Mode
              </label>

              <select
                value={
                  form.shipmentMode
                }
                onChange={(e) =>
                  updateField(
                    "shipmentMode",
                    e.target
                      .value as ShipmentMode
                  )
                }
                className={inputClass}
              >
                {SHIPMENT_MODES.map(
                  (mode) => (
                    <option
                      key={mode}
                      value={mode}
                    >
                      {mode}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Shipment Status
              </label>

              <select
                value={form.status}
                onChange={(e) =>
                  updateField(
                    "status",
                    e.target
                      .value as ShipmentStatus
                  )
                }
                className={inputClass}
              >
                {SHIPMENT_STATUSES.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryBox
              label="Packages"
              value={totalPackages}
            />

            <SummaryBox
              label="Net Weight"
              value={totalNetWeight}
            />

            <SummaryBox
              label="Gross Weight"
              value={totalGrossWeight}
            />

            <SummaryBox
              label="CBM"
              value={totalCBM}
            />
          </div>

          {selectedReservation && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              Reservation loaded:
              <strong className="ml-1">
                {
                  selectedReservation.reservationNo
                }
              </strong>
            </div>
          )}

          {selectedPacking && (
            <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800">
              Packing loaded:
              <strong className="ml-1">
                {selectedPacking.packingNo}
              </strong>
            </div>
          )}
        </div>
      )}

      {/* CARGO */}

      {activeSection === "Cargo" && (
        <div className={sectionClass}>
          <SectionHeader
            title="Cargo Summary"
            description="Shipment मध्ये जाणारा packed cargo."
            action={
              <button
                type="button"
                onClick={addCargo}
                className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
              >
                + Add Cargo
              </button>
            }
          />

          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryBox
              label="Packages"
              value={totalPackages}
            />
            <SummaryBox
              label="Net Weight"
              value={totalNetWeight}
            />
            <SummaryBox
              label="Gross Weight"
              value={totalGrossWeight}
            />
            <SummaryBox
              label="CBM"
              value={totalCBM}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-[1700px] w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <Th>Product</Th>
                  <Th>HSN</Th>
                  <Th>Lot / Batch</Th>
                  <Th>Qty</Th>
                  <Th>Unit</Th>
                  <Th>Packing</Th>
                  <Th>Packages</Th>
                  <Th>Net Wt.</Th>
                  <Th>Gross Wt.</Th>
                  <Th>CBM</Th>
                  <Th>Marks</Th>
                  <Th>Action</Th>
                </tr>
              </thead>

              <tbody>
                {form.cargoItems.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="p-8 text-center text-sm text-gray-500"
                    >
                      No cargo items.
                      Select Reservation
                      or Packing first.
                    </td>
                  </tr>
                ) : (
                  form.cargoItems.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-t border-gray-100"
                      >
                        <Td>
                          <div className="min-w-[220px]">
                            <input
                              value={
                                item.productCode
                              }
                              onChange={(e) =>
                                updateCargo(
                                  item.id,
                                  "productCode",
                                  e.target
                                    .value
                                )
                              }
                              className={inputClass}
                              placeholder="Code"
                            />

                            <input
                              value={
                                item.productName
                              }
                              onChange={(e) =>
                                updateCargo(
                                  item.id,
                                  "productName",
                                  e.target
                                    .value
                                )
                              }
                              className={`${inputClass} mt-1`}
                              placeholder="Product Name"
                            />
                          </div>
                        </Td>

                        <Td>
                          <input
                            value={
                              item.hsCode
                            }
                            onChange={(e) =>
                              updateCargo(
                                item.id,
                                "hsCode",
                                e.target.value
                              )
                            }
                            className={inputClass}
                          />
                        </Td>

                        <Td>
                          <input
                            value={
                              item.lotBatchNo
                            }
                            onChange={(e) =>
                              updateCargo(
                                item.id,
                                "lotBatchNo",
                                e.target.value
                              )
                            }
                            className={inputClass}
                          />
                        </Td>

                        <Td>
                          <input
                            type="number"
                            value={
                              item.quantity
                            }
                            onChange={(e) =>
                              updateCargo(
                                item.id,
                                "quantity",
                                toNumber(
                                  e.target.value
                                )
                              )
                            }
                            className={inputClass}
                          />
                        </Td>

                        <Td>
                          <input
                            value={item.unit}
                            onChange={(e) =>
                              updateCargo(
                                item.id,
                                "unit",
                                e.target.value
                              )
                            }
                            className={inputClass}
                          />
                        </Td>

                        <Td>
                          <input
                            value={
                              item.packingType
                            }
                            onChange={(e) =>
                              updateCargo(
                                item.id,
                                "packingType",
                                e.target.value
                              )
                            }
                            className={inputClass}
                          />
                        </Td>

                        <Td>
                          <input
                            type="number"
                            value={
                              item.packages
                            }
                            onChange={(e) =>
                              updateCargo(
                                item.id,
                                "packages",
                                toNumber(
                                  e.target.value
                                )
                              )
                            }
                            className={inputClass}
                          />
                        </Td>

                        <Td>
                          <input
                            type="number"
                            value={
                              item.netWeight
                            }
                            onChange={(e) =>
                              updateCargo(
                                item.id,
                                "netWeight",
                                toNumber(
                                  e.target.value
                                )
                              )
                            }
                            className={inputClass}
                          />
                        </Td>

                        <Td>
                          <input
                            type="number"
                            value={
                              item.grossWeight
                            }
                            onChange={(e) =>
                              updateCargo(
                                item.id,
                                "grossWeight",
                                toNumber(
                                  e.target.value
                                )
                              )
                            }
                            className={inputClass}
                          />
                        </Td>

                        <Td>
                          <input
                            type="number"
                            value={item.cbm}
                            onChange={(e) =>
                              updateCargo(
                                item.id,
                                "cbm",
                                toNumber(
                                  e.target.value
                                )
                              )
                            }
                            className={inputClass}
                          />
                        </Td>

                        <Td>
                          <textarea
                            value={
                              item.marksNumbers
                            }
                            onChange={(e) =>
                              updateCargo(
                                item.id,
                                "marksNumbers",
                                e.target.value
                              )
                            }
                            rows={2}
                            className={inputClass}
                          />
                        </Td>

                        <Td>
                          <button
                            type="button"
                            onClick={() =>
                              removeCargo(
                                item.id
                              )
                            }
                            className="rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </Td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LOGISTICS */}

      {activeSection === "Logistics" && (
        <div className={sectionClass}>
          <SectionHeader
            title="Logistics / Transport"
            description="Forwarder, transporter, port आणि schedule details."
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Freight Type"
              value={form.freightType}
              onChange={(value) =>
                updateField(
                  "freightType",
                  value
                )
              }
            />

            <Field
              label="Freight Forwarder"
              value={
                form.freightForwarder
              }
              onChange={(value) =>
                updateField(
                  "freightForwarder",
                  value
                )
              }
            />

            <Field
              label="Customs Broker / CHA"
              value={
                form.customsBroker
              }
              onChange={(value) =>
                updateField(
                  "customsBroker",
                  value
                )
              }
            />

            <Field
              label="Transporter"
              value={form.transporter}
              onChange={(value) =>
                updateField(
                  "transporter",
                  value
                )
              }
            />

            <Field
              label="Shipping Line"
              value={form.shippingLine}
              onChange={(value) =>
                updateField(
                  "shippingLine",
                  value
                )
              }
            />

            <Field
              label="Airline"
              value={form.airline}
              onChange={(value) =>
                updateField(
                  "airline",
                  value
                )
              }
            />

            <Field
              label="Booking No."
              value={form.bookingNo}
              onChange={(value) =>
                updateField(
                  "bookingNo",
                  value
                )
              }
            />

            <DateField
              label="Booking Date"
              value={form.bookingDate}
              onChange={(value) =>
                updateField(
                  "bookingDate",
                  value
                )
              }
            />

            <Field
              label="Vehicle No."
              value={form.vehicleNo}
              onChange={(value) =>
                updateField(
                  "vehicleNo",
                  value
                )
              }
            />

            <DateField
              label="Pickup Date"
              value={form.pickupDate}
              onChange={(value) =>
                updateField(
                  "pickupDate",
                  value
                )
              }
            />

            <Field
              label="Port of Loading"
              value={
                form.portOfLoading
              }
              onChange={(value) =>
                updateField(
                  "portOfLoading",
                  value
                )
              }
            />

            <Field
              label="Port of Discharge"
              value={
                form.portOfDischarge
              }
              onChange={(value) =>
                updateField(
                  "portOfDischarge",
                  value
                )
              }
            />

            <Field
              label="Final Destination"
              value={
                form.finalDestination
              }
              onChange={(value) =>
                updateField(
                  "finalDestination",
                  value
                )
              }
            />

            <Field
              label="Country of Discharge"
              value={
                form.countryOfDischarge
              }
              onChange={(value) =>
                updateField(
                  "countryOfDischarge",
                  value
                )
              }
            />

            <Field
              label="Country of Final Destination"
              value={
                form.countryOfFinalDestination
              }
              onChange={(value) =>
                updateField(
                  "countryOfFinalDestination",
                  value
                )
              }
            />
          </div>
        </div>
      )}

      {/* CONTAINERS */}

      {activeSection === "Containers" && (
        <div className={sectionClass}>
          <SectionHeader
            title="Container Management"
            description="एका Shipment मध्ये multiple containers ठेवता येतील."
            action={
              <button
                type="button"
                onClick={addContainer}
                className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
              >
                + Add Container
              </button>
            }
          />

          <div className="space-y-3">
            {form.containers.length ===
            0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                No containers added.
              </div>
            ) : (
              form.containers.map(
                (container, index) => (
                  <div
                    key={container.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="font-semibold text-gray-800">
                        Container #
                        {index + 1}
                      </h4>

                      <button
                        type="button"
                        onClick={() =>
                          removeContainer(
                            container.id
                          )
                        }
                        className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <Field
                        label="Container No."
                        value={
                          container.containerNo
                        }
                        onChange={(value) =>
                          updateContainer(
                            container.id,
                            "containerNo",
                            value
                          )
                        }
                      />

                      <SelectField
                        label="Container Type"
                        value={
                          container.containerType
                        }
                        options={
                          CONTAINER_TYPES
                        }
                        onChange={(
                          value
                        ) =>
                          updateContainer(
                            container.id,
                            "containerType",
                            value
                          )
                        }
                      />

                      <Field
                        label="Container Size"
                        value={
                          container.containerSize
                        }
                        onChange={(value) =>
                          updateContainer(
                            container.id,
                            "containerSize",
                            value
                          )
                        }
                      />

                      <Field
                        label="Seal No."
                        value={
                          container.sealNo
                        }
                        onChange={(value) =>
                          updateContainer(
                            container.id,
                            "sealNo",
                            value
                          )
                        }
                      />

                      <DateField
                        label="Seal Date"
                        value={
                          container.sealDate
                        }
                        onChange={(value) =>
                          updateContainer(
                            container.id,
                            "sealDate",
                            value
                          )
                        }
                      />

                      <NumberField
                        label="Packages"
                        value={
                          container.packages
                        }
                        onChange={(value) =>
                          updateContainer(
                            container.id,
                            "packages",
                            value
                          )
                        }
                      />

                      <NumberField
                        label="Net Weight"
                        value={
                          container.netWeight
                        }
                        onChange={(value) =>
                          updateContainer(
                            container.id,
                            "netWeight",
                            value
                          )
                        }
                      />

                      <NumberField
                        label="Gross Weight"
                        value={
                          container.grossWeight
                        }
                        onChange={(value) =>
                          updateContainer(
                            container.id,
                            "grossWeight",
                            value
                          )
                        }
                      />

                      <NumberField
                        label="CBM"
                        value={
                          container.cbm
                        }
                        onChange={(value) =>
                          updateContainer(
                            container.id,
                            "cbm",
                            value
                          )
                        }
                      />

                      <DateField
                        label="Stuffing Date"
                        value={
                          container.stuffingDate
                        }
                        onChange={(value) =>
                          updateContainer(
                            container.id,
                            "stuffingDate",
                            value
                          )
                        }
                      />

                      <Field
                        label="Stuffing Location"
                        value={
                          container.stuffingLocation
                        }
                        onChange={(value) =>
                          updateContainer(
                            container.id,
                            "stuffingLocation",
                            value
                          )
                        }
                      />

                      <Field
                        label="Remarks"
                        value={
                          container.remarks
                        }
                        onChange={(value) =>
                          updateContainer(
                            container.id,
                            "remarks",
                            value
                          )
                        }
                      />
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      )}

      {/* CUSTOMS */}

      {activeSection === "Customs" && (
        <div className={sectionClass}>
          <SectionHeader
            title="Customs / Shipping Bill / LEO"
            description="Customs filing आणि LEO tracking."
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Shipping Bill No."
              value={
                form.shippingBillNo
              }
              onChange={(value) =>
                updateField(
                  "shippingBillNo",
                  value
                )
              }
            />

            <DateField
              label="Shipping Bill Date"
              value={
                form.shippingBillDate
              }
              onChange={(value) =>
                updateField(
                  "shippingBillDate",
                  value
                )
              }
            />

            <Field
              label="Shipping Bill Type"
              value={
                form.shippingBillType
              }
              onChange={(value) =>
                updateField(
                  "shippingBillType",
                  value
                )
              }
            />

            <Field
              label="Customs Location"
              value={
                form.customsLocation
              }
              onChange={(value) =>
                updateField(
                  "customsLocation",
                  value
                )
              }
            />

            <Field
              label="IEC"
              value={form.iec}
              onChange={(value) =>
                updateField(
                  "iec",
                  value
                )
              }
            />

            <Field
              label="CHA Code"
              value={form.chaCode}
              onChange={(value) =>
                updateField(
                  "chaCode",
                  value
                )
              }
            />

            <NumberField
              label="FOB Value"
              value={form.fobValue}
              onChange={(value) =>
                updateField(
                  "fobValue",
                  value
                )
              }
            />

            <Field
              label="FOB Currency"
              value={
                form.fobCurrency
              }
              onChange={(value) =>
                updateField(
                  "fobCurrency",
                  value
                )
              }
            />

            <SelectField
              label="Customs Status"
              value={
                form.customsStatus
              }
              options={
                CUSTOMS_STATUSES
              }
              onChange={(value) =>
                updateField(
                  "customsStatus",
                  value
                )
              }
            />

            <DateField
              label="Customs Filing Date"
              value={
                form.customsFilingDate
              }
              onChange={(value) =>
                updateField(
                  "customsFilingDate",
                  value
                )
              }
            />

            <Field
              label="LEO No."
              value={form.leoNo}
              onChange={(value) =>
                updateField(
                  "leoNo",
                  value
                )
              }
            />

            <DateField
              label="LEO Date"
              value={form.leoDate}
              onChange={(value) =>
                updateField(
                  "leoDate",
                  value
                )
              }
            />

            <SelectField
              label="LEO Status"
              value={
                form.leoStatus
              }
              options={
                LEO_STATUSES
              }
              onChange={(value) =>
                updateField(
                  "leoStatus",
                  value
                )
              }
            />

            <Field
              label="Customs / LEO Remarks"
              value={form.remarks}
              onChange={(value) =>
                updateField(
                  "remarks",
                  value
                )
              }
            />
          </div>

          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
            V1.0 मध्ये येथे
            Shipping Bill / LEO
            information capture केली
            जाते. Direct ICEGATE filing
            या form मधून केले जात नाही.
          </div>
        </div>
      )}

      {/* BL / AWB */}

      {activeSection === "BL / AWB" && (
        <div className={sectionClass}>
          <SectionHeader
            title="BL / AWB"
            description="Sea साठी BL आणि Air साठी AWB details."
          />

          {form.shipmentMode ===
            "Sea" && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Field
                label="BL No."
                value={form.blNo}
                onChange={(value) =>
                  updateField(
                    "blNo",
                    value
                  )
                }
              />

              <DateField
                label="BL Date"
                value={form.blDate}
                onChange={(value) =>
                  updateField(
                    "blDate",
                    value
                  )
                }
              />

              <Field
                label="Master BL No."
                value={
                  form.masterBlNo
                }
                onChange={(value) =>
                  updateField(
                    "masterBlNo",
                    value
                  )
                }
              />

              <Field
                label="House BL No."
                value={
                  form.houseBlNo
                }
                onChange={(value) =>
                  updateField(
                    "houseBlNo",
                    value
                  )
                }
              />

              <Field
                label="Shipping Line"
                value={
                  form.shippingLine
                }
                onChange={(value) =>
                  updateField(
                    "shippingLine",
                    value
                  )
                }
              />
            </div>
          )}

          {form.shipmentMode ===
            "Air" && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Field
                label="AWB No."
                value={form.awbNo}
                onChange={(value) =>
                  updateField(
                    "awbNo",
                    value
                  )
                }
              />

              <DateField
                label="AWB Date"
                value={form.awbDate}
                onChange={(value) =>
                  updateField(
                    "awbDate",
                    value
                  )
                }
              />

              <Field
                label="MAWB No."
                value={form.mawbNo}
                onChange={(value) =>
                  updateField(
                    "mawbNo",
                    value
                  )
                }
              />

              <Field
                label="HAWB No."
                value={form.hawbNo}
                onChange={(value) =>
                  updateField(
                    "hawbNo",
                    value
                  )
                }
              />

              <Field
                label="Airline"
                value={form.airline}
                onChange={(value) =>
                  updateField(
                    "airline",
                    value
                  )
                }
              />
            </div>
          )}

          {form.shipmentMode !==
            "Sea" &&
            form.shipmentMode !==
              "Air" && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                BL / AWB fields are
                applicable according
                to shipment mode.
              </div>
            )}
        </div>
      )}

      {/* SCHEDULE */}

      {activeSection ===
        "Documents" && (
        <div className={sectionClass}>
          <SectionHeader
            title="Shipment Documents"
            description="Core shipment document register."
            action={
              <button
                type="button"
                onClick={addDocument}
                className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white"
              >
                + Add Document
              </button>
            }
          />

          <div className="space-y-3">
            {form.documents.map(
              (document) => (
                <div
                  key={document.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <SelectField
                      label="Document Type"
                      value={
                        document.documentType
                      }
                      options={
                        DOCUMENT_TYPES
                      }
                      onChange={(
                        value
                      ) =>
                        updateDocument(
                          document.id,
                          "documentType",
                          value
                        )
                      }
                    />

                    <Field
                      label="Document No."
                      value={
                        document.documentNo
                      }
                      onChange={(value) =>
                        updateDocument(
                          document.id,
                          "documentNo",
                          value
                        )
                      }
                    />

                    <DateField
                      label="Document Date"
                      value={
                        document.documentDate
                      }
                      onChange={(value) =>
                        updateDocument(
                          document.id,
                          "documentDate",
                          value
                        )
                      }
                    />

                    <DateField
                      label="Issue Date"
                      value={
                        document.issueDate
                      }
                      onChange={(value) =>
                        updateDocument(
                          document.id,
                          "issueDate",
                          value
                        )
                      }
                    />

                    <DateField
                      label="Expiry Date"
                      value={
                        document.expiryDate
                      }
                      onChange={(value) =>
                        updateDocument(
                          document.id,
                          "expiryDate",
                          value
                        )
                      }
                    />

                    <Field
                      label="Issued By"
                      value={
                        document.issuedBy
                      }
                      onChange={(value) =>
                        updateDocument(
                          document.id,
                          "issuedBy",
                          value
                        )
                      }
                    />

                    <Field
                      label="Reference No."
                      value={
                        document.referenceNo
                      }
                      onChange={(value) =>
                        updateDocument(
                          document.id,
                          "referenceNo",
                          value
                        )
                      }
                    />

                    <Field
                      label="Status"
                      value={
                        document.status
                      }
                      onChange={(value) =>
                        updateDocument(
                          document.id,
                          "status",
                          value
                        )
                      }
                    />

                    <Field
                      label="Attachment"
                      value={
                        document.attachmentName
                      }
                      onChange={(value) =>
                        updateDocument(
                          document.id,
                          "attachmentName",
                          value
                        )
                      }
                    />

                    <Field
                      label="Remarks"
                      value={
                        document.remarks
                      }
                      onChange={(value) =>
                        updateDocument(
                          document.id,
                          "remarks",
                          value
                        )
                      }
                    />
                  </div>

                  <div className="mt-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        removeDocument(
                          document.id
                        )
                      }
                      className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            )}

            {form.documents.length ===
              0 && (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                No shipment documents
                added.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CERTIFICATES */}

      {activeSection ===
        "Certificates" && (
        <div className={sectionClass}>
          <SectionHeader
            title="Certificate / Compliance Documents"
            description="Conditional export certificates."
            action={
              <button
                type="button"
                onClick={addCertificate}
                className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white"
              >
                + Add Certificate
              </button>
            }
          />

          <div className="space-y-3">
            {form.certificates.map(
              (certificate) => (
                <div
                  key={certificate.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <SelectField
                      label="Certificate Type"
                      value={
                        certificate.certificateType
                      }
                      options={
                        CERTIFICATE_TYPES
                      }
                      onChange={(
                        value
                      ) =>
                        updateCertificate(
                          certificate.id,
                          "certificateType",
                          value
                        )
                      }
                    />

                    <div>
                      <label
                        className={
                          labelClass
                        }
                      >
                        Required
                      </label>

                      <label className="flex h-[38px] cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm">
                        <input
                          type="checkbox"
                          checked={
                            certificate.required
                          }
                          onChange={(e) =>
                            updateCertificate(
                              certificate.id,
                              "required",
                              e.target
                                .checked
                            )
                          }
                        />

                        Required
                      </label>
                    </div>

                    <Field
                      label="Document No."
                      value={
                        certificate.documentNo
                      }
                      onChange={(value) =>
                        updateCertificate(
                          certificate.id,
                          "documentNo",
                          value
                        )
                      }
                    />

                    <DateField
                      label="Issue Date"
                      value={
                        certificate.issueDate
                      }
                      onChange={(value) =>
                        updateCertificate(
                          certificate.id,
                          "issueDate",
                          value
                        )
                      }
                    />

                    <DateField
                      label="Expiry Date"
                      value={
                        certificate.expiryDate
                      }
                      onChange={(value) =>
                        updateCertificate(
                          certificate.id,
                          "expiryDate",
                          value
                        )
                      }
                    />

                    <Field
                      label="Issued By"
                      value={
                        certificate.issuedBy
                      }
                      onChange={(value) =>
                        updateCertificate(
                          certificate.id,
                          "issuedBy",
                          value
                        )
                      }
                    />

                    <Field
                      label="Status"
                      value={
                        certificate.status
                      }
                      onChange={(value) =>
                        updateCertificate(
                          certificate.id,
                          "status",
                          value
                        )
                      }
                    />

                    <Field
                      label="Attachment"
                      value={
                        certificate.attachmentName
                      }
                      onChange={(value) =>
                        updateCertificate(
                          certificate.id,
                          "attachmentName",
                          value
                        )
                      }
                    />

                    <Field
                      label="Remarks"
                      value={
                        certificate.remarks
                      }
                      onChange={(value) =>
                        updateCertificate(
                          certificate.id,
                          "remarks",
                          value
                        )
                      }
                    />
                  </div>

                  <div className="mt-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        removeCertificate(
                          certificate.id
                        )
                      }
                      className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            )}

            {form.certificates.length ===
              0 && (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                No certificates added.
              </div>
            )}
          </div>
        </div>
      )}

      {/* INSURANCE */}

      {activeSection ===
        "Insurance" && (
        <div className={sectionClass}>
          <SectionHeader
            title="Insurance"
            description="Shipment insurance details."
          />

          <div className="mb-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={
                  form.insuranceRequired
                }
                onChange={(e) =>
                  updateField(
                    "insuranceRequired",
                    e.target.checked
                  )
                }
              />

              Insurance Required
            </label>
          </div>

          {form.insuranceRequired && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Insurance Company"
                value={
                  form.insuranceCompany
                }
                onChange={(value) =>
                  updateField(
                    "insuranceCompany",
                    value
                  )
                }
              />

              <Field
                label="Policy No."
                value={
                  form.insurancePolicyNo
                }
                onChange={(value) =>
                  updateField(
                    "insurancePolicyNo",
                    value
                  )
                }
              />

              <Field
                label="Certificate No."
                value={
                  form.insuranceCertificateNo
                }
                onChange={(value) =>
                  updateField(
                    "insuranceCertificateNo",
                    value
                  )
                }
              />

              <DateField
                label="Policy Date"
                value={
                  form.insurancePolicyDate
                }
                onChange={(value) =>
                  updateField(
                    "insurancePolicyDate",
                    value
                  )
                }
              />

              <DateField
                label="Expiry Date"
                value={
                  form.insuranceExpiryDate
                }
                onChange={(value) =>
                  updateField(
                    "insuranceExpiryDate",
                    value
                  )
                }
              />

              <NumberField
                label="Insured Value"
                value={
                  form.insuranceValue
                }
                onChange={(value) =>
                  updateField(
                    "insuranceValue",
                    value
                  )
                }
              />

              <Field
                label="Currency"
                value={
                  form.insuranceCurrency
                }
                onChange={(value) =>
                  updateField(
                    "insuranceCurrency",
                    value
                  )
                }
              />

              <NumberField
                label="Premium"
                value={
                  form.insurancePremium
                }
                onChange={(value) =>
                  updateField(
                    "insurancePremium",
                    value
                  )
                }
              />

              <div className="md:col-span-2 lg:col-span-4">
                <label
                  className={labelClass}
                >
                  Coverage
                </label>

                <textarea
                  value={
                    form.insuranceCoverage
                  }
                  onChange={(e) =>
                    updateField(
                      "insuranceCoverage",
                      e.target.value
                    )
                  }
                  rows={3}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHARGES */}

      {activeSection ===
        "Charges" && (
        <div className={sectionClass}>
          <SectionHeader
            title="Freight & Shipment Charges"
            description="Shipment logistics खर्च."
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Freight Amount"
              value={
                form.freightAmount
              }
              onChange={(value) =>
                updateField(
                  "freightAmount",
                  value
                )
              }
            />

            <Field
              label="Freight Currency"
              value={
                form.freightCurrency
              }
              onChange={(value) =>
                updateField(
                  "freightCurrency",
                  value
                )
              }
            />

            <Field
              label="Freight Paid By"
              value={
                form.freightPaidBy
              }
              onChange={(value) =>
                updateField(
                  "freightPaidBy",
                  value
                )
              }
            />

            <NumberField
              label="Ocean Freight"
              value={
                form.oceanFreight
              }
              onChange={(value) =>
                updateField(
                  "oceanFreight",
                  value
                )
              }
            />

            <NumberField
              label="Air Freight"
              value={form.airFreight}
              onChange={(value) =>
                updateField(
                  "airFreight",
                  value
                )
              }
            />

            <NumberField
              label="CHA Charges"
              value={form.chaCharges}
              onChange={(value) =>
                updateField(
                  "chaCharges",
                  value
                )
              }
            />

            <NumberField
              label="Transport Charges"
              value={
                form.transportCharges
              }
              onChange={(value) =>
                updateField(
                  "transportCharges",
                  value
                )
              }
            />

            <NumberField
              label="Port Charges"
              value={
                form.portCharges
              }
              onChange={(value) =>
                updateField(
                  "portCharges",
                  value
                )
              }
            />

            <NumberField
              label="Documentation Charges"
              value={
                form.documentationCharges
              }
              onChange={(value) =>
                updateField(
                  "documentationCharges",
                  value
                )
              }
            />

            <NumberField
              label="Other Charges"
              value={
                form.otherCharges
              }
              onChange={(value) =>
                updateField(
                  "otherCharges",
                  value
                )
              }
            />

            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="text-xs font-semibold text-green-700">
                Total Shipment Charges
              </div>

              <div className="mt-1 text-xl font-bold text-green-800">
                {calculatedCharges.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 2,
                  }
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE / PAYMENT */}

      {activeSection ===
        "Invoice / Payment" && (
        <div className={sectionClass}>
          <SectionHeader
            title="Invoice / Payment Link"
            description="Shipment → Invoice → Payment relationship."
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>
                Commercial Invoice No.
              </label>
              <select
                value={form.commercialInvoiceNo}
                onChange={(e) => {
                  const invoice = commercialInvoices.find(
                    (item) => item.invoiceNo === e.target.value
                  );

                  if (!invoice) {
                    updateField(
                      "commercialInvoiceNo",
                      ""
                    );
                    return;
                  }

                  setForm((current) => ({
                    ...current,
                    commercialInvoiceNo: invoice.invoiceNo,
                    invoiceAmount: toNumber(
                      invoice.totalInvoiceValue
                    ),
                    currency:
                      invoice.currency || current.currency,
                    updatedAt: new Date().toISOString(),
                  }));
                }}
                onFocus={() =>
                  setCommercialInvoices(
                    loadCommercialInvoices()
                  )
                }
                className={inputClass}
              >
                <option value="">
                  {matchingCommercialInvoices.length === 0
                    ? "No Invoice Found"
                    : "Select Commercial Invoice"}
                </option>
                {matchingCommercialInvoices.map(
                  (invoice) => (
                    <option
                      key={invoice.invoiceNo}
                      value={invoice.invoiceNo}
                    >
                      {invoice.invoiceNo} - {invoice.customerName}
                    </option>
                  )
                )}
              </select>
            </div>

            <NumberField
              label="Invoice Amount"
              value={
                form.invoiceAmount
              }
              onChange={(value) =>
                updateField(
                  "invoiceAmount",
                  value
                )
              }
            />

            <Field
              label="Payment Status"
              value={
                form.paymentStatus
              }
              onChange={(value) =>
                updateField(
                  "paymentStatus",
                  value
                )
              }
            />

            <Field
              label="Invoice Currency"
              value={
                form.currency
              }
              onChange={(value) =>
                updateField(
                  "currency",
                  value
                )
              }
            />
          </div>

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            Payment module पुढील
            workflow मध्ये Invoice No. आणि
            Shipment No. वापरून payment
            tracking करू शकतो.
          </div>
        </div>
      )}

      {/* TIMELINE */}

      {activeSection === "Timeline" && (
        <div className={sectionClass}>
          <SectionHeader
            title="Shipment Status Timeline"
            description="Shipment lifecycle tracking."
            action={
              <button
                type="button"
                onClick={addTimeline}
                className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white"
              >
                + Add Timeline
              </button>
            }
          />

          <div className="space-y-3">
            {form.timeline.map(
              (item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label
                        className={
                          labelClass
                        }
                      >
                        Status
                      </label>

                      <select
                        value={
                          item.status
                        }
                        onChange={(e) =>
                          updateTimeline(
                            item.id,
                            "status",
                            e.target.value
                          )
                        }
                        className={
                          inputClass
                        }
                      >
                        {SHIPMENT_STATUSES.map(
                          (status) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {status}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <DateField
                      label="Date"
                      value={item.date}
                      onChange={(value) =>
                        updateTimeline(
                          item.id,
                          "date",
                          value
                        )
                      }
                    />

                    <div className="md:col-span-2">
                      <label
                        className={
                          labelClass
                        }
                      >
                        Remarks
                      </label>

                      <input
                        value={
                          item.remarks
                        }
                        onChange={(e) =>
                          updateTimeline(
                            item.id,
                            "remarks",
                            e.target.value
                          )
                        }
                        className={
                          inputClass
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Timeline #{index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        removeTimeline(
                          item.id
                        )
                      }
                      className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* REMARKS */}

      {activeSection === "Remarks" && (
        <div className={sectionClass}>
          <SectionHeader
            title="Remarks"
            description="Additional shipment notes."
          />

          <textarea
            value={form.remarks}
            onChange={(e) =>
              updateField(
                "remarks",
                e.target.value
              )
            }
            rows={8}
            className={inputClass}
            placeholder="Enter shipment remarks..."
          />
        </div>
      )}

      {/* SCHEDULE DETAILS */}

      {activeSection === "Logistics" && (
        <div className={sectionClass}>
          <SectionHeader
            title="Shipment Schedule"
            description="Planned आणि actual shipment milestones."
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <DateField
              label="ETD"
              value={form.etd}
              onChange={(value) =>
                updateField(
                  "etd",
                  value
                )
              }
            />

            <DateField
              label="ETA"
              value={form.eta}
              onChange={(value) =>
                updateField(
                  "eta",
                  value
                )
              }
            />

            <DateField
              label="Actual Departure"
              value={
                form.actualDeparture
              }
              onChange={(value) =>
                updateField(
                  "actualDeparture",
                  value
                )
              }
            />

            <DateField
              label="Actual Arrival"
              value={
                form.actualArrival
              }
              onChange={(value) =>
                updateField(
                  "actualArrival",
                  value
                )
              }
            />

            <DateField
              label="Cargo Ready Date"
              value={
                form.cargoReadyDate
              }
              onChange={(value) =>
                updateField(
                  "cargoReadyDate",
                  value
                )
              }
            />

            <DateField
              label="Stuffing Date"
              value={
                form.stuffingDate
              }
              onChange={(value) =>
                updateField(
                  "stuffingDate",
                  value
                )
              }
            />

            <DateField
              label="Gate-in Date"
              value={
                form.gateInDate
              }
              onChange={(value) =>
                updateField(
                  "gateInDate",
                  value
                )
              }
            />

            <DateField
              label="Gate-out Date"
              value={
                form.gateOutDate
              }
              onChange={(value) =>
                updateField(
                  "gateOutDate",
                  value
                )
              }
            />
          </div>
        </div>
      )}

      {/* FOOTER ACTIONS */}

      <div className="sticky bottom-0 z-20 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-gray-500">
            Reservation → Packing →
            Shipment → Invoice →
            Payment
            <span className="ml-2 font-semibold text-green-700">
              Stock is not deducted again at Shipment.
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
            >
              {isEdit
                ? "Update Shipment"
                : "Save Shipment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-bold text-gray-800">
          {title}
        </h3>

        {description && (
          <p className="mt-1 text-xs text-gray-500">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-bold text-gray-800">
        {value.toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">
        {label}
      </label>

      <input
        type="number"
        value={value}
        onChange={(e) =>
          onChange(
            Number(e.target.value) || 0
          )
        }
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [textValue, setTextValue] = useState(
    formatDateForDisplay(value)
  );
  const [pickerValue, setPickerValue] = useState(
    value || ""
  );
  const pickerRef = React.useRef<HTMLInputElement | null>(
    null
  );

  useEffect(() => {
    setTextValue(formatDateForDisplay(value));
    setPickerValue(value || "");
  }, [value]);

  const handleTextChange = (nextValue: string) => {
    setTextValue(nextValue);

    if (
      nextValue.length === 10 &&
      isValidDateDisplay(nextValue)
    ) {
      const storageDate = formatDateForStorage(nextValue);
      setPickerValue(storageDate);
      onChange(storageDate);
    } else if (!nextValue) {
      setPickerValue("");
      onChange("");
    }
  };

  const handleTextBlur = () => {
    if (!textValue.trim()) {
      onChange("");
      return;
    }

    const storageDate = formatDateForStorage(textValue);

    if (storageDate) {
      setTextValue(formatDateForDisplay(storageDate));
      setPickerValue(storageDate);
      onChange(storageDate);
      return;
    }

    setTextValue(formatDateForDisplay(value));
    setPickerValue(value || "");
  };

  const handlePickerChange = (nextValue: string) => {
    setPickerValue(nextValue);
    setTextValue(formatDateForDisplay(nextValue));
    onChange(nextValue);
  };

  return (
    <div>
      {label ? (
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          type="text"
          value={textValue}
          onChange={(e) =>
            handleTextChange(e.target.value)
          }
          onBlur={handleTextBlur}
          placeholder="DD/MM/YYYY"
          inputMode="numeric"
          maxLength={10}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-11 text-sm text-gray-800 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
        />

        <button
          type="button"
          aria-label={`Select ${label || "date"}`}
          title="Select date"
          onClick={() => {
            const picker = pickerRef.current;

            if (!picker) return;

            if (
              typeof picker.showPicker === "function"
            ) {
              picker.showPicker();
            } else {
              picker.focus();
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-700 hover:bg-gray-100"
        >
          📅
        </button>

        <input
          ref={pickerRef}
          type="date"
          value={pickerValue}
          onChange={(e) =>
            handlePickerChange(e.target.value)
          }
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function Th({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
      {children}
    </th>
  );
}

function Td({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="px-3 py-3 align-top">
      {children}
    </td>
  );
}