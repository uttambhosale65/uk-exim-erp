"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ExportProformaInvoice,
  ExportProformaInvoiceItem,
  ExportProformaInvoiceStatus,
} from "./ExportProformaInvoiceTypes";
import {
  ExportQuotation,
  ExportQuotationItem,
} from "../quotation/ExportQuotationTypes";
import { loadExportQuotations } from "../quotation/ExportQuotationStorage";
import { loadExportCustomers } from "../customer/ExportCustomerStorage";
import { ExportCustomer } from "../customer/ExportCustomerTypes";

type ExportProformaInvoiceFormProps = {
  invoiceNo: string;
  initialData?: ExportProformaInvoice | null;
  onSave: (invoice: ExportProformaInvoice) => void;
  onCancel?: () => void;
};

const STATUS_OPTIONS: ExportProformaInvoiceStatus[] = [
  "Draft",
  "Issued",
  "Sent",
  "Under Discussion",
  "Accepted",
  "Cancelled",
  "Converted",
];

const PAYMENT_METHOD_OPTIONS = [
  "Advance",
  "TT",
  "LC",
  "DP",
  "DA",
  "Open Account",
  "Other",
];

const SHIPMENT_MODE_OPTIONS = [
  "Sea",
  "Air",
  "Road",
  "Rail",
  "Courier",
];

const CURRENCY_OPTIONS = [
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SAR",
  "QAR",
  "OMR",
  "INR",
];

const INCOTERM_OPTIONS = [
  "EXW",
  "FCA",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DDP",
];

const DEFAULT_TERMS = [
  "This Proforma Invoice is valid only until the validity date mentioned above.",
  "Prices are based on the stated Incoterm and commercial terms.",
  "Delivery schedule is subject to mutual confirmation and availability.",
  "Payment shall be made according to the agreed payment terms.",
  "Freight and insurance are subject to the stated quotation and shipment arrangement.",
  "Import duties, destination taxes and local charges shall be borne by the buyer unless otherwise agreed.",
  "Packing shall be as mutually agreed between exporter and buyer.",
  "Any change in product specification, quantity or shipment terms may require revised pricing.",
  "Final shipment documents will be prepared based on actual shipment details.",
  "Partial shipment or transshipment shall be subject to mutual agreement.",
  "Orders are subject to acceptance by UK EXIM ENTERPRISES.",
  "Force majeure conditions may affect delivery schedules.",
];

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateForInput(value: string): string {
  if (!value) return "";

  const directMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (directMatch) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function createEmptyItem(): ExportProformaInvoiceItem {
  return {
    productCode: "",
    productName: "",
    hsCode: "",
    countryOfOrigin: "India",
    qty: 0,
    unit: "KG",
    unitPrice: 0,
    discount: 0,
    amount: 0,
    customerRequirement: "",
    packingType: "",
    packageQty: 0,
    netWeight: 0,
    grossWeight: 0,
    cbm: 0,
    marksNumbers: "",
    grade: "",
    brand: "",
    specification: "",
  };
}

function quotationItemToProformaItem(
  item: ExportQuotationItem
): ExportProformaInvoiceItem {
  const qty = Number(item.qty || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const amount = Number(item.amount || qty * unitPrice);

  return {
    productCode: item.productCode || "",
    productName: item.productName || "",
    hsCode: "",
    countryOfOrigin: "India",
    qty,
    unit: item.unit || "KG",
    unitPrice,
    discount: 0,
    amount,
    customerRequirement: item.customerRequirement || "",
    packingType: "",
    packageQty: 0,
    netWeight: 0,
    grossWeight: 0,
    cbm: 0,
    marksNumbers: "",
    grade: "",
    brand: "",
    specification: "",
  };
}

function createEmptyInvoice(
  invoiceNo: string
): ExportProformaInvoice {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),

    proformaInvoiceNo: invoiceNo,
    proformaInvoiceDate: getToday(),
    quotationNo: "",
    enquiryNo: "",
    exportOrderNo: "",
    validityDate: "",
    status: "Draft",

    exporterName: "UK EXIM ENTERPRISES",
    exporterAddress:
      "A-703, Vishnu Greens, City Pride School Road, Jadhavwadi, Chikhali, Pune - 411062",
    exporterCity: "Pune",
    exporterState: "Maharashtra",
    exporterCountry: "India",
    exporterMobile: "+91 9970187185",
    exporterEmail: "uk37exim@gmail.com",
    exporterWebsite: "www.ukeximenterprises.com",
    exporterIEC: "AJUPB0025D",
    exporterGSTIN: "27AJUPB0025D1ZO",
    exporterPAN: "AJUPB0025D",

    customerCode: "",
    customerName: "",
    contactPerson: "",
    buyerAddress: "",
    buyerCity: "",
    buyerStateProvince: "",
    buyerPostalCode: "",
    buyerCountry: "",
    buyerTaxRegistrationNo: "",
    buyerEmail: "",
    buyerMobile: "",

    consigneeName: "",
    consigneeAddress: "",
    consigneeCountry: "",
    importerName: "",
    importerAddress: "",
    importerCountry: "",
    notifyParty: "",

    buyerReferenceNo: "",
    buyerPONo: "",
    buyerPODate: "",
    lcNo: "",
    lcDate: "",

    currency: "USD",
    incoterm: "FOB",
    incotermPlace: "",
    paymentTerms: "",
    paymentMethod: "TT",
    shipmentMode: "Sea",
    estimatedShipmentDate: "",

    portOfLoading: "",
    portOfDischarge: "",
    finalDestination: "",
    countryOfDestination: "",
    countryOfOrigin: "India",
    vesselFlightNo: "",
    voyageNo: "",
    containerNo: "",
    sealNo: "",
    blAwbNo: "",
    blAwbDate: "",

    items: [createEmptyItem()],

    totalPackages: 0,
    packageType: "",
    totalNetWeight: 0,
    totalGrossWeight: 0,
    totalCBM: 0,
    marksNumbers: "",

    totalGoodsValue: 0,
    discount: 0,
    freight: 0,
    insurance: 0,
    otherCharges: 0,
    totalProformaValue: 0,

    exchangeRate: 1,
    inrEquivalent: 0,

    bankName: "",
    bankBranch: "",
    bankAddress: "",
    bankAccountName: "",
    bankAccountNo: "",
    swiftBic: "",
    adCode: "",
    advancePercentage: 0,
    advanceAmount: 0,
    balanceAmount: 0,

    declaration:
      "We certify that the information stated in this Proforma Invoice is true and correct to the best of our knowledge.",
    authorizedSignatory: "",
    signatoryDesignation: "",
    place: "Pune",

    remarks: "",
    termsAndConditions: [...DEFAULT_TERMS],

    createdAt: now,
    updatedAt: now,
  };
}

