"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ExportOrder,
  ExportOrderItem,
  ExportOrderStatus,
} from "./ExportOrderTypes";
import {
  ExportProformaInvoice,
  ExportProformaInvoiceItem,
} from "../proforma/ExportProformaInvoiceTypes";
import { loadExportProformaInvoices } from "../proforma/ExportProformaInvoiceStorage";

type ExportOrderFormProps = {
  orderNo: string;
  initialData?: ExportOrder | null;
  onSave: (order: ExportOrder) => void;
  onCancel?: () => void;
};

const STATUS_OPTIONS: ExportOrderStatus[] = [
  "Draft",
  "Confirmed",
  "Processing",
  "Partially Shipped",
  "Shipped",
  "Completed",
  "Cancelled",
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
  "This Export Order is based on the accepted Proforma Invoice.",
  "Prices and commercial terms are as stated in the Proforma Invoice.",
  "Delivery schedule is subject to shipment planning and availability.",
  "Payment shall be made according to the agreed payment terms.",
  "Packing shall be as mutually agreed between exporter and buyer.",
  "Final shipment details shall be recorded against the actual shipment.",
  "Import duties, destination taxes and local charges shall be borne by the buyer unless otherwise agreed.",
  "Any material change in quantity, specification or shipment terms may require order revision.",
  "Partial shipment or transshipment shall be subject to mutual agreement.",
  "Orders are subject to the terms and conditions of UK EXIM ENTERPRISES.",
  "Force majeure conditions may affect delivery schedules.",
];

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateForInput(value: string): string {
  if (!value) return "";

  const directMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (directMatch) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function createEmptyItem(): ExportOrderItem {
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

function proformaItemToOrderItem(
  item: ExportProformaInvoiceItem
): ExportOrderItem {
  const qty = Number(item.qty || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const discount = Number(item.discount || 0);

  const gross = qty * unitPrice;

  const amount =
    Number(item.amount || 0) > 0
      ? Number(item.amount)
      : Math.max(0, gross - discount);

  return {
    productCode: item.productCode || "",
    productName: item.productName || "",
    hsCode: item.hsCode || "",
    countryOfOrigin:
      item.countryOfOrigin || "India",
    qty,
    unit: item.unit || "KG",
    unitPrice,
    discount,
    amount,
    customerRequirement:
      item.customerRequirement || "",
    packingType: item.packingType || "",
    packageQty: Number(item.packageQty || 0),
    netWeight: Number(item.netWeight || 0),
    grossWeight: Number(item.grossWeight || 0),
    cbm: Number(item.cbm || 0),
    marksNumbers: item.marksNumbers || "",
    grade: item.grade || "",
    brand: item.brand || "",
    specification: item.specification || "",
  };
}

function createEmptyOrder(
  orderNo: string
): ExportOrder {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),

    exportOrderNo: orderNo,
    exportOrderDate: getToday(),
    proformaInvoiceNo: "",
    quotationNo: "",
    enquiryNo: "",
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
    totalOrderValue: 0,

    exchangeRate: 1,
    inrEquivalent: 0,

    advancePercentage: 0,
    advanceAmount: 0,
    balanceAmount: 0,

    remarks: "",
    termsAndConditions: [...DEFAULT_TERMS],

    createdAt: now,
    updatedAt: now,
  };
}

function normaliseExistingOrder(
  order: ExportOrder
): ExportOrder {
  return {
    ...order,

    exportOrderDate: formatDateForInput(
      order.exportOrderDate
    ),

    buyerPODate: formatDateForInput(
      order.buyerPODate
    ),

    lcDate: formatDateForInput(
      order.lcDate
    ),

    estimatedShipmentDate:
      formatDateForInput(
        order.estimatedShipmentDate
      ),

    items:
      Array.isArray(order.items) &&
      order.items.length > 0
        ? order.items
        : [createEmptyItem()],

    termsAndConditions:
      Array.isArray(
        order.termsAndConditions
      ) &&
      order.termsAndConditions.length > 0
        ? order.termsAndConditions
        : [...DEFAULT_TERMS],
  };
}

export default function ExportOrderForm({
  orderNo,
  initialData,
  onSave,
  onCancel,
}: ExportOrderFormProps) {
  const [form, setForm] =
    useState<ExportOrder>(() =>
      initialData
        ? normaliseExistingOrder(initialData)
        : createEmptyOrder(orderNo)
    );

  const [proformas, setProformas] =
    useState<ExportProformaInvoice[]>([]);

  const [
    selectedProformaNo,
    setSelectedProformaNo,
  ] = useState<string>(
    initialData?.proformaInvoiceNo || ""
  );

  useEffect(() => {
    setProformas(
      loadExportProformaInvoices()
    );
  }, []);

  useEffect(() => {
    if (initialData) {
      const normalised =
        normaliseExistingOrder(initialData);

      setForm(normalised);

      setSelectedProformaNo(
        normalised.proformaInvoiceNo || ""
      );
    } else {
      setForm(createEmptyOrder(orderNo));
      setSelectedProformaNo("");
    }
  }, [initialData, orderNo]);

  const selectedProforma = useMemo(() => {
    if (!selectedProformaNo) {
      return undefined;
    }

    return proformas.find(
      (proforma) =>
        proforma.proformaInvoiceNo ===
        selectedProformaNo
    );
  }, [
    proformas,
    selectedProformaNo,
  ]);

  const calculatedItems = useMemo(() => {
    return form.items.map((item) => {
      const qty = Number(item.qty || 0);

      const unitPrice = Number(
        item.unitPrice || 0
      );

      const discount = Math.max(
        0,
        Number(item.discount || 0)
      );

      const gross = qty * unitPrice;

      return {
        ...item,
        amount: Math.max(
          0,
          gross - discount
        ),
      };
    });
  }, [form.items]);

  const totals = useMemo(() => {
    const totalGoodsValue =
      calculatedItems.reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      );

    const totalPackages =
      calculatedItems.reduce(
        (sum, item) =>
          sum +
          Number(
            item.packageQty || 0
          ),
        0
      );

    const totalNetWeight =
      calculatedItems.reduce(
        (sum, item) =>
          sum +
          Number(
            item.netWeight || 0
          ),
        0
      );

    const totalGrossWeight =
      calculatedItems.reduce(
        (sum, item) =>
          sum +
          Number(
            item.grossWeight || 0
          ),
        0
      );

    const totalCBM =
      calculatedItems.reduce(
        (sum, item) =>
          sum + Number(item.cbm || 0),
        0
      );

    const discount =
      calculatedItems.reduce(
        (sum, item) =>
          sum +
          Number(
            item.discount || 0
          ),
        0
      );

    const totalOrderValue =
      totalGoodsValue +
      Number(form.freight || 0) +
      Number(form.insurance || 0) +
      Number(form.otherCharges || 0);

    const exchangeRate = Number(
      form.exchangeRate || 0
    );

    const inrEquivalent =
      totalOrderValue *
      exchangeRate;

    const advancePercentage =
      Number(
        form.advancePercentage || 0
      );

    const advanceAmount =
      (totalOrderValue *
        advancePercentage) /
      100;

    const balanceAmount =
      totalOrderValue -
      advanceAmount;

    return {
      totalGoodsValue,
      totalPackages,
      totalNetWeight,
      totalGrossWeight,
      totalCBM,
      discount,
      totalOrderValue,
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
        JSON.stringify(
          previous.items
        ) ===
        JSON.stringify(
          calculatedItems
        );

      const sameTotals =
        previous.totalGoodsValue ===
          totals.totalGoodsValue &&
        previous.totalPackages ===
          totals.totalPackages &&
        previous.totalNetWeight ===
          totals.totalNetWeight &&
        previous.totalGrossWeight ===
          totals.totalGrossWeight &&
        previous.totalCBM ===
          totals.totalCBM &&
        previous.discount ===
          totals.discount &&
        previous.totalOrderValue ===
          totals.totalOrderValue &&
        previous.inrEquivalent ===
          totals.inrEquivalent &&
        previous.advanceAmount ===
          totals.advanceAmount &&
        previous.balanceAmount ===
          totals.balanceAmount;

      if (
        sameItems &&
        sameTotals
      ) {
        return previous;
      }

      return {
        ...previous,

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

        totalOrderValue:
          totals.totalOrderValue,

        inrEquivalent:
          totals.inrEquivalent,

        advanceAmount:
          totals.advanceAmount,

        balanceAmount:
          totals.balanceAmount,
      };
    });
  }, [
    calculatedItems,
    totals,
  ]);

  const updateField = <
    K extends keyof ExportOrder
  >(
    field: K,
    value: ExportOrder[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateItem = (
    index: number,
    field: keyof ExportOrderItem,
    value: string | number
  ) => {
    setForm((previous) => {
      const items = [
        ...previous.items,
      ];

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

  const handleProformaChange = (
    proformaNo: string
  ) => {
    setSelectedProformaNo(
      proformaNo
    );

    if (!proformaNo) {
      return;
    }

    const proforma =
      proformas.find(
        (item) =>
          item.proformaInvoiceNo ===
          proformaNo
      );

    if (!proforma) {
      return;
    }

    const proformaItems =
      Array.isArray(
        proforma.items
      ) &&
      proforma.items.length > 0
        ? proforma.items.map(
            proformaItemToOrderItem
          )
        : [createEmptyItem()];

    setForm((previous) => ({
      ...previous,

      proformaInvoiceNo:
        proforma.proformaInvoiceNo,

      quotationNo:
        proforma.quotationNo,

      enquiryNo:
        proforma.enquiryNo,

      customerCode:
        proforma.customerCode,

      customerName:
        proforma.customerName,

      contactPerson:
        proforma.contactPerson,

      buyerAddress:
        proforma.buyerAddress,

      buyerCity:
        proforma.buyerCity,

      buyerStateProvince:
        proforma.buyerStateProvince,

      buyerPostalCode:
        proforma.buyerPostalCode,

      buyerCountry:
        proforma.buyerCountry,

      buyerTaxRegistrationNo:
        proforma.buyerTaxRegistrationNo,

      buyerEmail:
        proforma.buyerEmail,

      buyerMobile:
        proforma.buyerMobile,

      consigneeName:
        proforma.consigneeName,

      consigneeAddress:
        proforma.consigneeAddress,

      consigneeCountry:
        proforma.consigneeCountry,

      importerName:
        proforma.importerName,

      importerAddress:
        proforma.importerAddress,

      importerCountry:
        proforma.importerCountry,

      notifyParty:
        proforma.notifyParty,

      buyerReferenceNo:
        proforma.buyerReferenceNo,

      buyerPONo:
        proforma.buyerPONo,

      buyerPODate:
        formatDateForInput(
          proforma.buyerPODate
        ),

      lcNo:
        proforma.lcNo,

      lcDate:
        formatDateForInput(
          proforma.lcDate
        ),

      currency:
        proforma.currency ||
        "USD",

      incoterm:
        proforma.incoterm ||
        "FOB",

      incotermPlace:
        proforma.incotermPlace,

      paymentTerms:
        proforma.paymentTerms,

      paymentMethod:
        proforma.paymentMethod ||
        "TT",

      shipmentMode:
        proforma.shipmentMode ||
        "Sea",

      estimatedShipmentDate:
        formatDateForInput(
          proforma.estimatedShipmentDate
        ),

      portOfLoading:
        proforma.portOfLoading,

      portOfDischarge:
        proforma.portOfDischarge,

      finalDestination:
        proforma.finalDestination,

      countryOfDestination:
        proforma.countryOfDestination,

      countryOfOrigin:
        proforma.countryOfOrigin ||
        "India",

      items: proformaItems,

      packageType:
        proforma.packageType,

      marksNumbers:
        proforma.marksNumbers,

      freight: Number(
        proforma.freight || 0
      ),

      insurance: Number(
        proforma.insurance || 0
      ),

      otherCharges: Number(
        proforma.otherCharges || 0
      ),

      exchangeRate:
        Number(
          proforma.exchangeRate || 1
        ),

      advancePercentage:
        Number(
          proforma.advancePercentage ||
            0
        ),

      remarks:
        proforma.remarks || "",

      termsAndConditions:
        Array.isArray(
          proforma.termsAndConditions
        ) &&
        proforma
          .termsAndConditions
          .length > 0
          ? [
              ...proforma.termsAndConditions,
            ]
          : [...DEFAULT_TERMS],
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

  const removeItem = (
    index: number
  ) => {
    setForm((previous) => {
      if (
        previous.items.length <= 1
      ) {
        return previous;
      }

      return {
        ...previous,

        items:
          previous.items.filter(
            (_, itemIndex) =>
              itemIndex !== index
          ),
      };
    });
  };

  const updateTerm = (
    index: number,
    value: string
  ) => {
    setForm((previous) => {
      const terms = [
        ...previous.termsAndConditions,
      ];

      terms[index] = value;

      return {
        ...previous,
        termsAndConditions:
          terms,
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

  const removeTerm = (
    index: number
  ) => {
    setForm((previous) => ({
      ...previous,

      termsAndConditions:
        previous.termsAndConditions.filter(
          (_, termIndex) =>
            termIndex !== index
        ),
    }));
  };

  const handleReset = () => {
    if (initialData) {
      const normalised =
        normaliseExistingOrder(
          initialData
        );

      setForm(normalised);

      setSelectedProformaNo(
        normalised.proformaInvoiceNo ||
          ""
      );

      return;
    }

    setForm(
      createEmptyOrder(orderNo)
    );

    setSelectedProformaNo("");
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !form.proformaInvoiceNo.trim()
    ) {
      alert(
        "Please select a Proforma Invoice before creating the Export Order."
      );

      return;
    }

    if (!form.exportOrderDate) {
      alert(
        "Please enter Export Order Date."
      );

      return;
    }

    if (!form.customerName.trim()) {
      alert(
        "Customer details could not be loaded from the selected Proforma Invoice."
      );

      return;
    }

    const hasValidItem =
      form.items.some(
        (item) =>
          item.productName.trim() &&
          Number(item.qty) > 0
      );

    if (!hasValidItem) {
      alert(
        "The selected Proforma Invoice does not contain a valid product line."
      );

      return;
    }

    const now =
      new Date().toISOString();

    const finalOrder: ExportOrder = {
      ...form,

      id:
        form.id ||
        crypto.randomUUID(),

      exportOrderNo:
        form.exportOrderNo ||
        orderNo,

      proformaInvoiceNo:
        form.proformaInvoiceNo,

      quotationNo:
        form.quotationNo,

      enquiryNo:
        form.enquiryNo,

      items:
        calculatedItems,

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

      totalOrderValue:
        totals.totalOrderValue,

      inrEquivalent:
        totals.inrEquivalent,

      advanceAmount:
        totals.advanceAmount,

      balanceAmount:
        totals.balanceAmount,

      createdAt:
        form.createdAt || now,

      updatedAt: now,
    };

    onSave(finalOrder);
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
        padding: "10px",
        boxSizing: "border-box",
        background: "#f7f8fa",
        color: "#1f2937",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <style>{`
        .eo-section {
          background: #ffffff;
          border: 1px solid #dfe3e8;
          border-radius: 6px;
          margin-bottom: 8px;
          overflow: hidden;
        }

        .eo-title {
          padding: 6px 9px;
          background: #f1f3f5;
          border-bottom: 1px solid #dfe3e8;
          font-size: 13px;
          font-weight: 700;
        }

        .eo-body {
          padding: 8px 9px;
        }

        .eo-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 7px;
        }

        .eo-grid-3 {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 7px;
        }

        .eo-grid-2 {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 7px;
        }

        .eo-field {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .eo-full {
          grid-column: 1 / -1;
        }

        .eo-label {
          font-size: 11px;
          font-weight: 600;
          color: #4b5563;
        }

        .eo-input,
        .eo-select,
        .eo-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cfd5dc;
          border-radius: 4px;
          padding: 5px 7px;
          font-size: 12px;
          line-height: 1.25;
          background: #ffffff;
          color: #111827;
          outline: none;
        }

        .eo-input:focus,
        .eo-select:focus,
        .eo-textarea:focus {
          border-color: #6b7280;
        }

        .eo-textarea {
          min-height: 42px;
          resize: vertical;
        }

        .eo-note {
          margin-top: 4px;
          font-size: 10px;
          color: #6b7280;
          line-height: 1.35;
        }

        .eo-badge {
          display: inline-block;
          margin-top: 4px;
          padding: 2px 6px;
          border-radius: 10px;
          background: #eef2f7;
          color: #374151;
          font-size: 10px;
          font-weight: 600;
        }

        .eo-table-wrap {
          overflow-x: auto;
          border: 1px solid #dfe3e8;
          border-radius: 5px;
        }

        .eo-table {
          width: 100%;
          min-width: 1450px;
          border-collapse: collapse;
          font-size: 11px;
        }

        .eo-table th {
          background: #f1f3f5;
          border-bottom: 1px solid #dfe3e8;
          padding: 5px 4px;
          text-align: left;
          white-space: nowrap;
        }

        .eo-table td {
          border-bottom: 1px solid #edf0f2;
          padding: 4px;
          vertical-align: top;
        }

        .eo-table input {
          width: 100%;
          min-width: 62px;
          box-sizing: border-box;
          border: 1px solid #d3d8de;
          border-radius: 3px;
          padding: 4px;
          font-size: 11px;
        }

        .eo-source {
          background: #fafafa;
        }

        .eo-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          margin-top: 10px;
        }

        .eo-btn {
          border: 1px solid #c7ccd2;
          border-radius: 4px;
          padding: 6px 11px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          background: #ffffff;
        }

        .eo-btn-primary {
          background: #1f2937;
          color: #ffffff;
          border-color: #1f2937;
        }

        .eo-btn-danger {
          color: #b91c1c;
        }

        .eo-summary {
          display: grid;
          grid-template-columns: 1fr 330px;
          gap: 10px;
          align-items: start;
        }

        .eo-summary-box {
          border: 1px solid #dfe3e8;
          border-radius: 5px;
          padding: 8px;
          background: #fafafa;
        }

        .eo-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 4px 0;
          border-bottom: 1px solid #e5e7eb;
          font-size: 12px;
        }

        .eo-summary-row:last-child {
          border-bottom: 0;
        }

        .eo-total {
          font-size: 14px;
          font-weight: 700;
        }

        .eo-term {
          display: flex;
          gap: 5px;
          margin-bottom: 5px;
          align-items: center;
        }

        .eo-term input {
          flex: 1;
          border: 1px solid #d3d8de;
          border-radius: 3px;
          padding: 5px;
          font-size: 11px;
        }

        .eo-small-btn {
          border: 1px solid #c7ccd2;
          background: #ffffff;
          border-radius: 3px;
          padding: 4px 7px;
          cursor: pointer;
          font-size: 11px;
        }

        .eo-readonly-section {
          position: relative;
        }

        .eo-readonly-section::after {
          content: "From Proforma";
          position: absolute;
          top: 7px;
          right: 9px;
          font-size: 9px;
          color: #6b7280;
          font-weight: 600;
        }

        @media (max-width: 1100px) {
          .eo-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .eo-summary {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .eo-grid,
          .eo-grid-2,
          .eo-grid-3 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* =====================================================
          1. EXPORT ORDER WORKFLOW
      ===================================================== */}

      <div className="eo-section">
        <div className="eo-title">
          Export Order Details
        </div>

        <div className="eo-body">
          <div className="eo-grid">
            <div className="eo-field">
              <label className="eo-label">
                Export Order No.
              </label>

              <input
                className="eo-input"
                value={
                  form.exportOrderNo
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Export Order Date
              </label>

              <input
                className="eo-input"
                type="date"
                value={
                  form.exportOrderDate
                }
                onChange={(e) =>
                  updateField(
                    "exportOrderDate",
                    e.target.value
                  )
                }
              />
            </div>

            <div
              className="eo-field"
              style={{
                gridColumn:
                  "span 2",
              }}
            >
              <label className="eo-label">
                Select Proforma Invoice *
              </label>

              <select
                className="eo-select"
                value={
                  selectedProformaNo
                }
                onChange={(e) =>
                  handleProformaChange(
                    e.target.value
                  )
                }
              >
                <option value="">
                  -- Select Proforma Invoice --
                </option>

                {proformas.map(
                  (proforma) => (
                    <option
                      key={proforma.id}
                      value={
                        proforma.proformaInvoiceNo
                      }
                    >
                      {
                        proforma.proformaInvoiceNo
                      }{" "}
                      —{" "}
                      {
                        proforma.customerName
                      }{" "}
                      —{" "}
                      {
                        proforma.currency
                      }{" "}
                      {Number(
                        proforma.totalProformaValue ||
                          0
                      ).toFixed(2)}
                    </option>
                  )
                )}
              </select>

              <div className="eo-note">
                Export Order is created
                from an existing
                Proforma Invoice.
                Proforma details are
                copied as an Order
                snapshot.
              </div>

              {selectedProforma && (
                <span className="eo-badge">
                  Source:{" "}
                  {
                    selectedProforma.proformaInvoiceNo
                  }
                </span>
              )}

              {proformas.length ===
                0 && (
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "11px",
                    color: "#b45309",
                  }}
                >
                  No Proforma Invoice
                  found. Create a
                  Proforma Invoice
                  first.
                </div>
              )}
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Proforma Invoice No.
              </label>

              <input
                className="eo-input"
                value={
                  form.proformaInvoiceNo
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Quotation No.
              </label>

              <input
                className="eo-input"
                value={
                  form.quotationNo
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Enquiry No.
              </label>

              <input
                className="eo-input"
                value={
                  form.enquiryNo
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Status
              </label>

              <select
                className="eo-select"
                value={form.status}
                onChange={(e) =>
                  updateField(
                    "status",
                    e.target
                      .value as ExportOrderStatus
                  )
                }
              >
                {STATUS_OPTIONS.map(
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
        </div>
      </div>

      {/* =====================================================
          2. EXPORTER
      ===================================================== */}

      <div className="eo-section">
        <div className="eo-title">
          Exporter / Seller
        </div>

        <div className="eo-body">
          <div className="eo-grid">
            <div className="eo-field">
              <label className="eo-label">
                Exporter Name
              </label>

              <input
                className="eo-input"
                value={
                  form.exporterName
                }
                onChange={(e) =>
                  updateField(
                    "exporterName",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                IEC
              </label>

              <input
                className="eo-input"
                value={
                  form.exporterIEC
                }
                onChange={(e) =>
                  updateField(
                    "exporterIEC",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                GSTIN
              </label>

              <input
                className="eo-input"
                value={
                  form.exporterGSTIN
                }
                onChange={(e) =>
                  updateField(
                    "exporterGSTIN",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                PAN
              </label>

              <input
                className="eo-input"
                value={
                  form.exporterPAN
                }
                onChange={(e) =>
                  updateField(
                    "exporterPAN",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field eo-full">
              <label className="eo-label">
                Address
              </label>

              <textarea
                className="eo-textarea"
                value={
                  form.exporterAddress
                }
                onChange={(e) =>
                  updateField(
                    "exporterAddress",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                City
              </label>

              <input
                className="eo-input"
                value={
                  form.exporterCity
                }
                onChange={(e) =>
                  updateField(
                    "exporterCity",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                State
              </label>

              <input
                className="eo-input"
                value={
                  form.exporterState
                }
                onChange={(e) =>
                  updateField(
                    "exporterState",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Mobile
              </label>

              <input
                className="eo-input"
                value={
                  form.exporterMobile
                }
                onChange={(e) =>
                  updateField(
                    "exporterMobile",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Email
              </label>

              <input
                className="eo-input"
                value={
                  form.exporterEmail
                }
                onChange={(e) =>
                  updateField(
                    "exporterEmail",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Website
              </label>

              <input
                className="eo-input"
                value={
                  form.exporterWebsite
                }
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

      {/* =====================================================
          3. BUYER
      ===================================================== */}

      <div className="eo-section eo-readonly-section">
        <div className="eo-title">
          Customer / Buyer
        </div>

        <div className="eo-body">
          <div className="eo-grid">
            <div className="eo-field">
              <label className="eo-label">
                Customer Code
              </label>

              <input
                className="eo-input"
                value={
                  form.customerCode
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Customer / Buyer
              </label>

              <input
                className="eo-input"
                value={
                  form.customerName
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Contact Person
              </label>

              <input
                className="eo-input"
                value={
                  form.contactPerson
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Country
              </label>

              <input
                className="eo-input"
                value={
                  form.buyerCountry
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field eo-full">
              <label className="eo-label">
                Buyer Address
              </label>

              <textarea
                className="eo-textarea"
                value={
                  form.buyerAddress
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                City
              </label>

              <input
                className="eo-input"
                value={
                  form.buyerCity
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                State / Province
              </label>

              <input
                className="eo-input"
                value={
                  form.buyerStateProvince
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Postal Code
              </label>

              <input
                className="eo-input"
                value={
                  form.buyerPostalCode
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Tax Registration No.
              </label>

              <input
                className="eo-input"
                value={
                  form.buyerTaxRegistrationNo
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Email
              </label>

              <input
                className="eo-input"
                value={
                  form.buyerEmail
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Mobile
              </label>

              <input
                className="eo-input"
                value={
                  form.buyerMobile
                }
                readOnly
                style={readonlyStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          4. ADDITIONAL PARTIES / REFERENCES
      ===================================================== */}

      <div className="eo-section">
        <div className="eo-title">
          Parties & Buyer References
        </div>

        <div className="eo-body">
          <div className="eo-grid">
            <div className="eo-field">
              <label className="eo-label">
                Consignee Name
              </label>

              <input
                className="eo-input"
                value={
                  form.consigneeName
                }
                onChange={(e) =>
                  updateField(
                    "consigneeName",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Consignee Country
              </label>

              <input
                className="eo-input"
                value={
                  form.consigneeCountry
                }
                onChange={(e) =>
                  updateField(
                    "consigneeCountry",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Importer Name
              </label>

              <input
                className="eo-input"
                value={
                  form.importerName
                }
                onChange={(e) =>
                  updateField(
                    "importerName",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Importer Country
              </label>

              <input
                className="eo-input"
                value={
                  form.importerCountry
                }
                onChange={(e) =>
                  updateField(
                    "importerCountry",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Buyer Reference No.
              </label>

              <input
                className="eo-input"
                value={
                  form.buyerReferenceNo
                }
                onChange={(e) =>
                  updateField(
                    "buyerReferenceNo",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Buyer PO No.
              </label>

              <input
                className="eo-input"
                value={
                  form.buyerPONo
                }
                onChange={(e) =>
                  updateField(
                    "buyerPONo",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Buyer PO Date
              </label>

              <input
                className="eo-input"
                type="date"
                value={
                  form.buyerPODate
                }
                onChange={(e) =>
                  updateField(
                    "buyerPODate",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                LC No.
              </label>

              <input
                className="eo-input"
                value={form.lcNo}
                onChange={(e) =>
                  updateField(
                    "lcNo",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                LC Date
              </label>

              <input
                className="eo-input"
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

            <div className="eo-field eo-full">
              <label className="eo-label">
                Notify Party
              </label>

              <textarea
                className="eo-textarea"
                value={
                  form.notifyParty
                }
                onChange={(e) =>
                  updateField(
                    "notifyParty",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Consignee Address
              </label>

              <textarea
                className="eo-textarea"
                value={
                  form.consigneeAddress
                }
                onChange={(e) =>
                  updateField(
                    "consigneeAddress",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Importer Address
              </label>

              <textarea
                className="eo-textarea"
                value={
                  form.importerAddress
                }
                onChange={(e) =>
                  updateField(
                    "importerAddress",
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          5. COMMERCIAL TERMS
      ===================================================== */}

      <div className="eo-section">
        <div className="eo-title">
          Commercial / Trade Terms
        </div>

        <div className="eo-body">
          <div className="eo-grid">
            <div className="eo-field">
              <label className="eo-label">
                Currency
              </label>

              <select
                className="eo-select"
                value={
                  form.currency
                }
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

            <div className="eo-field">
              <label className="eo-label">
                Incoterm
              </label>

              <select
                className="eo-select"
                value={
                  form.incoterm
                }
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

            <div className="eo-field">
              <label className="eo-label">
                Incoterm Place
              </label>

              <input
                className="eo-input"
                value={
                  form.incotermPlace
                }
                onChange={(e) =>
                  updateField(
                    "incotermPlace",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Payment Terms
              </label>

              <input
                className="eo-input"
                value={
                  form.paymentTerms
                }
                onChange={(e) =>
                  updateField(
                    "paymentTerms",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Payment Method
              </label>

              <select
                className="eo-select"
                value={
                  form.paymentMethod
                }
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

            <div className="eo-field">
              <label className="eo-label">
                Shipment Mode
              </label>

              <select
                className="eo-select"
                value={
                  form.shipmentMode
                }
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

            <div className="eo-field">
              <label className="eo-label">
                Estimated Shipment Date
              </label>

              <input
                className="eo-input"
                type="date"
                value={
                  form.estimatedShipmentDate
                }
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

      {/* =====================================================
          6. SHIPMENT PLANNING
      ===================================================== */}

      <div className="eo-section">
        <div className="eo-title">
          Shipment Planning
        </div>

        <div className="eo-body">
          <div className="eo-grid">
            <div className="eo-field">
              <label className="eo-label">
                Port of Loading
              </label>

              <input
                className="eo-input"
                value={
                  form.portOfLoading
                }
                onChange={(e) =>
                  updateField(
                    "portOfLoading",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Port of Discharge
              </label>

              <input
                className="eo-input"
                value={
                  form.portOfDischarge
                }
                onChange={(e) =>
                  updateField(
                    "portOfDischarge",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Final Destination
              </label>

              <input
                className="eo-input"
                value={
                  form.finalDestination
                }
                onChange={(e) =>
                  updateField(
                    "finalDestination",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Country of Destination
              </label>

              <input
                className="eo-input"
                value={
                  form.countryOfDestination
                }
                onChange={(e) =>
                  updateField(
                    "countryOfDestination",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Country of Origin
              </label>

              <input
                className="eo-input"
                value={
                  form.countryOfOrigin
                }
                onChange={(e) =>
                  updateField(
                    "countryOfOrigin",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Shipment Date
              </label>

              <input
                className="eo-input"
                type="date"
                value={
                  form.estimatedShipmentDate
                }
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

      {/* =====================================================
          7. PRODUCTS
      ===================================================== */}

      <div className="eo-section eo-readonly-section">
        <div className="eo-title">
          Proforma Products → Export Order Products
        </div>

        <div className="eo-body">
          <div className="eo-note">
            Product details and commercial values
            are copied from the selected Proforma
            Invoice as an Order snapshot.
            Shipment-specific details can still
            be updated.
          </div>

          <div
            className="eo-table-wrap"
            style={{
              marginTop: "7px",
            }}
          >
            <table className="eo-table">
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
                {form.items.map(
                  (item, index) => (
                    <tr key={index}>
                      <td>
                        {index + 1}
                      </td>

                      <td className="eo-source">
                        <input
                          value={
                            item.productCode
                          }
                          readOnly
                          style={
                            readonlyStyle
                          }
                        />
                      </td>

                      <td className="eo-source">
                        <input
                          value={
                            item.productName
                          }
                          readOnly
                          style={
                            readonlyStyle
                          }
                        />
                      </td>

                      <td>
                        <input
                          value={
                            item.hsCode
                          }
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
                          value={
                            item.countryOfOrigin
                          }
                          onChange={(e) =>
                            updateItem(
                              index,
                              "countryOfOrigin",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td className="eo-source">
                        <input
                          type="number"
                          value={
                            item.qty
                          }
                          readOnly
                          style={
                            readonlyStyle
                          }
                        />
                      </td>

                      <td className="eo-source">
                        <input
                          value={
                            item.unit
                          }
                          readOnly
                          style={
                            readonlyStyle
                          }
                        />
                      </td>

                      <td className="eo-source">
                        <input
                          type="number"
                          value={
                            item.unitPrice
                          }
                          readOnly
                          style={
                            readonlyStyle
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.discount
                          }
                          onChange={(e) =>
                            updateItem(
                              index,
                              "discount",
                              Number(
                                e.target.value
                              )
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          value={Number(
                            item.amount || 0
                          ).toFixed(2)}
                          readOnly
                          style={
                            readonlyStyle
                          }
                        />
                      </td>

                      <td>
                        <input
                          value={
                            item.packingType
                          }
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
                          value={
                            item.packageQty
                          }
                          onChange={(e) =>
                            updateItem(
                              index,
                              "packageQty",
                              Number(
                                e.target.value
                              )
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={
                            item.netWeight
                          }
                          onChange={(e) =>
                            updateItem(
                              index,
                              "netWeight",
                              Number(
                                e.target.value
                              )
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={
                            item.grossWeight
                          }
                          onChange={(e) =>
                            updateItem(
                              index,
                              "grossWeight",
                              Number(
                                e.target.value
                              )
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={
                            item.cbm
                          }
                          onChange={(e) =>
                            updateItem(
                              index,
                              "cbm",
                              Number(
                                e.target.value
                              )
                            )
                          }
                        />
                      </td>

                      <td className="eo-source">
                        <input
                          value={
                            item.customerRequirement
                          }
                          readOnly
                          style={
                            readonlyStyle
                          }
                        />
                      </td>

                      <td>
                        <input
                          value={
                            item.grade
                          }
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
                          value={
                            item.brand
                          }
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
                          value={
                            item.specification
                          }
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
                          className="eo-small-btn eo-btn-danger"
                          onClick={() =>
                            removeItem(
                              index
                            )
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: "6px",
            }}
          >
            <button
              type="button"
              className="eo-btn"
              onClick={addItem}
            >
              + Add Product
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          8. PACKAGE SUMMARY
      ===================================================== */}

      <div className="eo-section">
        <div className="eo-title">
          Package / Weight Summary
        </div>

        <div className="eo-body">
          <div className="eo-grid">
            <div className="eo-field">
              <label className="eo-label">
                Total Packages
              </label>

              <input
                className="eo-input"
                value={
                  form.totalPackages
                }
                readOnly
                style={
                  readonlyStyle
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Package Type
              </label>

              <input
                className="eo-input"
                value={
                  form.packageType
                }
                onChange={(e) =>
                  updateField(
                    "packageType",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Total Net Weight
              </label>

              <input
                className="eo-input"
                value={Number(
                  form.totalNetWeight || 0
                ).toFixed(3)}
                readOnly
                style={
                  readonlyStyle
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Total Gross Weight
              </label>

              <input
                className="eo-input"
                value={Number(
                  form.totalGrossWeight || 0
                ).toFixed(3)}
                readOnly
                style={
                  readonlyStyle
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Total CBM
              </label>

              <input
                className="eo-input"
                value={Number(
                  form.totalCBM || 0
                ).toFixed(3)}
                readOnly
                style={
                  readonlyStyle
                }
              />
            </div>

            <div className="eo-field eo-full">
              <label className="eo-label">
                Marks & Numbers
              </label>

              <textarea
                className="eo-textarea"
                value={
                  form.marksNumbers
                }
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

      {/* =====================================================
          9. ORDER VALUE
      ===================================================== */}

      <div className="eo-section">
        <div className="eo-title">
          Export Order Commercial Value
        </div>

        <div className="eo-body">
          <div className="eo-summary">
            <div>
              <div className="eo-grid-2">
                <div className="eo-field">
                  <label className="eo-label">
                    Freight
                  </label>

                  <input
                    className="eo-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.freight
                    }
                    onChange={(e) =>
                      updateField(
                        "freight",
                        Number(
                          e.target.value
                        )
                      )
                    }
                  />
                </div>

                <div className="eo-field">
                  <label className="eo-label">
                    Insurance
                  </label>

                  <input
                    className="eo-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.insurance
                    }
                    onChange={(e) =>
                      updateField(
                        "insurance",
                        Number(
                          e.target.value
                        )
                      )
                    }
                  />
                </div>

                <div className="eo-field">
                  <label className="eo-label">
                    Other Charges
                  </label>

                  <input
                    className="eo-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.otherCharges
                    }
                    onChange={(e) =>
                      updateField(
                        "otherCharges",
                        Number(
                          e.target.value
                        )
                      )
                    }
                  />
                </div>

                <div className="eo-field">
                  <label className="eo-label">
                    Exchange Rate
                  </label>

                  <input
                    className="eo-input"
                    type="number"
                    min="0"
                    step="0.0001"
                    value={
                      form.exchangeRate
                    }
                    onChange={(e) =>
                      updateField(
                        "exchangeRate",
                        Number(
                          e.target.value
                        )
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div className="eo-summary-box">
              <div className="eo-summary-row">
                <span>
                  Goods Value
                </span>

                <strong>
                  {form.currency}{" "}
                  {totals.totalGoodsValue.toFixed(
                    2
                  )}
                </strong>
              </div>

              <div className="eo-summary-row">
                <span>
                  Discount
                </span>

                <strong>
                  {form.currency}{" "}
                  {totals.discount.toFixed(
                    2
                  )}
                </strong>
              </div>

              <div className="eo-summary-row">
                <span>
                  Freight
                </span>

                <strong>
                  {form.currency}{" "}
                  {Number(
                    form.freight || 0
                  ).toFixed(2)}
                </strong>
              </div>

              <div className="eo-summary-row">
                <span>
                  Insurance
                </span>

                <strong>
                  {form.currency}{" "}
                  {Number(
                    form.insurance || 0
                  ).toFixed(2)}
                </strong>
              </div>

              <div className="eo-summary-row">
                <span>
                  Other Charges
                </span>

                <strong>
                  {form.currency}{" "}
                  {Number(
                    form.otherCharges || 0
                  ).toFixed(2)}
                </strong>
              </div>

              <div className="eo-summary-row eo-total">
                <span>
                  Total Order Value
                </span>

                <strong>
                  {form.currency}{" "}
                  {totals.totalOrderValue.toFixed(
                    2
                  )}
                </strong>
              </div>

              <div className="eo-summary-row">
                <span>
                  INR Equivalent
                </span>

                <strong>
                  INR{" "}
                  {totals.inrEquivalent.toFixed(
                    2
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          10. PAYMENT
      ===================================================== */}

      <div className="eo-section">
        <div className="eo-title">
          Payment Summary
        </div>

        <div className="eo-body">
          <div className="eo-grid">
            <div className="eo-field">
              <label className="eo-label">
                Advance %
              </label>

              <input
                className="eo-input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={
                  form.advancePercentage
                }
                onChange={(e) =>
                  updateField(
                    "advancePercentage",
                    Number(
                      e.target.value
                    )
                  )
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Advance Amount
              </label>

              <input
                className="eo-input"
                value={totals.advanceAmount.toFixed(
                  2
                )}
                readOnly
                style={
                  readonlyStyle
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Balance Amount
              </label>

              <input
                className="eo-input"
                value={totals.balanceAmount.toFixed(
                  2
                )}
                readOnly
                style={
                  readonlyStyle
                }
              />
            </div>

            <div className="eo-field">
              <label className="eo-label">
                Payment Method
              </label>

              <select
                className="eo-select"
                value={
                  form.paymentMethod
                }
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
          </div>
        </div>
      </div>

      {/* =====================================================
          11. REMARKS / TERMS
      ===================================================== */}

      <div className="eo-section">
        <div className="eo-title">
          Remarks / Terms & Conditions
        </div>

        <div className="eo-body">
          <div className="eo-field">
            <label className="eo-label">
              Remarks
            </label>

            <textarea
              className="eo-textarea"
              value={
                form.remarks
              }
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
              marginTop: "8px",
              marginBottom: "5px",
              fontWeight: 700,
              fontSize: "12px",
            }}
          >
            Terms & Conditions
          </div>

          {form.termsAndConditions.map(
            (term, index) => (
              <div
                className="eo-term"
                key={index}
              >
                <span
                  style={{
                    width: "20px",
                    fontSize: "10px",
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
                  className="eo-small-btn"
                  onClick={() =>
                    removeTerm(
                      index
                    )
                  }
                >
                  Remove
                </button>
              </div>
            )
          )}

          <button
            type="button"
            className="eo-btn"
            onClick={addTerm}
          >
            + Add Term
          </button>
        </div>
      </div>

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="eo-actions">
        {onCancel && (
          <button
            type="button"
            className="eo-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          className="eo-btn"
          onClick={handleReset}
        >
          Reset
        </button>

        <button
          type="submit"
          className="eo-btn eo-btn-primary"
        >
          {initialData
            ? "Update Export Order"
            : "Save Export Order"}
        </button>
      </div>
    </form>
  );
}