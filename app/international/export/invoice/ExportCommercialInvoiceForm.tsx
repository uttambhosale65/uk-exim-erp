"use client";

import { useEffect, useMemo, useState } from "react";

import {
  loadExportProformaInvoices,
} from "../proforma/ExportProformaInvoiceStorage";

import {
  ExportProformaInvoice,
} from "../proforma/ExportProformaInvoiceTypes";

import {
  ExportCommercialInvoice,
  ExportCommercialInvoiceItem,
  ExportCommercialInvoiceStatus,
} from "./ExportCommercialInvoiceTypes";

type ExportCommercialInvoiceFormProps = {
  invoiceNo: string;
  initialData?: ExportCommercialInvoice | null;
  onSave: (invoice: ExportCommercialInvoice) => void;
  onCancel?: () => void;
};

const todayISO = () => {
  const d = new Date();

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
};

const displayDate = (value: string) => {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  const [y, m, d] = parts;

  return `${d}/${m}/${y}`;
};


const formatDateForStorage = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) return "";

  const displayMatch = trimmed.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  );

  if (displayMatch) {
    const [, day, month, year] = displayMatch;
    return `${year}-${month}-${day}`;
  }

  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (isoMatch) {
    return trimmed;
  }

  return "";
};

const isValidDateDisplay = (value: string): boolean => {
  if (!value) return false;

  const match = value.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  );

  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
};

const CommercialDateField = ({
  value,
  onChange,
  label,
  required = false,
}: DateFieldProps) => {
  const displayValue = value
    ? displayDate(value)
    : "";

  const handleTextChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const raw = event.target.value.replace(/[^\d/]/g, "");

    let next = raw;

    if (
      raw.length === 2 &&
      value.length === 1
    ) {
      next = `${raw}/`;
    } else if (
      raw.length === 5 &&
      value.length === 4
    ) {
      next = `${raw}/`;
    }

    if (next.length > 10) {
      return;
    }

    if (
      next.length === 10 &&
      !isValidDateDisplay(next)
    ) {
      onChange(next);
      return;
    }

    onChange(
      next.length === 10
        ? formatDateForStorage(next)
        : next
    );
  };

  const handlePickerChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange(event.target.value);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        value={displayValue}
        onChange={handleTextChange}
        placeholder="DD/MM/YYYY"
        inputMode="numeric"
        autoComplete="off"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 30px 6px 7px",
          border: "1px solid #d1d5db",
          borderRadius: "5px",
          fontSize: "11px",
          background: "#ffffff",
        }}
        aria-label={label}
        required={required}
      />

      <input
        type="date"
        value={formatDateForStorage(displayValue)}
        onChange={handlePickerChange}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          right: "6px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "22px",
          height: "22px",
          padding: 0,
          border: "none",
          background: "transparent",
          opacity: 0,
          cursor: "pointer",
        }}
      />

      <button
        type="button"
        onClick={(event) => {
          const picker =
            event.currentTarget
              .previousElementSibling as HTMLInputElement | null;

          if (picker) {
            picker.showPicker?.();
          }
        }}
        aria-label={`Select ${label}`}
        style={{
          position: "absolute",
          right: "4px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "24px",
          height: "24px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "13px",
          padding: 0,
        }}
      >
        📅
      </button>
    </div>
  );
};

const emptyItem = (): ExportCommercialInvoiceItem => ({
  productCode: "",
  productName: "",
  hsCode: "",
  countryOfOrigin: "",

  qty: 0,
  unit: "KG",
  unitPrice: 0,
  amount: 0,

  packingType: "",
  packageQty: 0,
  netWeight: 0,
  grossWeight: 0,
  cbm: 0,

  customerRequirement: "",
  grade: "",
  brand: "",
  specification: "",
  marksNumbers: "",
});

const mapProformaItem = (
  item: ExportProformaInvoice["items"][number]
): ExportCommercialInvoiceItem => ({
  productCode: item.productCode || "",
  productName: item.productName || "",
  hsCode: item.hsCode || "",
  countryOfOrigin: item.countryOfOrigin || "",

  qty: Number(item.qty || 0),
  unit: item.unit || "KG",
  unitPrice: Number(item.unitPrice || 0),

  amount:
    Number(item.qty || 0) *
    Number(item.unitPrice || 0),

  packingType: item.packingType || "",
  packageQty: Number(item.packageQty || 0),
  netWeight: Number(item.netWeight || 0),
  grossWeight: Number(item.grossWeight || 0),
  cbm: Number(item.cbm || 0),

  customerRequirement:
    item.customerRequirement || "",

  grade: item.grade || "",
  brand: item.brand || "",
  specification: item.specification || "",
  marksNumbers: item.marksNumbers || "",
});