function normaliseExistingInvoice(
  invoice: ExportProformaInvoice
): ExportProformaInvoice {
  return {
    ...invoice,
    proformaInvoiceDate: formatDateForInput(
      invoice.proformaInvoiceDate
    ),
    validityDate: formatDateForInput(invoice.validityDate),
    buyerPODate: formatDateForInput(invoice.buyerPODate),
    lcDate: formatDateForInput(invoice.lcDate),
    estimatedShipmentDate: formatDateForInput(
      invoice.estimatedShipmentDate
    ),
    blAwbDate: formatDateForInput(invoice.blAwbDate),
    items:
      Array.isArray(invoice.items) && invoice.items.length > 0
        ? invoice.items
        : [createEmptyItem()],
    termsAndConditions:
      Array.isArray(invoice.termsAndConditions) &&
      invoice.termsAndConditions.length > 0
        ? invoice.termsAndConditions
        : [...DEFAULT_TERMS],
  };
}

export default function ExportProformaInvoiceForm({
  invoiceNo,
  initialData,
  onSave,
  onCancel,
}: ExportProformaInvoiceFormProps) {
  const [form, setForm] = useState<ExportProformaInvoice>(() =>
    initialData
      ? normaliseExistingInvoice(initialData)
      : createEmptyInvoice(invoiceNo)
  );

  const [quotations, setQuotations] = useState<ExportQuotation[]>([]);
  const [customers, setCustomers] = useState<ExportCustomer[]>([]);
  const [selectedQuotationNo, setSelectedQuotationNo] =
    useState<string>(initialData?.quotationNo || "");

  useEffect(() => {
    setQuotations(loadExportQuotations());
    setCustomers(loadExportCustomers());
  }, []);

  useEffect(() => {
    if (initialData) {
      const normalised = normaliseExistingInvoice(initialData);

      setForm(normalised);
      setSelectedQuotationNo(normalised.quotationNo || "");
    } else {
      setForm(createEmptyInvoice(invoiceNo));
      setSelectedQuotationNo("");
    }
  }, [initialData, invoiceNo]);

  const selectedQuotation = useMemo(() => {
    if (!selectedQuotationNo) return undefined;

    return quotations.find(
      (quotation) =>
        quotation.quotationNo === selectedQuotationNo
    );
  }, [quotations, selectedQuotationNo]);

  const selectedCustomer = useMemo(() => {
    if (!form.customerCode) return undefined;

    return customers.find(
      (customer) => customer.code === form.customerCode
    );
  }, [customers, form.customerCode]);

  const calculatedItems = useMemo(() => {
    return form.items.map((item) => {
      const gross =
        Number(item.qty || 0) *
        Number(item.unitPrice || 0);

      const discount = Math.max(
        0,
        Number(item.discount || 0)
      );

      return {
        ...item,
        amount: Math.max(0, gross - discount),
      };
    });
  }, [form.items]);

  const totals = useMemo(() => {
    const totalGoodsValue = calculatedItems.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const totalPackages = calculatedItems.reduce(
      (sum, item) => sum + Number(item.packageQty || 0),
      0
    );

    const totalNetWeight = calculatedItems.reduce(
      (sum, item) => sum + Number(item.netWeight || 0),
      0
    );

    const totalGrossWeight = calculatedItems.reduce(
      (sum, item) => sum + Number(item.grossWeight || 0),
      0
    );

    const totalCBM = calculatedItems.reduce(
      (sum, item) => sum + Number(item.cbm || 0),
      0
    );

    const discount = calculatedItems.reduce(
      (sum, item) => sum + Number(item.discount || 0),
      0
    );

    const totalProformaValue =
      totalGoodsValue +
      Number(form.freight || 0) +
      Number(form.insurance || 0) +
      Number(form.otherCharges || 0);

    const exchangeRate = Number(form.exchangeRate || 0);

    const inrEquivalent =
      totalProformaValue * exchangeRate;

    const advancePercentage = Number(
      form.advancePercentage || 0
    );

    const advanceAmount =
      (totalProformaValue * advancePercentage) / 100;

    const balanceAmount =
      totalProformaValue - advanceAmount;

    return {
      totalGoodsValue,
      totalPackages,
      totalNetWeight,
      totalGrossWeight,
      totalCBM,
      discount,
      totalProformaValue,
      inrEquivalent,
      advanceAmount,
      balanceAmount,
    };
  }, [
    calculatedItems,
    form.freight,
    form.insurance,
    form.otherCharges,
    form.exchangeRate,
    form.advancePercentage,
  ]);

  useEffect(() => {
    setForm((previous) => {
      const sameItems =
        JSON.stringify(previous.items) ===
        JSON.stringify(calculatedItems);

      const sameTotals =
        previous.totalGoodsValue === totals.totalGoodsValue &&
        previous.totalPackages === totals.totalPackages &&
        previous.totalNetWeight === totals.totalNetWeight &&
        previous.totalGrossWeight === totals.totalGrossWeight &&
        previous.totalCBM === totals.totalCBM &&
        previous.discount === totals.discount &&
        previous.totalProformaValue ===
          totals.totalProformaValue &&
        previous.inrEquivalent === totals.inrEquivalent &&
        previous.advanceAmount === totals.advanceAmount &&
        previous.balanceAmount === totals.balanceAmount;

      if (sameItems && sameTotals) {
        return previous;
      }

      return {
        ...previous,
        items: calculatedItems,
        totalGoodsValue: totals.totalGoodsValue,
        totalPackages: totals.totalPackages,
        totalNetWeight: totals.totalNetWeight,
        totalGrossWeight: totals.totalGrossWeight,
        totalCBM: totals.totalCBM,
        discount: totals.discount,
        totalProformaValue: totals.totalProformaValue,
        inrEquivalent: totals.inrEquivalent,
        advanceAmount: totals.advanceAmount,
        balanceAmount: totals.balanceAmount,
      };
    });
  }, [calculatedItems, totals]);

  const updateField = <
    K extends keyof ExportProformaInvoice
  >(
    field: K,
    value: ExportProformaInvoice[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateItem = (
    index: number,
    field: keyof ExportProformaInvoiceItem,
    value: string | number
  ) => {
    setForm((previous) => {
      const items = [...previous.items];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      return {
        ...previous,
        items,
      };
    });
  };

  const handleQuotationChange = (
    quotationNo: string
  ) => {
    setSelectedQuotationNo(quotationNo);

    if (!quotationNo) {
      return;
    }

    const quotation = quotations.find(
      (item) => item.quotationNo === quotationNo
    );

    if (!quotation) {
      return;
    }

    const customer = customers.find(
      (item) => item.code === quotation.customerCode
    );

    const quotationItems =
      Array.isArray(quotation.items) &&
      quotation.items.length > 0
        ? quotation.items.map(quotationItemToProformaItem)
        : [createEmptyItem()];

    const customerCountry =
      customer?.country || quotation.country || "";

    setForm((previous) => ({
      ...previous,

      quotationNo: quotation.quotationNo,
      enquiryNo: quotation.enquiryNo,

      customerCode: quotation.customerCode,
      customerName: quotation.customerName,
      contactPerson:
        quotation.contactPerson ||
        customer?.contactPerson ||
        "",

      buyerAddress: customer?.address || "",
      buyerCity: customer?.city || "",
      buyerStateProvince:
        customer?.stateProvince || "",
      buyerPostalCode: customer?.postalCode || "",
      buyerCountry: customerCountry,
      buyerTaxRegistrationNo:
        customer?.taxRegistrationNo || "",
      buyerEmail: customer?.email || "",
      buyerMobile: customer?.mobile || "",

      consigneeName: quotation.customerName,
      consigneeCountry: customerCountry,

      importerName: quotation.customerName,
      importerCountry: customerCountry,

      currency: quotation.currency || "USD",
      incoterm: quotation.incoterm || "FOB",
      paymentTerms: quotation.paymentTerms || "",

      freight: Number(quotation.freight || 0),
      insurance: Number(quotation.insurance || 0),
      otherCharges: Number(
        quotation.otherCharges || 0
      ),

      items: quotationItems,

      remarks: quotation.remarks || "",

      validityDate: formatDateForInput(
        quotation.validityDate
      ),
    }));
  };

  const addItem = () => {
    setForm((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        createEmptyItem(),
      ],
    }));
  };

  const removeItem = (index: number) => {
    setForm((previous) => {
      if (previous.items.length <= 1) {
        return previous;
      }

      return {
        ...previous,
        items: previous.items.filter(
          (_, itemIndex) => itemIndex !== index
        ),
      };
    });
  };

  const updateTerm = (
    index: number,
    value: string
  ) => {
    setForm((previous) => {
      const terms = [...previous.termsAndConditions];

      terms[index] = value;

      return {
        ...previous,
        termsAndConditions: terms,
      };
    });
  };

  const addTerm = () => {
    setForm((previous) => ({
      ...previous,
      termsAndConditions: [
        ...previous.termsAndConditions,
        "",
      ],
    }));
  };

  const removeTerm = (index: number) => {
    setForm((previous) => ({
      ...previous,
      termsAndConditions:
        previous.termsAndConditions.filter(
          (_, termIndex) => termIndex !== index
        ),
    }));
  };

  const handleReset = () => {
    if (initialData) {
      const normalised =
        normaliseExistingInvoice(initialData);

      setForm(normalised);
      setSelectedQuotationNo(
        normalised.quotationNo || ""
      );
      return;
    }

    setForm(createEmptyInvoice(invoiceNo));
    setSelectedQuotationNo("");
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.quotationNo.trim()) {
      alert(
        "Please select an Export Quotation before creating the Proforma Invoice."
      );
      return;
    }

    if (!form.proformaInvoiceDate) {
      alert(
        "Please enter Proforma Invoice Date."
      );
      return;
    }

    if (!form.customerName.trim()) {
      alert(
        "Customer details could not be loaded from the selected quotation."
      );
      return;
    }

    const hasValidItem = form.items.some(
      (item) =>
        item.productName.trim() &&
        Number(item.qty) > 0
    );

    if (!hasValidItem) {
      alert(
        "The selected quotation does not contain a valid product line."
      );
      return;
    }

    const now = new Date().toISOString();

    const finalInvoice: ExportProformaInvoice = {
      ...form,

      id: form.id || crypto.randomUUID(),

      proformaInvoiceNo:
        form.proformaInvoiceNo || invoiceNo,

      quotationNo: form.quotationNo,

      enquiryNo: form.enquiryNo,

      items: calculatedItems,

      totalGoodsValue:
        totals.totalGoodsValue,

      totalPackages:
        totals.totalPackages,

      totalNetWeight:
        totals.totalNetWeight,

      totalGrossWeight:
        totals.totalGrossWeight,

      totalCBM:
        totals.totalCBM,

      discount:
        totals.discount,

      totalProformaValue:
        totals.totalProformaValue,

      inrEquivalent:
        totals.inrEquivalent,

      advanceAmount:
        totals.advanceAmount,

      balanceAmount:
        totals.balanceAmount,

      updatedAt: now,

      createdAt:
        form.createdAt || now,
    };

    onSave(finalInvoice);
  };

  const readonlyStyle: React.CSSProperties = {
    background: "#f3f4f6",
    color: "#374151",
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%",
        maxWidth: "1600px",
        margin: "0 auto",
        padding: "6px",
        boxSizing: "border-box",
        background: "#f7f8fa",
        color: "#1f2937",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <style>{`
        .pi-section {
          background: #ffffff;
          border: 1px solid #dfe3e8;
          border-radius: 6px;
          margin-bottom: 6px;
          overflow: hidden;
        }

        .pi-section-title {
          padding: 6px 9px;
          background: #f1f3f5;
          border-bottom: 1px solid #dfe3e8;
          font-size: 12px;
          font-weight: 700;
        }

        .pi-section-body {
          padding: 6px 8px;
        }

        .pi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 5px;
        }

        .pi-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 5px;
        }

        .pi-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5px;
        }

        .pi-field {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pi-field-full {
          grid-column: 1 / -1;
        }

        .pi-label {
          font-size: 11px;
          line-height: 14px;
          font-weight: 600;
          color: #4b5563;
        }

        .pi-input,
        .pi-select,
        .pi-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cfd5dc;
          border-radius: 4px;
          padding: 4px 6px;
          font-size: 12px;
          line-height: 16px;
          background: #ffffff;
          color: #111827;
          outline: none;
        }

        .pi-input:focus,
        .pi-select:focus,
        .pi-textarea:focus {
          border-color: #6b7280;
        }

        .pi-input-readonly {
          background: #f3f4f6;
        }

        .pi-textarea {
          min-height: 38px;
          height: 38px;
          resize: vertical;
        }

        .pi-workflow-box {
          border: 1px solid #d8dee5;
          border-radius: 5px;
          padding: 6px;
          background: #fafbfc;
        }

        .pi-workflow-note {
          margin-top: 4px;
          font-size: 10px;
          line-height: 13px;
          color: #6b7280;
        }

        .pi-source-badge {
          display: inline-block;
          margin-top: 4px;
          padding: 2px 6px;
          border-radius: 10px;
          background: #eef2f7;
          color: #374151;
          font-size: 10px;
          line-height: 13px;
          font-weight: 600;
        }

        .pi-table-wrap {
          overflow-x: auto;
          border: 1px solid #dfe3e8;
          border-radius: 5px;
        }

        .pi-table {
          width: 100%;
          min-width: 1500px;
          border-collapse: collapse;
          font-size: 10px;
        }

        .pi-table th {
          background: #f1f3f5;
          border-bottom: 1px solid #dfe3e8;
          padding: 4px;
          text-align: left;
          white-space: nowrap;
        }

        .pi-table td {
          border-bottom: 1px solid #edf0f2;
          padding: 3px;
          vertical-align: top;
        }

        .pi-table input {
          width: 100%;
          min-width: 60px;
          height: 25px;
          box-sizing: border-box;
          border: 1px solid #d3d8de;
          border-radius: 3px;
          padding: 3px 4px;
          font-size: 10px;
        }

        .pi-table .pi-source-cell {
          background: #fafafa;
        }

        .pi-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          margin-top: 7px;
        }

        .pi-btn {
          border: 1px solid #c7ccd2;
          border-radius: 4px;
          padding: 6px 11px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          background: #ffffff;
        }

        .pi-btn-primary {
          background: #1f2937;
          color: #ffffff;
          border-color: #1f2937;
        }

        .pi-btn-danger {
          color: #b91c1c;
        }

        .pi-summary {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 8px;
          align-items: start;
        }

        .pi-summary-box {
          border: 1px solid #dfe3e8;
          border-radius: 5px;
          padding: 7px;
          background: #fafafa;
        }

        .pi-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          padding: 4px 0;
          border-bottom: 1px solid #e5e7eb;
          font-size: 11px;
        }

        .pi-summary-row:last-child {
          border-bottom: 0;
        }

        .pi-summary-total {
          font-size: 13px;
          font-weight: 700;
        }

        .pi-term-row {
          display: flex;
          gap: 5px;
          margin-bottom: 4px;
          align-items: center;
        }

        .pi-term-row input {
          flex: 1;
          border: 1px solid #d3d8de;
          border-radius: 3px;
          padding: 4px;
          height: 25px;
          font-size: 10px;
        }

        .pi-small-btn {
          border: 1px solid #c7ccd2;
          background: #fff;
          border-radius: 3px;
          padding: 4px 7px;
          cursor: pointer;
          font-size: 10px;
        }

        .pi-readonly-section {
          position: relative;
        }

        .pi-readonly-section::after {
          content: "From Quotation";
          position: absolute;
          top: 6px;
          right: 9px;
          font-size: 9px;
          color: #6b7280;
          font-weight: 600;
        }

        @media (max-width: 1100px) {
          .pi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pi-summary {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .pi-grid,
          .pi-grid-2,
          .pi-grid-3 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* =========================================================
          1. PROFORMA + QUOTATION WORKFLOW
      ========================================================= */}

      <div className="pi-section">
        <div className="pi-section-title">
          Proforma Invoice Details
        </div>

        <div className="pi-section-body">
          <div className="pi-workflow-box">
            <div className="pi-grid">
              <div className="pi-field">
                <label className="pi-label">
                  Proforma Invoice No.
                </label>

                <input
                  className="pi-input"
                  value={form.proformaInvoiceNo}
                  readOnly
                  style={readonlyStyle}
                />
              </div>

              <div className="pi-field">
                <label className="pi-label">
                  Proforma Invoice Date
                </label>

                <input
                  className="pi-input"
                  type="date"
                  value={form.proformaInvoiceDate}
                  onChange={(e) =>
                    updateField(
                      "proformaInvoiceDate",
                      e.target.value
                    )
                  }
                />
              </div>

              <div
                className="pi-field"
                style={{
                  gridColumn: "span 2",
                }}
              >
                <label className="pi-label">
                  Select Export Quotation *
                </label>

                <select
                  className="pi-select"
                  value={selectedQuotationNo}
                  onChange={(e) =>
                    handleQuotationChange(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    -- Select Export Quotation --
                  </option>

                  {quotations.map((quotation) => (
                    <option
                      key={quotation.id}
                      value={quotation.quotationNo}
                    >
                      {quotation.quotationNo} —{" "}
                      {quotation.customerName} —{" "}
                      {quotation.currency}{" "}
                      {Number(
                        quotation.totalQuotationValue || 0
                      ).toFixed(2)}
                    </option>
                  ))}
                </select>

                <div className="pi-workflow-note">
                  Proforma is created from an existing
                  Export Quotation. Quotation details are
                  copied into this Proforma as a snapshot.
                </div>

                {selectedQuotation && (
                  <span className="pi-source-badge">
                    Source:{" "}
                    {selectedQuotation.quotationNo}
                  </span>
                )}

                {quotations.length === 0 && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      color: "#b45309",
                    }}
                  >
                    No Export Quotation found. Create an
                    Export Quotation first.
                  </div>
                )}
              </div>

              <div className="pi-field">
                <label className="pi-label">
                  Quotation No.
                </label>

                <input
                  className="pi-input"
                  value={form.quotationNo}
                  readOnly
                  style={readonlyStyle}
                />
              </div>

              <div className="pi-field">
                <label className="pi-label">
                  Enquiry No.
                </label>

                <input
                  className="pi-input"
                  value={form.enquiryNo}
                  readOnly
                  style={readonlyStyle}
                />
              </div>

              <div className="pi-field">
                <label className="pi-label">
                  Export Order No.
                </label>

                <input
                  className="pi-input"
                  value={form.exportOrderNo}
                  onChange={(e) =>
                    updateField(
                      "exportOrderNo",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="pi-field">
                <label className="pi-label">
                  Valid Until
                </label>

                <input
                  className="pi-input"
                  type="date"
                  value={form.validityDate}
                  onChange={(e) =>
                    updateField(
                      "validityDate",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="pi-field">
                <label className="pi-label">
                  Status
                </label>

                <select
                  className="pi-select"
                  value={form.status}
                  onChange={(e) =>
                    updateField(
                      "status",
                      e.target
                        .value as ExportProformaInvoiceStatus
                    )
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          2. EXPORTER
      ========================================================= */}

      <div className="pi-section">
        <div className="pi-section-title">
          Exporter / Seller
        </div>

        <div className="pi-section-body">
          <div className="pi-grid">
            <div className="pi-field">
              <label className="pi-label">
                Exporter Name
              </label>

              <input
                className="pi-input"
                value={form.exporterName}
                onChange={(e) =>
                  updateField(
                    "exporterName",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                IEC
              </label>

              <input
                className="pi-input"
                value={form.exporterIEC}
                onChange={(e) =>
                  updateField(
                    "exporterIEC",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                GSTIN
              </label>

              <input
                className="pi-input"
                value={form.exporterGSTIN}
                onChange={(e) =>
                  updateField(
                    "exporterGSTIN",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                PAN
              </label>

              <input
                className="pi-input"
                value={form.exporterPAN}
                onChange={(e) =>
                  updateField(
                    "exporterPAN",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field pi-field-full">
              <label className="pi-label">
                Address
              </label>

              <textarea
                className="pi-textarea"
                value={form.exporterAddress}
                onChange={(e) =>
                  updateField(
                    "exporterAddress",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                City
              </label>

              <input
                className="pi-input"
                value={form.exporterCity}
                onChange={(e) =>
                  updateField(
                    "exporterCity",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                State
              </label>

              <input
                className="pi-input"
                value={form.exporterState}
                onChange={(e) =>
                  updateField(
                    "exporterState",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Mobile
              </label>

              <input
                className="pi-input"
                value={form.exporterMobile}
                onChange={(e) =>
                  updateField(
                    "exporterMobile",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Email
              </label>

              <input
                className="pi-input"
                value={form.exporterEmail}
                onChange={(e) =>
                  updateField(
                    "exporterEmail",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Website
              </label>

              <input
                className="pi-input"
                value={form.exporterWebsite}
                onChange={(e) =>
                  updateField(
                    "exporterWebsite",
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          3. BUYER
      ========================================================= */}

      <div className="pi-section pi-readonly-section">
        <div className="pi-section-title">
          Buyer / Consignee
        </div>

        <div className="pi-section-body">
          <div className="pi-grid">
            <div className="pi-field">
              <label className="pi-label">
                Customer Code
              </label>

              <input
                className="pi-input"
                value={form.customerCode}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Customer / Buyer Name
              </label>

              <input
                className="pi-input"
                value={form.customerName}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Contact Person
              </label>

              <input
                className="pi-input"
                value={form.contactPerson}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Country
              </label>

              <input
                className="pi-input"
                value={form.buyerCountry}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field pi-field-full">
              <label className="pi-label">
                Buyer Address
              </label>

              <textarea
                className="pi-textarea"
                value={form.buyerAddress}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                City
              </label>

              <input
                className="pi-input"
                value={form.buyerCity}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                State / Province
              </label>

              <input
                className="pi-input"
                value={form.buyerStateProvince}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Postal Code
              </label>

              <input
                className="pi-input"
                value={form.buyerPostalCode}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Tax Registration No.
              </label>

              <input
                className="pi-input"
                value={form.buyerTaxRegistrationNo}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Email
              </label>

              <input
                className="pi-input"
                value={form.buyerEmail}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Mobile
              </label>

              <input
                className="pi-input"
                value={form.buyerMobile}
                readOnly
                style={readonlyStyle}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "18px",
              marginBottom: "8px",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            Additional Parties
          </div>

          <div className="pi-grid-2">
            <div className="pi-field">
              <label className="pi-label">
                Consignee Name
              </label>

              <input
                className="pi-input"
                value={form.consigneeName}
                onChange={(e) =>
                  updateField(
                    "consigneeName",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Consignee Country
              </label>

              <input
                className="pi-input"
                value={form.consigneeCountry}
                onChange={(e) =>
                  updateField(
                    "consigneeCountry",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Importer Name
              </label>

              <input
                className="pi-input"
                value={form.importerName}
                onChange={(e) =>
                  updateField(
                    "importerName",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Importer Country
              </label>

              <input
                className="pi-input"
                value={form.importerCountry}
                onChange={(e) =>
                  updateField(
                    "importerCountry",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Consignee Address
              </label>

              <textarea
                className="pi-textarea"
                value={form.consigneeAddress}
                onChange={(e) =>
                  updateField(
                    "consigneeAddress",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Importer Address
              </label>

              <textarea
                className="pi-textarea"
                value={form.importerAddress}
                onChange={(e) =>
                  updateField(
                    "importerAddress",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field pi-field-full">
              <label className="pi-label">
                Notify Party
              </label>

              <textarea
                className="pi-textarea"
                value={form.notifyParty}
                onChange={(e) =>
                  updateField(
                    "notifyParty",
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          4. BUYER REFERENCES
      ========================================================= */}

      <div className="pi-section">
        <div className="pi-section-title">
          Buyer Reference & Payment Reference
        </div>

        <div className="pi-section-body">
          <div className="pi-grid">
            <div className="pi-field">
              <label className="pi-label">
                Buyer Reference No.
              </label>

              <input
                className="pi-input"
                value={form.buyerReferenceNo}
                onChange={(e) =>
                  updateField(
                    "buyerReferenceNo",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Buyer PO No.
              </label>

              <input
                className="pi-input"
                value={form.buyerPONo}
                onChange={(e) =>
                  updateField(
                    "buyerPONo",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Buyer PO Date
              </label>

              <input
                className="pi-input"
                type="date"
                value={form.buyerPODate}
                onChange={(e) =>
                  updateField(
                    "buyerPODate",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                LC No.
              </label>

              <input
                className="pi-input"
                value={form.lcNo}
                onChange={(e) =>
                  updateField(
                    "lcNo",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                LC Date
              </label>

              <input
                className="pi-input"
                type="date"
                value={form.lcDate}
                onChange={(e) =>
                  updateField(
                    "lcDate",
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          5. COMMERCIAL TERMS
      ========================================================= */}

      <div className="pi-section pi-readonly-section">
        <div className="pi-section-title">
          Commercial / Trade Terms
        </div>

        <div className="pi-section-body">
          <div className="pi-grid">
            <div className="pi-field">
              <label className="pi-label">
                Currency
              </label>

              <select
                className="pi-select"
                value={form.currency}
                onChange={(e) =>
                  updateField(
                    "currency",
                    e.target.value
                  )
                }
              >
                {CURRENCY_OPTIONS.map(
                  (currency) => (
                    <option
                      key={currency}
                      value={currency}
                    >
                      {currency}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Incoterm
              </label>

              <select
                className="pi-select"
                value={form.incoterm}
                onChange={(e) =>
                  updateField(
                    "incoterm",
                    e.target.value
                  )
                }
              >
                {INCOTERM_OPTIONS.map(
                  (incoterm) => (
                    <option
                      key={incoterm}
                      value={incoterm}
                    >
                      {incoterm}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Incoterm Place
              </label>

              <input
                className="pi-input"
                value={form.incotermPlace}
                onChange={(e) =>
                  updateField(
                    "incotermPlace",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Payment Terms
              </label>

              <input
                className="pi-input"
                value={form.paymentTerms}
                onChange={(e) =>
                  updateField(
                    "paymentTerms",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Payment Method
              </label>

              <select
                className="pi-select"
                value={form.paymentMethod}
                onChange={(e) =>
                  updateField(
                    "paymentMethod",
                    e.target.value
                  )
                }
              >
                {PAYMENT_METHOD_OPTIONS.map(
                  (method) => (
                    <option
                      key={method}
                      value={method}
                    >
                      {method}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Shipment Mode
              </label>

              <select
                className="pi-select"
                value={form.shipmentMode}
                onChange={(e) =>
                  updateField(
                    "shipmentMode",
                    e.target.value
                  )
                }
              >
                {SHIPMENT_MODE_OPTIONS.map(
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

            <div className="pi-field">
              <label className="pi-label">
                Estimated Shipment Date
              </label>

              <input
                className="pi-input"
                type="date"
                value={form.estimatedShipmentDate}
                onChange={(e) =>
                  updateField(
                    "estimatedShipmentDate",
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          6. SHIPPING
      ========================================================= */}

      <div className="pi-section">
        <div className="pi-section-title">
          Shipping Information
        </div>

        <div className="pi-section-body">
          <div className="pi-grid">
            <div className="pi-field">
              <label className="pi-label">
                Port of Loading
              </label>

              <input
                className="pi-input"
                value={form.portOfLoading}
                onChange={(e) =>
                  updateField(
                    "portOfLoading",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Port of Discharge
              </label>

              <input
                className="pi-input"
                value={form.portOfDischarge}
                onChange={(e) =>
                  updateField(
                    "portOfDischarge",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Final Destination
              </label>

              <input
                className="pi-input"
                value={form.finalDestination}
                onChange={(e) =>
                  updateField(
                    "finalDestination",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Country of Destination
              </label>

              <input
                className="pi-input"
                value={form.countryOfDestination}
                onChange={(e) =>
                  updateField(
                    "countryOfDestination",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Country of Origin
              </label>

              <input
                className="pi-input"
                value={form.countryOfOrigin}
                onChange={(e) =>
                  updateField(
                    "countryOfOrigin",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Vessel / Flight No.
              </label>

              <input
                className="pi-input"
                value={form.vesselFlightNo}
                onChange={(e) =>
                  updateField(
                    "vesselFlightNo",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Voyage No.
              </label>

              <input
                className="pi-input"
                value={form.voyageNo}
                onChange={(e) =>
                  updateField(
                    "voyageNo",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Container No.
              </label>

              <input
                className="pi-input"
                value={form.containerNo}
                onChange={(e) =>
                  updateField(
                    "containerNo",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Seal No.
              </label>

              <input
                className="pi-input"
                value={form.sealNo}
                onChange={(e) =>
                  updateField(
                    "sealNo",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                BL / AWB No.
              </label>

              <input
                className="pi-input"
                value={form.blAwbNo}
                onChange={(e) =>
                  updateField(
                    "blAwbNo",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                BL / AWB Date
              </label>

              <input
                className="pi-input"
                type="date"
                value={form.blAwbDate}
                onChange={(e) =>
                  updateField(
                    "blAwbDate",
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          7. PRODUCTS FROM QUOTATION
      ========================================================= */}

      <div className="pi-section pi-readonly-section">
        <div className="pi-section-title">
          Quotation Products → Proforma Products
        </div>

        <div className="pi-section-body">
          <div className="pi-workflow-note">
            Product Code, Product Name, Quantity, Unit,
            Unit Price and Customer Requirement are copied
            from the selected quotation. Packing, weight,
            HS Code and other shipment-specific information
            can be completed for the Proforma.
          </div>

          <div
            className="pi-table-wrap"
            style={{ marginTop: "12px" }}
          >
            <table className="pi-table">
              <thead>
                <tr>
                  <th>Sr.</th>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th>HS Code</th>
                  <th>Origin</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Amount</th>
                  <th>Packing</th>
                  <th>Packages</th>
                  <th>Net Wt.</th>
                  <th>Gross Wt.</th>
                  <th>CBM</th>
                  <th>Requirement</th>
                  <th>Grade</th>
                  <th>Brand</th>
                  <th>Specification</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {form.items.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>

                    <td className="pi-source-cell">
                      <input
                        value={item.productCode}
                        readOnly
                        style={readonlyStyle}
                      />
                    </td>

                    <td className="pi-source-cell">
                      <input
                        value={item.productName}
                        readOnly
                        style={readonlyStyle}
                      />
                    </td>

                    <td>
                      <input
                        value={item.hsCode}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "hsCode",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        value={item.countryOfOrigin}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "countryOfOrigin",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td className="pi-source-cell">
                      <input
                        type="number"
                        value={item.qty}
                        readOnly
                        style={readonlyStyle}
                      />
                    </td>

                    <td className="pi-source-cell">
                      <input
                        value={item.unit}
                        readOnly
                        style={readonlyStyle}
                      />
                    </td>

                    <td className="pi-source-cell">
                      <input
                        type="number"
                        value={item.unitPrice}
                        readOnly
                        style={readonlyStyle}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "discount",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        value={item.amount.toFixed(2)}
                        readOnly
                        style={readonlyStyle}
                      />
                    </td>

                    <td>
                      <input
                        value={item.packingType}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "packingType",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.packageQty}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "packageQty",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.netWeight}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "netWeight",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.grossWeight}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "grossWeight",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.cbm}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "cbm",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td className="pi-source-cell">
                      <input
                        value={
                          item.customerRequirement
                        }
                        readOnly
                        style={readonlyStyle}
                      />
                    </td>

                    <td>
                      <input
                        value={item.grade}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "grade",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        value={item.brand}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "brand",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        value={item.specification}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "specification",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <button
                        type="button"
                        className="pi-small-btn pi-btn-danger"
                        onClick={() =>
                          removeItem(index)
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "10px" }}>
            <button
              type="button"
              className="pi-btn"
              onClick={addItem}
            >
              + Add Product
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          8. PACKAGE SUMMARY
      ========================================================= */}

      <div className="pi-section">
        <div className="pi-section-title">
          Package Summary
        </div>

        <div className="pi-section-body">
          <div className="pi-grid">
            <div className="pi-field">
              <label className="pi-label">
                Total Packages
              </label>

              <input
                className="pi-input"
                value={form.totalPackages}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Package Type
              </label>

              <input
                className="pi-input"
                value={form.packageType}
                onChange={(e) =>
                  updateField(
                    "packageType",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Total Net Weight
              </label>

              <input
                className="pi-input"
                value={form.totalNetWeight.toFixed(3)}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Total Gross Weight
              </label>

              <input
                className="pi-input"
                value={form.totalGrossWeight.toFixed(3)}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Total CBM
              </label>

              <input
                className="pi-input"
                value={form.totalCBM.toFixed(3)}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field pi-field-full">
              <label className="pi-label">
                Marks & Numbers
              </label>

              <textarea
                className="pi-textarea"
                value={form.marksNumbers}
                onChange={(e) =>
                  updateField(
                    "marksNumbers",
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          9. COMMERCIAL VALUE
      ========================================================= */}

      <div className="pi-section">
        <div className="pi-section-title">
          Proforma Commercial Value
        </div>

        <div className="pi-section-body">
          <div className="pi-summary">
            <div>
              <div className="pi-grid-2">
                <div className="pi-field">
                  <label className="pi-label">
                    Freight
                  </label>

                  <input
                    className="pi-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.freight}
                    onChange={(e) =>
                      updateField(
                        "freight",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>

                <div className="pi-field">
                  <label className="pi-label">
                    Insurance
                  </label>

                  <input
                    className="pi-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.insurance}
                    onChange={(e) =>
                      updateField(
                        "insurance",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>

                <div className="pi-field">
                  <label className="pi-label">
                    Other Charges
                  </label>

                  <input
                    className="pi-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.otherCharges}
                    onChange={(e) =>
                      updateField(
                        "otherCharges",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>

                <div className="pi-field">
                  <label className="pi-label">
                    Exchange Rate
                  </label>

                  <input
                    className="pi-input"
                    type="number"
                    min="0"
                    step="0.0001"
                    value={form.exchangeRate}
                    onChange={(e) =>
                      updateField(
                        "exchangeRate",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div className="pi-summary-box">
              <div className="pi-summary-row">
                <span>Goods Value</span>

                <strong>
                  {form.currency}{" "}
                  {totals.totalGoodsValue.toFixed(2)}
                </strong>
              </div>

              <div className="pi-summary-row">
                <span>Discount</span>

                <strong>
                  {form.currency}{" "}
                  {totals.discount.toFixed(2)}
                </strong>
              </div>

              <div className="pi-summary-row">
                <span>Freight</span>

                <strong>
                  {form.currency}{" "}
                  {Number(form.freight || 0).toFixed(2)}
                </strong>
              </div>

              <div className="pi-summary-row">
                <span>Insurance</span>

                <strong>
                  {form.currency}{" "}
                  {Number(form.insurance || 0).toFixed(2)}
                </strong>
              </div>

              <div className="pi-summary-row">
                <span>Other Charges</span>

                <strong>
                  {form.currency}{" "}
                  {Number(
                    form.otherCharges || 0
                  ).toFixed(2)}
                </strong>
              </div>

              <div className="pi-summary-row pi-summary-total">
                <span>
                  Total Proforma Value
                </span>

                <strong>
                  {form.currency}{" "}
                  {totals.totalProformaValue.toFixed(2)}
                </strong>
              </div>

              <div className="pi-summary-row">
                <span>INR Equivalent</span>

                <strong>
                  INR{" "}
                  {totals.inrEquivalent.toFixed(2)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          10. BANK / PAYMENT
      ========================================================= */}

      <div className="pi-section">
        <div className="pi-section-title">
          Bank / Payment Information
        </div>

        <div className="pi-section-body">
          <div className="pi-grid">
            <div className="pi-field">
              <label className="pi-label">
                Bank Name
              </label>

              <input
                className="pi-input"
                value={form.bankName}
                onChange={(e) =>
                  updateField(
                    "bankName",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Branch
              </label>

              <input
                className="pi-input"
                value={form.bankBranch}
                onChange={(e) =>
                  updateField(
                    "bankBranch",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Account Name
              </label>

              <input
                className="pi-input"
                value={form.bankAccountName}
                onChange={(e) =>
                  updateField(
                    "bankAccountName",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Account No.
              </label>

              <input
                className="pi-input"
                value={form.bankAccountNo}
                onChange={(e) =>
                  updateField(
                    "bankAccountNo",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                SWIFT / BIC
              </label>

              <input
                className="pi-input"
                value={form.swiftBic}
                onChange={(e) =>
                  updateField(
                    "swiftBic",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                AD Code
              </label>

              <input
                className="pi-input"
                value={form.adCode}
                onChange={(e) =>
                  updateField(
                    "adCode",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Advance %
              </label>

              <input
                className="pi-input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.advancePercentage}
                onChange={(e) =>
                  updateField(
                    "advancePercentage",
                    Number(e.target.value)
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Advance Amount
              </label>

              <input
                className="pi-input"
                value={totals.advanceAmount.toFixed(2)}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Balance Amount
              </label>

              <input
                className="pi-input"
                value={totals.balanceAmount.toFixed(2)}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="pi-field pi-field-full">
              <label className="pi-label">
                Bank Address
              </label>

              <textarea
                className="pi-textarea"
                value={form.bankAddress}
                onChange={(e) =>
                  updateField(
                    "bankAddress",
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          11. DECLARATION
      ========================================================= */}

      <div className="pi-section">
        <div className="pi-section-title">
          Declaration & Authorization
        </div>

        <div className="pi-section-body">
          <div className="pi-grid-2">
            <div className="pi-field">
              <label className="pi-label">
                Declaration
              </label>

              <textarea
                className="pi-textarea"
                value={form.declaration}
                onChange={(e) =>
                  updateField(
                    "declaration",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="pi-field">
              <label className="pi-label">
                Authorized Signatory
              </label>

              <input
                className="pi-input"
                value={form.authorizedSignatory}
                onChange={(e) =>
                  updateField(
                    "authorizedSignatory",
                    e.target.value
                  )
                }
              />

              <label
                className="pi-label"
                style={{ marginTop: "6px" }}
              >
                Designation
              </label>

              <input
                className="pi-input"
                value={form.signatoryDesignation}
                onChange={(e) =>
                  updateField(
                    "signatoryDesignation",
                    e.target.value
                  )
                }
              />

              <label
                className="pi-label"
                style={{ marginTop: "6px" }}
              >
                Place
              </label>

              <input
                className="pi-input"
                value={form.place}
                onChange={(e) =>
                  updateField(
                    "place",
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          12. REMARKS + TERMS
      ========================================================= */}

      <div className="pi-section">
        <div className="pi-section-title">
          Remarks / Terms & Conditions
        </div>

        <div className="pi-section-body">
          <div className="pi-field">
            <label className="pi-label">
              Remarks
            </label>

            <textarea
              className="pi-textarea"
              value={form.remarks}
              onChange={(e) =>
                updateField(
                  "remarks",
                  e.target.value
                )
              }
            />
          </div>

          <div
            style={{
              marginTop: "16px",
              marginBottom: "8px",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            Terms & Conditions
          </div>

          {form.termsAndConditions.map(
            (term, index) => (
              <div
                className="pi-term-row"
                key={index}
              >
                <span
                  style={{
                    width: "24px",
                    fontSize: "12px",
                    color: "#6b7280",
                  }}
                >
                  {index + 1}.
                </span>

                <input
                  value={term}
                  onChange={(e) =>
                    updateTerm(
                      index,
                      e.target.value
                    )
                  }
                />

                <button
                  type="button"
                  className="pi-small-btn"
                  onClick={() =>
                    removeTerm(index)
                  }
                >
                  Remove
                </button>
              </div>
            )
          )}

          <button
            type="button"
            className="pi-btn"
            onClick={addTerm}
          >
            + Add Term
          </button>
        </div>
      </div>

      {/* =========================================================
          ACTIONS
      ========================================================= */}

      <div className="pi-actions">
        {onCancel && (
          <button
            type="button"
            className="pi-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          className="pi-btn"
          onClick={handleReset}
        >
          Reset
        </button>

        <button
          type="submit"
          className="pi-btn pi-btn-primary"
        >
          {initialData
            ? "Update Proforma Invoice"
            : "Save Proforma Invoice"}
        </button>
      </div>
    </form>
  );
}