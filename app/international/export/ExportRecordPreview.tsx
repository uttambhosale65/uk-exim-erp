"use client";

import { useMemo } from "react";
import Image from "next/image";

type ExportKind = "customers" | "enquiry" | "quotation" | "proforma_invoice" | "order" | "purchase" | "stock" | "reservation" | "packing" | "shipment" | "commercial_invoice";

const TITLES: Record<ExportKind, string> = {
  customers: "Export Customer Profile",
  enquiry: "Export Enquiry",
  quotation: "Export Quotation",
  proforma_invoice: "Proforma Invoice",
  order: "Export Order / Sales Contract",
  purchase: "Export Purchase Order",
  stock: "Export Stock Record",
  reservation: "Export Reservation",
  packing: "Packing List",
  shipment: "Shipment Record",
  commercial_invoice: "Commercial Invoice",
};

const OMIT = new Set(["id", "reviewStatus", "documentNumber", "documentDate", "documentKind", "sourceRecord"]);
const LABEL_OVERRIDES: Record<string, string> = {
  code: "Export Customer Code", name: "Legal Company Name", country: "Buyer Country", address: "Registered Address",
  contactPerson: "Contact Person", mobile: "Telephone / Mobile", email: "Email", currency: "Currency", incoterm: "Incoterm",
  items: "Product Details", cargoItems: "Cargo Details", sourceRecord: "Original Source Record", hsn: "HS Code",
  hsCode: "HS Code", qty: "Quantity", qtyUnit: "Unit", unitPrice: "Unit Price", amount: "Line Total",
  totalProformaValue: "Total Proforma Value", totalInvoiceValue: "Total Invoice Value", totalPackages: "Total Packages",
  totalNetWeight: "Total Net Weight", totalGrossWeight: "Total Gross Weight", portOfLoading: "Port of Loading",
  portOfDischarge: "Port of Discharge", finalDestination: "Final Destination", customerCode: "Export Customer Code",
  proformaInvoiceNo: "Proforma Invoice Number", invoiceNo: "Commercial Invoice Number", exportOrderNo: "Export Order Number",
  enquiryNo: "Enquiry Number", quotationNo: "Quotation Number", packingNo: "Packing List Number", shipmentNo: "Shipment Reference",
  paymentTerms: "Payment Terms", termsAndConditions: "Terms and Conditions", marksNumbers: "Marks and Numbers",
};

function labelFor(key: string) {
  return LABEL_OVERRIDES[key] ?? key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, value => value.toUpperCase());
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 }).format(value);
  return String(value);
}

function category(key: string) {
  if (/customer|buyer|consignee|notify|importer|exporter|company|contact|email|mobile|phone|address|city|state|country|postal|website|taxregistration|gstin|iec|pan/i.test(key)) return "Parties and contact";
  if (/item|product|cargo|hs(code)?|qty|quantity|unit|price|amount|value|weight|package|cbm|lot|batch|marks/i.test(key)) return "Goods and packages";
  if (/port|destination|incoterm|payment|shipment|vessel|voyage|container|seal|bl|awb|loading|discharge|freight|insurance/i.test(key)) return "Shipment and terms";
  if (/no$|number|date|status|currency|reference|validity|quotation|proforma|order|enquiry|invoice|reservation|packing|shipment/i.test(key)) return "Document details";
  return "Additional business details";
}

function Value({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    if (!value.length) return <span>Not provided</span>;
    const objects = value.every(item => item && typeof item === "object" && !Array.isArray(item));
    if (objects) {
      const columns = Array.from(new Set(value.flatMap(item => Object.keys(item as Record<string, unknown>))));
      return <div className="export-preview-table-wrap"><table className="export-preview-table"><thead><tr>{columns.map(key => <th key={key}>{labelFor(key)}</th>)}</tr></thead><tbody>{value.map((item, index) => <tr key={index}>{columns.map(key => <td key={key}><Value value={(item as Record<string, unknown>)[key]} /></td>)}</tr>)}</tbody></table></div>;
    }
    return <span>{value.map(display).join(", ")}</span>;
  }
  if (value && typeof value === "object") return <dl className="export-preview-nested">{Object.entries(value as Record<string, unknown>).map(([key, child]) => <div key={key}><dt>{labelFor(key)}</dt><dd><Value value={child} /></dd></div>)}</dl>;
  return <span>{display(value)}</span>;
}