const mapProformaToInvoice = (
  proforma: ExportProformaInvoice
): Partial<ExportCommercialInvoice> => {
  return {
    proformaInvoiceNo:
      proforma.proformaInvoiceNo || "",

    quotationNo:
      proforma.quotationNo || "",

    enquiryNo:
      proforma.enquiryNo || "",

    orderNo:
      proforma.exportOrderNo || "",

    exporterName:
      proforma.exporterName || "",

    exporterAddress:
      proforma.exporterAddress || "",

    exporterCity:
      proforma.exporterCity || "",

    exporterState:
      proforma.exporterState || "",

    exporterCountry:
      proforma.exporterCountry || "",

    exporterIEC:
      proforma.exporterIEC || "",

    exporterGSTIN:
      proforma.exporterGSTIN || "",

    exporterPAN:
      proforma.exporterPAN || "",

    exporterMobile:
      proforma.exporterMobile || "",

    exporterEmail:
      proforma.exporterEmail || "",

    exporterWebsite:
      proforma.exporterWebsite || "",

    customerCode:
      proforma.customerCode || "",

    customerName:
      proforma.customerName || "",

    contactPerson:
      proforma.contactPerson || "",

    buyerAddress:
      proforma.buyerAddress || "",

    buyerCity:
      proforma.buyerCity || "",

    buyerStateProvince:
      proforma.buyerStateProvince || "",

    buyerCountry:
      proforma.buyerCountry || "",

    buyerPostalCode:
      proforma.buyerPostalCode || "",

    buyerTaxRegistrationNo:
      proforma.buyerTaxRegistrationNo || "",

    countryOfOrigin:
      proforma.countryOfOrigin || "",

    finalDestination:
      proforma.finalDestination || "",

    portOfLoading:
      proforma.portOfLoading || "",

    portOfDischarge:
      proforma.portOfDischarge || "",

    shipmentMode:
      proforma.shipmentMode || "",

    incoterm:
      proforma.incoterm || "",

    currency:
      proforma.currency || "USD",

    containerNo:
      proforma.containerNo || "",

    sealNo:
      proforma.sealNo || "",

    vesselName:
      proforma.vesselFlightNo || "",

    voyageNo:
      proforma.voyageNo || "",

    blNo:
      proforma.blAwbNo || "",

    blDate:
      proforma.blAwbDate || "",

    totalPackages:
      Number(proforma.totalPackages || 0),

    totalNetWeight:
      Number(proforma.totalNetWeight || 0),

    totalGrossWeight:
      Number(proforma.totalGrossWeight || 0),

    totalCBM:
      Number(proforma.totalCBM || 0),

    totalGoodsValue:
      Number(proforma.totalGoodsValue || 0),

    freight:
      Number(proforma.freight || 0),

    insurance:
      Number(proforma.insurance || 0),

    otherCharges:
      Number(proforma.otherCharges || 0),

    totalInvoiceValue:
      Number(proforma.totalProformaValue || 0),

    exchangeRate:
      Number(proforma.exchangeRate || 1),

    inrEquivalent:
      Number(proforma.inrEquivalent || 0),

    paymentTerms:
      proforma.paymentTerms || "",

    paymentMethod:
      proforma.paymentMethod || "",

    advanceReceived:
      Number(proforma.advanceAmount || 0),

    balanceDue:
      Number(proforma.balanceAmount || 0),

    bankName:
      proforma.bankName || "",

    bankBranch:
      proforma.bankBranch || "",

    bankAccountName:
      proforma.bankAccountName || "",

    bankAccountNo:
      proforma.bankAccountNo || "",

    bankIFSC: "",

    bankSwiftBic:
      proforma.swiftBic || "",

    marksNumbers:
      proforma.marksNumbers || "",

    packingDetails:
      proforma.packageType || "",

    declaration:
      proforma.declaration &&
      !proforma.declaration
        .toLowerCase()
        .includes("proforma invoice")
        ? proforma.declaration
        : "We certify that the information stated in this Commercial Invoice is true and correct to the best of our knowledge and belief.",

    authorizedSignatory:
      proforma.authorizedSignatory || "",

    remarks:
      proforma.remarks || "",
  };
};