export default function ExportRecordPreview({
  kind,
  record,
  unsaved = false,
  onClose,
}: {
  kind: ExportKind;
  record: Record<string, unknown>;
  unsaved?: boolean;
  onClose: () => void;
}) {
  const entries = useMemo(() => Object.entries(record).filter(([key]) => !OMIT.has(key)), [record]);
  const sections = ["Document details", "Parties and contact", "Goods and packages", "Shipment and terms", "Additional business details"]
    .map(title => ({ title, entries: entries.filter(([key]) => category(key) === title) }))
    .filter(section => section.entries.length > 0);
  const reviewStatus = String(record.reviewStatus ?? "");
  const businessStatus = String(record.status ?? "");
  const sourceOnly = reviewStatus === "review_required" || kind === "stock";
  const customerCompanyName = kind === "customers" && typeof record.name === "string"
    ? record.name.trim()
    : "";

  return <div className="export-preview-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="export-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="export-preview-title">
      <div className="export-preview-actions">
        <span>Preview · A4 page layout · {unsaved ? "unsaved draft" : "saved source"}</span>
        <div><button type="button" onClick={() => window.print()}>Print / Save as PDF</button><button type="button" onClick={onClose}>Close</button></div>
      </div>
      <article className="export-preview-sheet export-preview-print-root">
        <header className="export-preview-brand">
          <Image src="/uklogo.png" width={1536} height={741} alt="UK EXIM ENTERPRISES logo" />
          <div><strong>UK EXIM ENTERPRISES</strong><span>UTTAM HALDI</span></div>
        </header>
        {customerCompanyName ? <>
          <h1 id="export-preview-title" className="export-preview-company-title">{customerCompanyName}</h1>
          <p className="export-preview-subtitle">{TITLES[kind]}</p>
        </> : <h1 id="export-preview-title">{TITLES[kind]}</h1>}
        <div className={`export-preview-notice ${sourceOnly ? "is-review" : ""}`} role="status">
          {sourceOnly
            ? "Source record preview only. Authenticity and supporting evidence remain unverified; this is not an issued operational document."
            : unsaved || /draft/i.test(businessStatus)
              ? "Draft preview — not issued. Confirm all commercial and compliance details before approval or external use."
              : `Status: ${businessStatus || "not provided"}. This preview reproduces saved source fields and does not certify external filing or issuance.`}
        </div>
        <div className="export-preview-meta">
          <span><b>Document / Customer Code</b>{display(record.documentNumber ?? record.code ?? record.id)}</span>
          <span><b>Date</b>{display(record.documentDate ?? record.date ?? record.invoiceDate ?? record.proformaInvoiceDate ?? record.enquiryDate ?? record.quotationDate ?? record.exportOrderDate ?? record.packingDate ?? record.shipmentDate)}</span>
          <span><b>Currency</b>{display(record.currency)}</span>
          <span><b>Business status</b>{display(businessStatus)}</span>
        </div>
        {sections.map(section => <section className="export-preview-section" key={section.title}>
          <h2>{section.title}</h2>
          <dl className="export-preview-fields">{section.entries.map(([key, value]) => <div key={key} className={Array.isArray(value) || (value && typeof value === "object") ? "wide" : ""}><dt>{labelFor(key)}</dt><dd><Value value={value} /></dd></div>)}</dl>
        </section>)}
        <footer className="export-preview-footer"><span>UK EXIM ENTERPRISES · Export document preview</span><span>Supporting statutory and destination requirements must be verified for this shipment.</span></footer>
      </article>
      <style>{`
        .export-preview-overlay{position:fixed;inset:0;z-index:10000;display:grid;grid-template-rows:auto minmax(0,1fr);justify-items:center;background:rgba(12,24,34,.68);padding:14px;overflow:auto}
        .export-preview-dialog{width:min(100%,920px);display:contents}
        .export-preview-actions{position:sticky;top:0;z-index:1;width:min(100%,920px);display:flex;justify-content:space-between;align-items:center;gap:12px;background:#102537;color:#fff;padding:10px 14px;border-radius:10px 10px 0 0;font:600 12px Arial,sans-serif}
        .export-preview-actions div{display:flex;gap:8px}.export-preview-actions button{border:1px solid #cbd5e1;border-radius:6px;padding:7px 10px;background:#fff;color:#17344a;font:600 12px Arial,sans-serif;cursor:pointer}
        .export-preview-sheet{box-sizing:border-box;width:min(100%,920px);min-height:700px;background:#fff;color:#1f2937;padding:34px 38px;box-shadow:0 8px 28px #0003;font:12px/1.45 Arial,Helvetica,sans-serif}
        .export-preview-brand{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #14532d;padding-bottom:12px;margin-bottom:18px}.export-preview-brand img{display:block;max-width:62mm;max-height:20mm;width:auto;height:auto;object-fit:contain}.export-preview-brand div{display:grid;text-align:right;color:#17344a;letter-spacing:.12em}.export-preview-brand span{color:#15803d;font-weight:700;margin-top:4px}
        .export-preview-sheet h1{font-size:20px;letter-spacing:.05em;text-align:center;color:#13324a;margin:16px 0}.export-preview-notice{border:1px solid #bbf7d0;border-radius:5px;background:#f0fdf4;color:#166534;padding:8px 10px;margin:12px 0}.export-preview-notice.is-review{border-color:#fcd34d;background:#fffbeb;color:#854d0e}
        .export-preview-sheet h1.export-preview-company-title{font-size:25px;font-weight:800;letter-spacing:.02em;line-height:1.25;overflow-wrap:anywhere;margin:20px 0 4px}.export-preview-subtitle{text-align:center;color:#526576;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin:0 0 16px}
        .export-preview-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:12px 0 18px}.export-preview-meta span{border:1px solid #dbe3e8;border-radius:5px;padding:7px;overflow-wrap:anywhere}.export-preview-meta b{display:block;color:#64748b;font-size:9px;text-transform:uppercase;margin-bottom:3px}
        .export-preview-section{margin:15px 0;break-inside:avoid}.export-preview-section h2{font-size:12px;color:#14532d;border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin:0 0 8px}.export-preview-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px;margin:0}.export-preview-fields>div{padding:5px 0;border-bottom:1px solid #eef2f4;min-width:0;overflow-wrap:anywhere}.export-preview-fields>div.wide{grid-column:1/-1}.export-preview-fields dt,.export-preview-nested dt{font-size:9px;color:#64748b;font-weight:700}.export-preview-fields dd,.export-preview-nested dd{margin:2px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}.export-preview-nested{margin:0}.export-preview-nested>div{padding:3px 0}.export-preview-table-wrap{max-width:100%;overflow-x:auto}.export-preview-table{width:100%;border-collapse:collapse;font-size:9px}.export-preview-table th,.export-preview-table td{border:1px solid #cbd5e1;padding:5px;text-align:left;vertical-align:top;overflow-wrap:anywhere}.export-preview-table th{background:#f1f5f9;color:#334155}.export-preview-footer{display:flex;justify-content:space-between;gap:14px;border-top:1px solid #cbd5e1;padding-top:9px;margin-top:22px;color:#64748b;font-size:9px}
        @media(max-width:700px){.export-preview-overlay{padding:0}.export-preview-actions{border-radius:0;flex-wrap:wrap}.export-preview-sheet{padding:20px 16px;min-height:calc(100vh - 80px)}.export-preview-meta{grid-template-columns:repeat(2,minmax(0,1fr))}.export-preview-fields{grid-template-columns:1fr}.export-preview-footer{flex-direction:column}}
        @media print{@page{size:A4 portrait;margin:12mm}.export-preview-overlay{position:static;display:block;padding:0;background:#fff;overflow:visible}.export-preview-actions{display:none!important}body *{visibility:hidden!important}.export-preview-print-root,.export-preview-print-root *{visibility:visible!important}.export-preview-print-root{position:absolute;left:0;top:0;width:100%;min-height:0;padding:0;box-shadow:none;color:#111827}.export-preview-section{break-inside:avoid}.export-preview-table thead{display:table-header-group}.export-preview-table tr{break-inside:avoid}.export-preview-footer{position:static}}
      `}</style>
    </section>
  </div>;
}