export default function ExportCommercialInvoiceForm({
  invoiceNo,
  initialData,
  onSave,
  onCancel,
}: ExportCommercialInvoiceFormProps) {
  const [proformas, setProformas] =
    useState<ExportProformaInvoice[]>([]);

  const [sourceProformaNo, setSourceProformaNo] =
    useState(
      initialData?.proformaInvoiceNo || ""
    );

  const [invoiceDate, setInvoiceDate] =
    useState(
      initialData?.invoiceDate || todayISO()
    );

  const [orderNo, setOrderNo] =
    useState(initialData?.orderNo || "");

  const [proformaInvoiceNo, setProformaInvoiceNo] =
    useState(
      initialData?.proformaInvoiceNo || ""
    );

  const [quotationNo, setQuotationNo] =
    useState(
      initialData?.quotationNo || ""
    );

  const [enquiryNo, setEnquiryNo] =
    useState(
      initialData?.enquiryNo || ""
    );

  const [exporterName, setExporterName] =
    useState(
      initialData?.exporterName || ""
    );

  const [exporterAddress, setExporterAddress] =
    useState(
      initialData?.exporterAddress || ""
    );

  const [exporterCity, setExporterCity] =
    useState(
      initialData?.exporterCity || ""
    );

  const [exporterState, setExporterState] =
    useState(
      initialData?.exporterState || ""
    );

  const [exporterCountry, setExporterCountry] =
    useState(
      initialData?.exporterCountry || ""
    );

  const [exporterIEC, setExporterIEC] =
    useState(
      initialData?.exporterIEC || ""
    );

  const [exporterGSTIN, setExporterGSTIN] =
    useState(
      initialData?.exporterGSTIN || ""
    );

  const [exporterPAN, setExporterPAN] =
    useState(
      initialData?.exporterPAN || ""
    );

  const [exporterMobile, setExporterMobile] =
    useState(
      initialData?.exporterMobile || ""
    );

  const [exporterEmail, setExporterEmail] =
    useState(
      initialData?.exporterEmail || ""
    );

  const [exporterWebsite, setExporterWebsite] =
    useState(
      initialData?.exporterWebsite || ""
    );

  const [customerCode, setCustomerCode] =
    useState(
      initialData?.customerCode || ""
    );

  const [customerName, setCustomerName] =
    useState(
      initialData?.customerName || ""
    );

  const [contactPerson, setContactPerson] =
    useState(
      initialData?.contactPerson || ""
    );

  const [buyerAddress, setBuyerAddress] =
    useState(
      initialData?.buyerAddress || ""
    );

  const [buyerCity, setBuyerCity] =
    useState(
      initialData?.buyerCity || ""
    );

  const [buyerStateProvince, setBuyerStateProvince] =
    useState(
      initialData?.buyerStateProvince || ""
    );

  const [buyerCountry, setBuyerCountry] =
    useState(
      initialData?.buyerCountry || ""
    );

  const [buyerPostalCode, setBuyerPostalCode] =
    useState(
      initialData?.buyerPostalCode || ""
    );

  const [buyerTaxRegistrationNo, setBuyerTaxRegistrationNo] =
    useState(
      initialData?.buyerTaxRegistrationNo || ""
    );

  const [countryOfOrigin, setCountryOfOrigin] =
    useState(
      initialData?.countryOfOrigin || ""
    );

  const [finalDestination, setFinalDestination] =
    useState(
      initialData?.finalDestination || ""
    );

  const [portOfLoading, setPortOfLoading] =
    useState(
      initialData?.portOfLoading || ""
    );

  const [portOfDischarge, setPortOfDischarge] =
    useState(
      initialData?.portOfDischarge || ""
    );

  const [shipmentMode, setShipmentMode] =
    useState(
      initialData?.shipmentMode || ""
    );

  const [incoterm, setIncoterm] =
    useState(
      initialData?.incoterm || ""
    );

  const [currency, setCurrency] =
    useState(
      initialData?.currency || "USD"
    );

  const [shipmentNo, setShipmentNo] =
    useState(
      initialData?.shipmentNo || ""
    );

  const [containerNo, setContainerNo] =
    useState(
      initialData?.containerNo || ""
    );

  const [sealNo, setSealNo] =
    useState(
      initialData?.sealNo || ""
    );

  const [vesselName, setVesselName] =
    useState(
      initialData?.vesselName || ""
    );

  const [voyageNo, setVoyageNo] =
    useState(
      initialData?.voyageNo || ""
    );

  const [blNo, setBlNo] =
    useState(
      initialData?.blNo || ""
    );

  const [blDate, setBlDate] =
    useState(
      initialData?.blDate || ""
    );

  const [awbNo, setAwbNo] =
    useState(
      initialData?.awbNo || ""
    );

  const [awbDate, setAwbDate] =
    useState(
      initialData?.awbDate || ""
    );

  const [items, setItems] =
    useState<ExportCommercialInvoiceItem[]>(
      initialData?.items?.length
        ? initialData.items
        : [emptyItem()]
    );

  const [freight, setFreight] =
    useState(
      initialData?.freight ?? 0
    );

  const [insurance, setInsurance] =
    useState(
      initialData?.insurance ?? 0
    );

  const [otherCharges, setOtherCharges] =
    useState(
      initialData?.otherCharges ?? 0
    );

  const [exchangeRate, setExchangeRate] =
    useState(
      initialData?.exchangeRate ?? 1
    );

  const [paymentTerms, setPaymentTerms] =
    useState(
      initialData?.paymentTerms || ""
    );

  const [paymentMethod, setPaymentMethod] =
    useState(
      initialData?.paymentMethod || ""
    );

  const [advanceReceived, setAdvanceReceived] =
    useState(
      initialData?.advanceReceived ?? 0
    );

  const [bankName, setBankName] =
    useState(
      initialData?.bankName || ""
    );

  const [bankBranch, setBankBranch] =
    useState(
      initialData?.bankBranch || ""
    );

  const [bankAccountName, setBankAccountName] =
    useState(
      initialData?.bankAccountName || ""
    );

  const [bankAccountNo, setBankAccountNo] =
    useState(
      initialData?.bankAccountNo || ""
    );

  const [bankIFSC, setBankIFSC] =
    useState(
      initialData?.bankIFSC || ""
    );

  const [bankSwiftBic, setBankSwiftBic] =
    useState(
      initialData?.bankSwiftBic || ""
    );

  const [marksNumbers, setMarksNumbers] =
    useState(
      initialData?.marksNumbers || ""
    );

  const [packingDetails, setPackingDetails] =
    useState(
      initialData?.packingDetails || ""
    );

  const [declaration, setDeclaration] =
    useState(
      initialData?.declaration || ""
    );

  const [authorizedSignatory, setAuthorizedSignatory] =
    useState(
      initialData?.authorizedSignatory || ""
    );

  const [status, setStatus] =
    useState<ExportCommercialInvoiceStatus>(
      initialData?.status || "Draft"
    );

  const [remarks, setRemarks] =
    useState(
      initialData?.remarks || ""
    );

  useEffect(() => {
    setProformas(
      loadExportProformaInvoices()
    );
  }, []);

  const totalGoodsValue = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total +
        Number(item.amount || 0),
      0
    );
  }, [items]);

  const totalInvoiceValue =
    totalGoodsValue +
    Number(freight || 0) +
    Number(insurance || 0) +
    Number(otherCharges || 0);

  const inrEquivalent =
    currency === "INR"
      ? totalInvoiceValue
      : totalInvoiceValue *
        Number(exchangeRate || 0);

  const balanceDue =
    Math.max(
      totalInvoiceValue -
        Number(advanceReceived || 0),
      0
    );

  const totalPackages = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total +
        Number(item.packageQty || 0),
      0
    );
  }, [items]);

  const totalNetWeight = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total +
        Number(item.netWeight || 0),
      0
    );
  }, [items]);

  const totalGrossWeight = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total +
        Number(item.grossWeight || 0),
      0
    );
  }, [items]);

  const totalCBM = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total +
        Number(item.cbm || 0),
      0
    );
  }, [items]);

  const applyProforma = (
    proforma: ExportProformaInvoice
  ) => {
    const mapped =
      mapProformaToInvoice(
        proforma
      );

    setSourceProformaNo(
      proforma.proformaInvoiceNo
    );

    setProformaInvoiceNo(
      proforma.proformaInvoiceNo
    );

    setQuotationNo(
      proforma.quotationNo || ""
    );

    setEnquiryNo(
      proforma.enquiryNo || ""
    );

    setOrderNo(
      proforma.exportOrderNo || ""
    );

    setExporterName(
      mapped.exporterName || ""
    );

    setExporterAddress(
      mapped.exporterAddress || ""
    );

    setExporterCity(
      mapped.exporterCity || ""
    );

    setExporterState(
      mapped.exporterState || ""
    );

    setExporterCountry(
      mapped.exporterCountry || ""
    );

    setExporterIEC(
      mapped.exporterIEC || ""
    );

    setExporterGSTIN(
      mapped.exporterGSTIN || ""
    );

    setExporterPAN(
      mapped.exporterPAN || ""
    );

    setExporterMobile(
      mapped.exporterMobile || ""
    );

    setExporterEmail(
      mapped.exporterEmail || ""
    );

    setExporterWebsite(
      mapped.exporterWebsite || ""
    );

    setCustomerCode(
      mapped.customerCode || ""
    );

    setCustomerName(
      mapped.customerName || ""
    );

    setContactPerson(
      mapped.contactPerson || ""
    );

    setBuyerAddress(
      mapped.buyerAddress || ""
    );

    setBuyerCity(
      mapped.buyerCity || ""
    );

    setBuyerStateProvince(
      mapped.buyerStateProvince || ""
    );

    setBuyerCountry(
      mapped.buyerCountry || ""
    );

    setBuyerPostalCode(
      mapped.buyerPostalCode || ""
    );

    setBuyerTaxRegistrationNo(
      mapped.buyerTaxRegistrationNo || ""
    );

    setCountryOfOrigin(
      mapped.countryOfOrigin || ""
    );

    setFinalDestination(
      mapped.finalDestination || ""
    );

    setPortOfLoading(
      mapped.portOfLoading || ""
    );

    setPortOfDischarge(
      mapped.portOfDischarge || ""
    );

    setShipmentMode(
      mapped.shipmentMode || ""
    );

    setIncoterm(
      mapped.incoterm || ""
    );

    setCurrency(
      mapped.currency || "USD"
    );

    setContainerNo(
      mapped.containerNo || ""
    );

    setSealNo(
      mapped.sealNo || ""
    );

    setVesselName(
      mapped.vesselName || ""
    );

    setVoyageNo(
      mapped.voyageNo || ""
    );

    setBlNo(
      mapped.blNo || ""
    );

    setBlDate(
      mapped.blDate || ""
    );

    setFreight(
      Number(mapped.freight || 0)
    );

    setInsurance(
      Number(mapped.insurance || 0)
    );

    setOtherCharges(
      Number(mapped.otherCharges || 0)
    );

    setExchangeRate(
      Number(mapped.exchangeRate || 1)
    );

    setPaymentTerms(
      mapped.paymentTerms || ""
    );

    setPaymentMethod(
      mapped.paymentMethod || ""
    );

    setAdvanceReceived(
      Number(
        mapped.advanceReceived || 0
      )
    );

    setBankName(
      mapped.bankName || ""
    );

    setBankBranch(
      mapped.bankBranch || ""
    );

    setBankAccountName(
      mapped.bankAccountName || ""
    );

    setBankAccountNo(
      mapped.bankAccountNo || ""
    );

    setBankSwiftBic(
      mapped.bankSwiftBic || ""
    );

    setMarksNumbers(
      mapped.marksNumbers || ""
    );

    setPackingDetails(
      mapped.packingDetails || ""
    );

    setDeclaration(
      mapped.declaration || ""
    );

    setAuthorizedSignatory(
      mapped.authorizedSignatory || ""
    );

    setRemarks(
      mapped.remarks || ""
    );

    setItems(
      proforma.items?.length
        ? proforma.items.map(
            mapProformaItem
          )
        : [emptyItem()]
    );
  };

  const handleProformaChange = (
    proformaNo: string
  ) => {
    setSourceProformaNo(
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

    if (proforma) {
      applyProforma(
        proforma
      );
    }
  };

  const updateItem = (
    index: number,
    patch: Partial<ExportCommercialInvoiceItem>
  ) => {
    setItems((current) =>
      current.map(
        (item, itemIndex) => {
          if (
            itemIndex !== index
          ) {
            return item;
          }

          const next = {
            ...item,
            ...patch,
          };

          const qty =
            Number(next.qty || 0);

          const unitPrice =
            Number(
              next.unitPrice || 0
            );

          next.amount =
            qty * unitPrice;

          return next;
        }
      )
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      emptyItem(),
    ]);
  };

  const removeItem = (
    index: number
  ) => {
    if (
      items.length === 1
    ) {
      return;
    }

    setItems((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  const resetForm = () => {
    setSourceProformaNo("");

    setInvoiceDate(
      todayISO()
    );

    setOrderNo("");
    setProformaInvoiceNo("");
    setQuotationNo("");
    setEnquiryNo("");

    setExporterName("");
    setExporterAddress("");
    setExporterCity("");
    setExporterState("");
    setExporterCountry("");

    setExporterIEC("");
    setExporterGSTIN("");
    setExporterPAN("");

    setExporterMobile("");
    setExporterEmail("");
    setExporterWebsite("");

    setCustomerCode("");
    setCustomerName("");
    setContactPerson("");

    setBuyerAddress("");
    setBuyerCity("");
    setBuyerStateProvince("");
    setBuyerCountry("");
    setBuyerPostalCode("");
    setBuyerTaxRegistrationNo("");

    setCountryOfOrigin("");
    setFinalDestination("");

    setPortOfLoading("");
    setPortOfDischarge("");

    setShipmentMode("");
    setIncoterm("");
    setCurrency("USD");

    setShipmentNo("");

    setContainerNo("");
    setSealNo("");

    setVesselName("");
    setVoyageNo("");

    setBlNo("");
    setBlDate("");

    setAwbNo("");
    setAwbDate("");

    setItems([
      emptyItem(),
    ]);

    setFreight(0);
    setInsurance(0);
    setOtherCharges(0);

    setExchangeRate(1);

    setPaymentTerms("");
    setPaymentMethod("");

    setAdvanceReceived(0);

    setBankName("");
    setBankBranch("");
    setBankAccountName("");
    setBankAccountNo("");
    setBankIFSC("");
    setBankSwiftBic("");

    setMarksNumbers("");
    setPackingDetails("");

    setDeclaration(
      "We certify that the information stated in this Commercial Invoice is true and correct to the best of our knowledge and belief."
    );
    setAuthorizedSignatory("");

    setStatus("Draft");

    setRemarks("");
  };

  const handleSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!invoiceDate) {
      alert(
        "Invoice Date is required."
      );
      return;
    }

    if (!proformaInvoiceNo) {
      alert(
        "Please select a Proforma Invoice."
      );
      return;
    }

    if (!customerName) {
      alert(
        "Customer is required."
      );
      return;
    }

    if (
      items.length === 0
    ) {
      alert(
        "At least one product is required."
      );
      return;
    }

    const invalidItem =
      items.find(
        (item) =>
          !item.productCode ||
          !item.productName ||
          Number(item.qty) <= 0 ||
          Number(item.unitPrice) < 0
      );

    if (invalidItem) {
      alert(
        "Each product must have Product, Quantity and valid Unit Price."
      );
      return;
    }

    if (
      currency !== "INR" &&
      Number(exchangeRate) <= 0
    ) {
      alert(
        "Exchange Rate must be greater than 0."
      );
      return;
    }

    if (
      Number(advanceReceived) < 0
    ) {
      alert(
        "Advance Received cannot be negative."
      );
      return;
    }

    const now =
      new Date().toISOString();

    const normalizedItems =
      items.map((item) => {
        const qty =
          Number(item.qty || 0);

        const unitPrice =
          Number(
            item.unitPrice || 0
          );

        return {
          ...item,

          qty,

          unitPrice,

          amount:
            qty * unitPrice,

          packageQty:
            Number(
              item.packageQty || 0
            ),

          netWeight:
            Number(
              item.netWeight || 0
            ),

          grossWeight:
            Number(
              item.grossWeight || 0
            ),

          cbm:
            Number(
              item.cbm || 0
            ),
        };
      });

    const invoice: ExportCommercialInvoice =
      {
        id:
          initialData?.id ||
          crypto.randomUUID(),

        invoiceNo,

        invoiceDate,

        orderNo:
          orderNo.trim(),

        proformaInvoiceNo:
          proformaInvoiceNo.trim(),

        quotationNo:
          quotationNo.trim(),

        enquiryNo:
          enquiryNo.trim(),

        exporterName:
          exporterName.trim(),

        exporterAddress:
          exporterAddress.trim(),

        exporterCity:
          exporterCity.trim(),

        exporterState:
          exporterState.trim(),

        exporterCountry:
          exporterCountry.trim(),

        exporterIEC:
          exporterIEC.trim(),

        exporterGSTIN:
          exporterGSTIN.trim(),

        exporterPAN:
          exporterPAN.trim(),

        exporterMobile:
          exporterMobile.trim(),

        exporterEmail:
          exporterEmail.trim(),

        exporterWebsite:
          exporterWebsite.trim(),

        customerCode:
          customerCode.trim(),

        customerName:
          customerName.trim(),

        contactPerson:
          contactPerson.trim(),

        buyerAddress:
          buyerAddress.trim(),

        buyerCity:
          buyerCity.trim(),

        buyerStateProvince:
          buyerStateProvince.trim(),

        buyerCountry:
          buyerCountry.trim(),

        buyerPostalCode:
          buyerPostalCode.trim(),

        buyerTaxRegistrationNo:
          buyerTaxRegistrationNo.trim(),

        countryOfOrigin:
          countryOfOrigin.trim(),

        finalDestination:
          finalDestination.trim(),

        portOfLoading:
          portOfLoading.trim(),

        portOfDischarge:
          portOfDischarge.trim(),

        shipmentMode:
          shipmentMode.trim(),

        incoterm:
          incoterm.trim(),

        currency,

        shipmentNo:
          shipmentNo.trim(),

        containerNo:
          containerNo.trim(),

        sealNo:
          sealNo.trim(),

        vesselName:
          vesselName.trim(),

        voyageNo:
          voyageNo.trim(),

        blNo:
          blNo.trim(),

        blDate,

        awbNo:
          awbNo.trim(),

        awbDate,

        items:
          normalizedItems,

        totalPackages,

        totalNetWeight,

        totalGrossWeight,

        totalCBM,

        totalGoodsValue,

        freight:
          Number(freight || 0),

        insurance:
          Number(insurance || 0),

        otherCharges:
          Number(otherCharges || 0),

        totalInvoiceValue,

        exchangeRate:
          Number(
            exchangeRate || 0
          ),

        inrEquivalent,

        paymentTerms:
          paymentTerms.trim(),

        paymentMethod:
          paymentMethod.trim(),

        advanceReceived:
          Number(
            advanceReceived || 0
          ),

        balanceDue,

        bankName:
          bankName.trim(),

        bankBranch:
          bankBranch.trim(),

        bankAccountName:
          bankAccountName.trim(),

        bankAccountNo:
          bankAccountNo.trim(),

        bankIFSC:
          bankIFSC.trim(),

        bankSwiftBic:
          bankSwiftBic.trim(),

        marksNumbers:
          marksNumbers.trim(),

        packingDetails:
          packingDetails.trim(),

        declaration:
          declaration.trim(),

        authorizedSignatory:
          authorizedSignatory.trim(),

        status,

        remarks:
          remarks.trim(),

        createdAt:
          initialData?.createdAt ||
          now,

        updatedAt: now,
      };

    onSave(invoice);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 7px",
    border:
      "1px solid #d1d5db",
    borderRadius: "5px",
    fontSize: "11px",
    background: "#ffffff",
  };

  const readOnlyStyle: React.CSSProperties = {
    ...inputStyle,
    background: "#f3f4f6",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "3px",
    fontSize: "9px",
    fontWeight: 800,
    color: "#374151",
  };

  const sectionStyle: React.CSSProperties = {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    borderRadius: "7px",
    padding: "9px",
    marginBottom: "8px",
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 900,
    color: "#14532d",
    marginBottom: "7px",
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* =====================================================
          COMMERCIAL INVOICE DETAILS
      ====================================================== */}

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          🧾 Export Commercial Invoice
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(6, minmax(0, 1fr))",
            gap: "7px",
          }}
        >
          <div>
            <label style={labelStyle}>
              Invoice No.
            </label>

            <input
              value={invoiceNo}
              readOnly
              style={{
                ...readOnlyStyle,
                fontWeight: 900,
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Invoice Date *
            </label>

            <CommercialDateField
              label="Invoice Date"
              value={invoiceDate}
              onChange={setInvoiceDate}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>
              Source Proforma *
            </label>

            <select
              value={
                sourceProformaNo
              }
              onChange={(e) =>
                handleProformaChange(
                  e.target.value
                )
              }
              disabled={Boolean(
                initialData
              )}
              style={{
                ...inputStyle,
                background:
                  initialData
                    ? "#f3f4f6"
                    : "#ffffff",
              }}
            >
              <option value="">
                Select Proforma
              </option>

              {proformas.map(
                (proforma) => (
                  <option
                    key={
                      proforma.id
                    }
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
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Export Order No.
            </label>

            <input
              value={orderNo}
              onChange={(e) =>
                setOrderNo(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Quotation No.
            </label>

            <input
              value={quotationNo}
              onChange={(e) =>
                setQuotationNo(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Enquiry No.
            </label>

            <input
              value={enquiryNo}
              onChange={(e) =>
                setEnquiryNo(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          EXPORTER
      ====================================================== */}

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          🏢 Exporter / Seller
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(6, minmax(0, 1fr))",
            gap: "7px",
          }}
        >
          <div
            style={{
              gridColumn:
                "span 2",
            }}
          >
            <label style={labelStyle}>
              Exporter Name
            </label>

            <input
              value={
                exporterName
              }
              onChange={(e) =>
                setExporterName(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div
            style={{
              gridColumn:
                "span 2",
            }}
          >
            <label style={labelStyle}>
              Address
            </label>

            <input
              value={
                exporterAddress
              }
              onChange={(e) =>
                setExporterAddress(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              City
            </label>

            <input
              value={
                exporterCity
              }
              onChange={(e) =>
                setExporterCity(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              State
            </label>

            <input
              value={
                exporterState
              }
              onChange={(e) =>
                setExporterState(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Country
            </label>

            <input
              value={
                exporterCountry
              }
              onChange={(e) =>
                setExporterCountry(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              IEC
            </label>

            <input
              value={exporterIEC}
              onChange={(e) =>
                setExporterIEC(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              GSTIN
            </label>

            <input
              value={
                exporterGSTIN
              }
              onChange={(e) =>
                setExporterGSTIN(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              PAN
            </label>

            <input
              value={exporterPAN}
              onChange={(e) =>
                setExporterPAN(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Mobile
            </label>

            <input
              value={
                exporterMobile
              }
              onChange={(e) =>
                setExporterMobile(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Email
            </label>

            <input
              value={
                exporterEmail
              }
              onChange={(e) =>
                setExporterEmail(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div
            style={{
              gridColumn:
                "span 2",
            }}
          >
            <label style={labelStyle}>
              Website
            </label>

            <input
              value={
                exporterWebsite
              }
              onChange={(e) =>
                setExporterWebsite(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          BUYER
      ====================================================== */}

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          👤 Buyer / Consignee
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(6, minmax(0, 1fr))",
            gap: "7px",
          }}
        >
          <div>
            <label style={labelStyle}>
              Customer Code
            </label>

            <input
              value={
                customerCode
              }
              onChange={(e) =>
                setCustomerCode(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div
            style={{
              gridColumn:
                "span 2",
            }}
          >
            <label style={labelStyle}>
              Customer
            </label>

            <input
              value={
                customerName
              }
              onChange={(e) =>
                setCustomerName(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Contact Person
            </label>

            <input
              value={
                contactPerson
              }
              onChange={(e) =>
                setContactPerson(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Country
            </label>

            <input
              value={
                buyerCountry
              }
              onChange={(e) =>
                setBuyerCountry(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Postal Code
            </label>

            <input
              value={
                buyerPostalCode
              }
              onChange={(e) =>
                setBuyerPostalCode(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div
            style={{
              gridColumn:
                "span 2",
            }}
          >
            <label style={labelStyle}>
              Address
            </label>

            <input
              value={
                buyerAddress
              }
              onChange={(e) =>
                setBuyerAddress(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              City
            </label>

            <input
              value={buyerCity}
              onChange={(e) =>
                setBuyerCity(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              State / Province
            </label>

            <input
              value={
                buyerStateProvince
              }
              onChange={(e) =>
                setBuyerStateProvince(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div
            style={{
              gridColumn:
                "span 2",
            }}
          >
            <label style={labelStyle}>
              Tax / Registration No.
            </label>

            <input
              value={
                buyerTaxRegistrationNo
              }
              onChange={(e) =>
                setBuyerTaxRegistrationNo(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          COMMERCIAL / SHIPPING
      ====================================================== */}

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          🚢 Shipping / Commercial Information
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(6, minmax(0, 1fr))",
            gap: "7px",
          }}
        >
          <div>
            <label style={labelStyle}>
              Country of Origin
            </label>

            <input
              value={
                countryOfOrigin
              }
              onChange={(e) =>
                setCountryOfOrigin(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Final Destination
            </label>

            <input
              value={
                finalDestination
              }
              onChange={(e) =>
                setFinalDestination(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Port of Loading
            </label>

            <input
              value={
                portOfLoading
              }
              onChange={(e) =>
                setPortOfLoading(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Port of Discharge
            </label>

            <input
              value={
                portOfDischarge
              }
              onChange={(e) =>
                setPortOfDischarge(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Shipment Mode
            </label>

            <select
              value={
                shipmentMode
              }
              onChange={(e) =>
                setShipmentMode(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                Select
              </option>
              <option>
                Sea
              </option>
              <option>
                Air
              </option>
              <option>
                Road
              </option>
              <option>
                Rail
              </option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Incoterm
            </label>

            <select
              value={incoterm}
              onChange={(e) =>
                setIncoterm(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                Select
              </option>
              <option>
                EXW
              </option>
              <option>
                FCA
              </option>
              <option>
                FOB
              </option>
              <option>
                CFR
              </option>
              <option>
                CIF
              </option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Currency
            </label>

            <select
              value={currency}
              onChange={(e) =>
                setCurrency(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option>
                USD
              </option>
              <option>
                EUR
              </option>
              <option>
                GBP
              </option>
              <option>
                AED
              </option>
              <option>
                SAR
              </option>
              <option>
                INR
              </option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Shipment No.
            </label>

            <input
              value={
                shipmentNo
              }
              onChange={(e) =>
                setShipmentNo(
                  e.target.value
                )
              }
              style={inputStyle}
              placeholder="Optional"
            />
          </div>

          <div>
            <label style={labelStyle}>
              Container No.
            </label>

            <input
              value={
                containerNo
              }
              onChange={(e) =>
                setContainerNo(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Seal No.
            </label>

            <input
              value={sealNo}
              onChange={(e) =>
                setSealNo(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Vessel / Flight
            </label>

            <input
              value={
                vesselName
              }
              onChange={(e) =>
                setVesselName(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Voyage No.
            </label>

            <input
              value={
                voyageNo
              }
              onChange={(e) =>
                setVoyageNo(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              BL No.
            </label>

            <input
              value={blNo}
              onChange={(e) =>
                setBlNo(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              BL Date
            </label>

            <CommercialDateField
              label="BL Date"
              value={blDate}
              onChange={setBlDate}
            />
          </div>

          <div>
            <label style={labelStyle}>
              AWB No.
            </label>

            <input
              value={awbNo}
              onChange={(e) =>
                setAwbNo(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              AWB Date
            </label>

            <CommercialDateField
              label="AWB Date"
              value={awbDate}
              onChange={setAwbDate}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          PRODUCTS
      ====================================================== */}

      <div style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "7px",
          }}
        >
          <div style={sectionTitleStyle}>
            📦 Goods Details
          </div>

          <button
            type="button"
            onClick={addItem}
            style={{
              border: "none",
              borderRadius: "5px",
              padding:
                "6px 9px",
              background:
                "#14532d",
              color:
                "#ffffff",
              cursor:
                "pointer",
              fontSize:
                "10px",
              fontWeight:
                800,
            }}
          >
            + Add Product
          </button>
        </div>

        <div
          style={{
            overflowX:
              "auto",
          }}
        >
          <table
            style={{
              width:
                "100%",
              borderCollapse:
                "collapse",
              minWidth:
                "1850px",
              fontSize:
                "9px",
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#f3f4f6",
                }}
              >
                {[
                  "Product",
                  "HS Code",
                  "Origin",
                  "Qty",
                  "Unit",
                  "Unit Price",
                  "Amount",
                  "Packing",
                  "Packages",
                  "Net KG",
                  "Gross KG",
                  "CBM",
                  "Grade",
                  "Brand",
                  "Specification",
                  "Requirement",
                  "Marks & Numbers",
                  "Action",
                ].map(
                  (heading) => (
                    <th
                      key={
                        heading
                      }
                      style={{
                        padding:
                          "6px 5px",
                        border:
                          "1px solid #e5e7eb",
                        textAlign:
                          "left",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {
                        heading
                      }
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {items.map(
                (
                  item,
                  index
                ) => (
                  <tr
                    key={`${item.productCode}-${index}`}
                  >
                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        value={
                          item.productName
                        }
                        readOnly
                        style={
                          readOnlyStyle
                        }
                      />

                      <div
                        style={{
                          fontSize:
                            "8px",
                          color:
                            "#6b7280",
                          marginTop:
                            "2px",
                        }}
                      >
                        {
                          item.productCode
                        }
                      </div>
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        value={
                          item.hsCode
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              hsCode:
                                e
                                  .target
                                  .value,
                            }
                          )
                        }
                        style={{
                          ...inputStyle,
                          width:
                            "90px",
                        }}
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        value={
                          item.countryOfOrigin
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              countryOfOrigin:
                                e
                                  .target
                                  .value,
                            }
                          )
                        }
                        style={{
                          ...inputStyle,
                          width:
                            "90px",
                        }}
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={
                          item.qty
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              qty:
                                Number(
                                  e
                                    .target
                                    .value
                                ),
                            }
                          )
                        }
                        style={{
                          ...inputStyle,
                          width:
                            "75px",
                        }}
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        value={
                          item.unit
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              unit:
                                e
                                  .target
                                  .value,
                            }
                          )
                        }
                        style={{
                          ...inputStyle,
                          width:
                            "55px",
                        }}
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.unitPrice
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              unitPrice:
                                Number(
                                  e
                                    .target
                                    .value
                                ),
                            }
                          )
                        }
                        style={{
                          ...inputStyle,
                          width:
                            "90px",
                        }}
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                        fontWeight:
                          800,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {Number(
                        item.amount ||
                          0
                      ).toFixed(
                        2
                      )}
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        value={
                          item.packingType
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              packingType:
                                e
                                  .target
                                  .value,
                            }
                          )
                        }
                        style={{
                          ...inputStyle,
                          width:
                            "85px",
                        }}
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          item.packageQty
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              packageQty:
                                Number(
                                  e
                                    .target
                                    .value
                                ),
                            }
                          )
                        }
                        style={{
                          ...inputStyle,
                          width:
                            "65px",
                        }}
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={
                          item.netWeight
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              netWeight:
                                Number(
                                  e
                                    .target
                                    .value
                                ),
                            }
                          )
                        }
                        style={{
                          ...inputStyle,
                          width:
                            "80px",
                        }}
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={
                          item.grossWeight
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              grossWeight:
                                Number(
                                  e
                                    .target
                                    .value
                                ),
                            }
                          )
                        }
                        style={{
                          ...inputStyle,
                          width:
                            "80px",
                        }}
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={
                          item.cbm
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              cbm:
                                Number(
                                  e
                                    .target
                                    .value
                                ),
                            }
                          )
                        }
                        style={{
                          ...inputStyle,
                          width:
                            "70px",
                        }}
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        value={
                          item.grade
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              grade:
                                e
                                  .target
                                  .value,
                            }
                          )
                        }
                        style={
                          inputStyle
                        }
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        value={
                          item.brand
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              brand:
                                e
                                  .target
                                  .value,
                            }
                          )
                        }
                        style={
                          inputStyle
                        }
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        value={
                          item.specification
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              specification:
                                e
                                  .target
                                  .value,
                            }
                          )
                        }
                        style={
                          inputStyle
                        }
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        value={
                          item.customerRequirement
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              customerRequirement:
                                e
                                  .target
                                  .value,
                            }
                          )
                        }
                        style={
                          inputStyle
                        }
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                      }}
                    >
                      <input
                        value={
                          item.marksNumbers
                        }
                        onChange={(
                          e
                        ) =>
                          updateItem(
                            index,
                            {
                              marksNumbers:
                                e
                                  .target
                                  .value,
                            }
                          )
                        }
                        style={
                          inputStyle
                        }
                      />
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        padding:
                          "4px",
                        textAlign:
                          "center",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          removeItem(
                            index
                          )
                        }
                        disabled={
                          items.length ===
                          1
                        }
                        style={{
                          border:
                            "none",
                          borderRadius:
                            "4px",
                          padding:
                            "5px 7px",
                          background:
                            items.length ===
                            1
                              ? "#e5e7eb"
                              : "#fee2e2",
                          color:
                            items.length ===
                            1
                              ? "#9ca3af"
                              : "#b91c1c",
                          cursor:
                            items.length ===
                            1
                              ? "default"
                              : "pointer",
                          fontSize:
                            "9px",
                          fontWeight:
                            800,
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          VALUE SUMMARY
      ====================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1.4fr 1fr",
          gap: "8px",
        }}
      >
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            💰 Value Details
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "7px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Freight
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={freight}
                onChange={(e) =>
                  setFreight(
                    Number(
                      e.target.value
                    )
                  )
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Insurance
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={insurance}
                onChange={(e) =>
                  setInsurance(
                    Number(
                      e.target.value
                    )
                  )
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Other Charges
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={otherCharges}
                onChange={(e) =>
                  setOtherCharges(
                    Number(
                      e.target.value
                    )
                  )
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Exchange Rate
              </label>

              <input
                type="number"
                min="0"
                step="0.0001"
                value={
                  exchangeRate
                }
                onChange={(e) =>
                  setExchangeRate(
                    Number(
                      e.target.value
                    )
                  )
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Currency
              </label>

              <input
                value={currency}
                readOnly
                style={
                  readOnlyStyle
                }
              />
            </div>

            <div>
              <label style={labelStyle}>
                Advance Received
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  advanceReceived
                }
                onChange={(e) =>
                  setAdvanceReceived(
                    Number(
                      e.target.value
                    )
                  )
                }
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            📊 Invoice Summary
          </div>

          <div
            style={{
              display: "grid",
              gap: "5px",
              fontSize: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                Goods Value
              </span>

              <strong>
                {currency}{" "}
                {totalGoodsValue.toFixed(
                  2
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                Freight
              </span>

              <strong>
                {currency}{" "}
                {Number(
                  freight || 0
                ).toFixed(2)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                Insurance
              </span>

              <strong>
                {currency}{" "}
                {Number(
                  insurance || 0
                ).toFixed(2)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                Other Charges
              </span>

              <strong>
                {currency}{" "}
                {Number(
                  otherCharges || 0
                ).toFixed(2)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                borderTop:
                  "1px solid #e5e7eb",
                paddingTop:
                  "5px",
              }}
            >
              <span>
                <strong>
                  Total Invoice Value
                </strong>
              </span>

              <strong>
                {currency}{" "}
                {totalInvoiceValue.toFixed(
                  2
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                INR Equivalent
              </span>

              <strong>
                ₹{" "}
                {inrEquivalent.toFixed(
                  2
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                Balance Due
              </span>

              <strong>
                {currency}{" "}
                {balanceDue.toFixed(
                  2
                )}
              </strong>
            </div>

            <div
              style={{
                borderTop:
                  "1px solid #e5e7eb",
                paddingTop:
                  "5px",
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                Packages / Net / Gross / CBM
              </span>

              <strong>
                {totalPackages} /{" "}
                {totalNetWeight.toFixed(
                  3
                )} /{" "}
                {totalGrossWeight.toFixed(
                  3
                )} /{" "}
                {totalCBM.toFixed(
                  3
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          PAYMENT / BANK
      ====================================================== */}

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          🏦 Payment / Bank Details
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(6, minmax(0, 1fr))",
            gap: "7px",
          }}
        >
          <div>
            <label style={labelStyle}>
              Payment Terms
            </label>

            <input
              value={paymentTerms}
              onChange={(e) =>
                setPaymentTerms(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Payment Method
            </label>

            <input
              value={
                paymentMethod
              }
              onChange={(e) =>
                setPaymentMethod(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Bank Name
            </label>

            <input
              value={bankName}
              onChange={(e) =>
                setBankName(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Bank Branch
            </label>

            <input
              value={
                bankBranch
              }
              onChange={(e) =>
                setBankBranch(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Account Name
            </label>

            <input
              value={
                bankAccountName
              }
              onChange={(e) =>
                setBankAccountName(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Account No.
            </label>

            <input
              value={
                bankAccountNo
              }
              onChange={(e) =>
                setBankAccountNo(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              IFSC
            </label>

            <input
              value={bankIFSC}
              onChange={(e) =>
                setBankIFSC(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              SWIFT / BIC
            </label>

            <input
              value={
                bankSwiftBic
              }
              onChange={(e) =>
                setBankSwiftBic(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          MARKS / PACKING
      ====================================================== */}

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          📦 Packing / Marks & Numbers
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "8px",
          }}
        >
          <div>
            <label style={labelStyle}>
              Marks & Numbers
            </label>

            <textarea
              value={
                marksNumbers
              }
              onChange={(e) =>
                setMarksNumbers(
                  e.target.value
                )
              }
              rows={3}
              style={{
                ...inputStyle,
                resize:
                  "vertical",
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Packing Details
            </label>

            <textarea
              value={
                packingDetails
              }
              onChange={(e) =>
                setPackingDetails(
                  e.target.value
                )
              }
              rows={3}
              style={{
                ...inputStyle,
                resize:
                  "vertical",
              }}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          DECLARATION
      ====================================================== */}

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          📜 Declaration
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "2fr 1fr",
            gap: "8px",
          }}
        >
          <div>
            <label style={labelStyle}>
              Declaration
            </label>

            <textarea
              value={
                declaration
              }
              onChange={(e) =>
                setDeclaration(
                  e.target.value
                )
              }
              rows={3}
              style={{
                ...inputStyle,
                resize:
                  "vertical",
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Authorized Signatory
            </label>

            <input
              value={
                authorizedSignatory
              }
              onChange={(e) =>
                setAuthorizedSignatory(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          STATUS / REMARKS
      ====================================================== */}

      <div style={sectionStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "220px 1fr",
            gap: "8px",
          }}
        >
          <div>
            <label style={labelStyle}>
              Status
            </label>

            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target
                    .value as ExportCommercialInvoiceStatus
                )
              }
              style={inputStyle}
            >
              <option>
                Draft
              </option>

              <option>
                Issued
              </option>

              <option>
                Sent
              </option>

              <option>
                Partially Paid
              </option>

              <option>
                Paid
              </option>

              <option>
                Cancelled
              </option>

              <option>
                Completed
              </option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Remarks
            </label>

            <textarea
              value={remarks}
              onChange={(e) =>
                setRemarks(
                  e.target.value
                )
              }
              rows={2}
              style={{
                ...inputStyle,
                resize:
                  "vertical",
              }}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          ACTIONS
      ====================================================== */}

      <div
        style={{
          display: "flex",
          gap: "7px",
          justifyContent:
            "flex-end",
        }}
      >
        <button
          type="button"
          onClick={resetForm}
          style={{
            border:
              "1px solid #d1d5db",
            borderRadius:
              "5px",
            padding:
              "7px 12px",
            background:
              "#ffffff",
            cursor:
              "pointer",
            fontSize:
              "10px",
            fontWeight:
              800,
          }}
        >
          Reset
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={
              onCancel
            }
            style={{
              border:
                "1px solid #d1d5db",
              borderRadius:
                "5px",
              padding:
                "7px 12px",
              background:
                "#f3f4f6",
              cursor:
                "pointer",
                fontSize:
                "10px",
              fontWeight:
                800,
            }}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          style={{
            border:
              "none",
            borderRadius:
              "5px",
            padding:
              "7px 14px",
            background:
              "#14532d",
            color:
              "#ffffff",
            cursor:
              "pointer",
            fontSize:
              "10px",
            fontWeight:
              900,
          }}
        >
          {initialData
            ? "Update Commercial Invoice"
            : "Save Commercial Invoice"}
        </button>
      </div>
    </form>
  );
}