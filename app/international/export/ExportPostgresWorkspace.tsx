"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HEURISTIC_CUSTOMER_CODES, HEURISTIC_DOCUMENT_IDS } from "./review-flags.mjs";
import ExportRecordPreview from "./ExportRecordPreview";

type ExportKind = "customers" | "enquiry" | "quotation" | "proforma_invoice" | "order" | "purchase" | "stock" | "reservation" | "packing" | "shipment" | "commercial_invoice";
type ExportRow = Record<string, unknown> & { id: string; code?: string; name?: string; documentNumber?: string; documentDate?: string; status?: string; reviewStatus?: string; sourceRecord?: Record<string, unknown> };
type LoadState = "loading" | "ready" | "empty" | "error";

const SETTINGS: Record<ExportKind, { title: string; collection: "customers" | "documents" | "stock"; numberField?: string; dateField?: string }> = {
  customers: { title: "Export Customer Master", collection: "customers" },
  enquiry: { title: "Export Enquiries", collection: "documents", numberField: "enquiryNo", dateField: "enquiryDate" },
  quotation: { title: "Export Quotations", collection: "documents", numberField: "quotationNo", dateField: "quotationDate" },
  proforma_invoice: { title: "Proforma Invoices", collection: "documents", numberField: "proformaInvoiceNo", dateField: "proformaInvoiceDate" },
  order: { title: "Export Orders", collection: "documents", numberField: "exportOrderNo", dateField: "exportOrderDate" },
  purchase: { title: "Export Purchases", collection: "documents", numberField: "purchaseNo", dateField: "purchaseDate" },
  stock: { title: "Export Stock", collection: "stock" },
  reservation: { title: "Export Reservations", collection: "documents", numberField: "reservationNo", dateField: "reservationDate" },
  packing: { title: "Export Packing", collection: "documents", numberField: "packingNo", dateField: "packingDate" },
  shipment: { title: "Export Shipments", collection: "documents", numberField: "shipmentNo", dateField: "shipmentDate" },
  commercial_invoice: { title: "Commercial Invoices", collection: "documents", numberField: "invoiceNo", dateField: "invoiceDate" },
};

const SYSTEM_FIELDS = new Set(["id", "reviewStatus", "documentNumber", "documentDate", "documentKind", "sourceRecord"]);
const LABELS: Record<string, string> = {
  code: "Export Customer Code", name: "Company Name", contactPerson: "Contact Person", mobile: "Phone / Mobile",
  country: "Country", stateProvince: "State / Province", postalCode: "Postal Code", taxRegistrationNo: "Tax Registration Number",
  tradeName: "Trade Name", designation: "Designation", telephone: "Telephone", whatsapp: "WhatsApp", alternateContact: "Alternate Contact",
  businessRole: "Buyer Type", importerRegistration: "Importer Registration / Tax Reference", interestedProducts: "Product Interest",
  productInterest: "Product Interest", destinationCountry: "Country of Destination", orderHistory: "Order / Enquiry History",
  verificationStatus: "Verification Status", verificationEvidence: "Verification Evidence", reviewRemarks: "Review Remarks", notes: "Notes",
  enquiryNo: "Enquiry Number", quotationNo: "Quotation Number", proformaInvoiceNo: "Proforma Invoice Number", exportOrderNo: "Export Order Number",
  purchaseNo: "Export Purchase Number", reservationNo: "Reservation Number", packingNo: "Packing Reference", shipmentNo: "Shipment Reference",
  invoiceNo: "Commercial Invoice Number", customerCode: "Export Customer Code", currency: "Currency", incoterm: "Incoterm",
  items: "Product Items", cargoItems: "Cargo Items", termsAndConditions: "Terms and Conditions", sourceRecord: "Original Source Record",
  portOfLoading: "Port of Loading", portOfDischarge: "Port of Discharge", finalDestination: "Final Destination", paymentTerms: "Payment Terms",
  estimatedShipmentDate: "Estimated Shipment Date", totalNetWeight: "Total Net Weight", totalGrossWeight: "Total Gross Weight", totalCBM: "Total CBM",
  availableQty: "Available Quantity", reservedQty: "Reserved Quantity", packedQty: "Packed Quantity", loadedQty: "Loaded Quantity", shippedQty: "Shipped Quantity",
};
const controlStyle: React.CSSProperties = { padding: "8px 10px", border: "1px solid #d7e1e7", borderRadius: 7, background: "#fff", color: "#243746", font: "inherit" };
const cardStyle: React.CSSProperties = { padding: 11, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", minWidth: 0 };

function labelFor(key: string) {
  return LABELS[key] ?? key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, character => character.toUpperCase());
}

function emptyValue(value: unknown): unknown {
  if (Array.isArray(value)) return [];
  if (typeof value === "number") return null;
  if (typeof value === "boolean") return false;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, emptyValue(child)]));
  return "";
}

function setAtPath(root: Record<string, unknown>, path: Array<string | number>, value: unknown): Record<string, unknown> {
  const [head, ...tail] = path;
  if (head === undefined) return root;
  const clone = Array.isArray(root) ? [...root] : { ...root };
  if (!tail.length) (clone as Record<string | number, unknown>)[head] = value;
  else (clone as Record<string | number, unknown>)[head] = setAtPath(((clone as Record<string | number, unknown>)[head] ?? (typeof tail[0] === "number" ? [] : {})) as Record<string, unknown>, tail, value);
  return clone as Record<string, unknown>;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(value);
  return String(value);
}

function reviewFlag(kind: ExportKind, row: ExportRow) {
  return kind === "customers" ? HEURISTIC_CUSTOMER_CODES.includes(String(row.code ?? "")) : HEURISTIC_DOCUMENT_IDS.includes(row.id);
}

function createRecord(kind: ExportKind, rows: ExportRow[]): Record<string, unknown> {
  const sample = rows[0] ?? {};
  const record = Object.fromEntries(Object.entries(sample).filter(([key]) => !SYSTEM_FIELDS.has(key)).map(([key, value]) => [key, emptyValue(value)]));
  record.id = crypto.randomUUID();
  if (kind === "customers") { record.code = ""; record.name = ""; record.status = "Active"; }
  else {
    const settings = SETTINGS[kind];
    if (settings.numberField) record[settings.numberField] = "";
    if (settings.dateField) record[settings.dateField] = "";
    record.currency = typeof record.currency === "string" ? record.currency : "";
    record.status = "Draft";
  }
  return record;
}

export default function ExportPostgresWorkspace({ kind }: { kind: ExportKind }) {
  const config = SETTINGS[kind];
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [selected, setSelected] = useState<ExportRow | null>(null);
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const canWrite = kind === "customers"
    ? !selected || selected.reviewStatus === "owner_verified"
    : kind !== "stock" && (!selected || (selected.reviewStatus === "owner_verified" && /^draft$/i.test(String(selected.status ?? ""))));

  const load = useCallback(async (search = query) => {
    setState("loading"); setMessage("");
    try {
      const response = await fetch(`/api/export/${kind}?q=${encodeURIComponent(search)}&limit=200&offset=0`, { cache: "no-store", credentials: "same-origin" });
      if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) throw new Error(`Export API returned ${response.status} with a non-JSON response.`);
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Export data could not be loaded.");
      const result = payload[config.collection];
      if (!Array.isArray(result)) throw new Error("Export API returned an invalid records list.");
      setRows(result as ExportRow[]); setState(result.length ? "ready" : "empty");
    } catch (error) { setRows([]); setState("error"); setMessage(error instanceof Error ? error.message : "Export data could not be loaded."); }
  }, [config.collection, kind, query]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(""); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const select = async (row: ExportRow) => {
    setMessage(""); setForm(null);
    if (kind === "stock") { setSelected(row); setMode("view"); return; }
    try {
      const response = await fetch(`/api/export/${kind}/${encodeURIComponent(row.id)}`, { cache: "no-store", credentials: "same-origin" });
      if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) throw new Error(`Export detail API returned ${response.status} with a non-JSON response.`);
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Export detail could not be loaded.");
      const record = payload[kind === "customers" ? "customer" : "document"] as ExportRow;
      if (!record || typeof record !== "object") throw new Error("Export detail API returned an invalid record.");
      setSelected(record); setMode("view");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Export detail could not be loaded."); }
  };

  const beginCreate = () => { setSelected(null); setForm(createRecord(kind, rows)); setMode("create"); setMessage(""); };
  const beginEdit = () => { if (!selected || !canWrite) return; const record = { ...selected }; delete record.sourceRecord; setForm(structuredClone(record)); setMode("edit"); setMessage(""); };
  const cancelEdit = () => { setForm(null); setMode("view"); setMessage(""); };
  const update = (path: Array<string | number>, value: unknown) => setForm(current => current ? setAtPath(current, path, value) : current);

  const save = async () => {
    if (!form) return;
    const record = { ...form };
    delete record.reviewStatus; delete record.documentNumber; delete record.documentDate; delete record.documentKind; delete record.sourceRecord;
    if (mode === "edit" && selected && record.id !== selected.id) { setMessage("Record IDs cannot be changed."); return; }
    try {
      const response = await fetch(mode === "create" ? `/api/export/${kind}` : `/api/export/${kind}/${encodeURIComponent(selected!.id)}`, {
        method: mode === "create" ? "POST" : "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(record), credentials: "same-origin",
      });
      if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) throw new Error(`Export save API returned ${response.status} with a non-JSON response.`);
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Export record could not be saved.");
      const saved = payload[kind === "customers" ? "customer" : "document"] as ExportRow;
      setSelected(saved); setForm(null); setMode("view"); setMessage("Saved to PostgreSQL.");
      window.dispatchEvent(new Event("ukexim:export-data-changed"));
      await load(query);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Export record could not be saved."); }
  };

  const approveForOperations = async () => {
    if (!selected || kind === "stock" || selected.reviewStatus !== "review_required") return;
    const explanation = selectedReviewFlag
      ? "This record is held as non-operational and matched a source placeholder heuristic. Confirm that you reviewed the source and supporting evidence and approve this record for Export operations?"
      : "This preserved source record has not been verified. Confirm that you reviewed its authenticity and supporting evidence and approve it for Export operations?";
    if (!window.confirm(explanation)) return;
    try {
      const response = await fetch(`/api/export/${kind}/${encodeURIComponent(selected.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ reviewStatus: "owner_verified" }), credentials: "same-origin" });
      if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) throw new Error(`Export review API returned ${response.status} with a non-JSON response.`);
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Export review status could not be changed.");
      const saved = payload[kind === "customers" ? "customer" : "document"] as ExportRow;
      setSelected(saved); setMessage("Owner verification recorded; the record is now eligible for operational references.");
      await load(query);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Export review status could not be changed."); }
  };

  const records = useMemo(() => rows.map(row => ({ ...row, label: kind === "customers" ? `${row.code ?? ""} · ${row.name ?? ""}` : `${row.documentNumber ?? row[config.numberField ?? ""] ?? ""} · ${String(row.documentDate ?? row[config.dateField ?? ""] ?? "").slice(0, 10)}` })), [config.dateField, config.numberField, kind, rows]);
  const selectedReviewFlag = selected ? reviewFlag(kind, selected) : false;

  function renderValue(value: unknown, path: Array<string | number>, editable: boolean, depth = 0): React.ReactNode {
    if (Array.isArray(value)) {
      if (!value.length) return editable ? <button type="button" style={controlStyle} onClick={() => update(path, [/terms|documents|certificates|marks/i.test(String(path.at(-1))) ? "" : {}])}>Add first item</button> : <span>—</span>;
      const objectRows = value.every(item => item && typeof item === "object" && !Array.isArray(item));
      return <div style={{ display: "grid", gap: 8, width: "100%" }}>
        {value.map((item, index) => <fieldset key={index} style={{ border: "1px solid #dce5e9", borderRadius: 8, padding: 10, minWidth: 0 }}>
          <legend style={{ padding: "0 5px", color: "#49616f", fontSize: 12, fontWeight: 700 }}>{objectRows ? `Item ${index + 1}` : `${labelFor(String(path.at(-1) ?? "Entry"))} ${index + 1}`}</legend>
          {objectRows ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8 }}>{Object.entries(item as Record<string, unknown>).map(([key, child]) => <label key={key} style={{ display: "grid", gap: 4, color: "#4c5d68", fontSize: 11 }}>{labelFor(key)}{renderValue(child, [...path, index, key], editable, depth + 1)}</label>)}</div>
            : renderValue(item, [...path, index], editable, depth + 1)}
          {editable && <button type="button" style={{ ...controlStyle, marginTop: 8 }} onClick={() => update(path, value.filter((_, itemIndex) => itemIndex !== index))}>Remove item</button>}
        </fieldset>)}
        {editable && <button type="button" style={controlStyle} onClick={() => update(path, [...value, objectRows ? emptyValue(value[0]) : ""])}>Add item</button>}
      </div>;
    }
    if (value && typeof value === "object") return <fieldset style={{ border: "1px solid #dce5e9", borderRadius: 8, padding: 10, minWidth: 0 }}><legend style={{ padding: "0 5px", color: "#49616f", fontSize: 12, fontWeight: 700 }}>{labelFor(String(path.at(-1) ?? "Details"))}</legend><div style={{ display: "grid", gap: 8 }}>{Object.entries(value as Record<string, unknown>).map(([key, child]) => <label key={key} style={{ display: "grid", gap: 4, color: "#4c5d68", fontSize: 11 }}>{labelFor(key)}{renderValue(child, [...path, key], editable, depth + 1)}</label>)}</div></fieldset>;
    if (typeof value === "boolean") return editable ? <input aria-label={labelFor(String(path.at(-1)))} type="checkbox" checked={value} onChange={event => update(path, event.target.checked)} /> : <span>{displayValue(value)}</span>;
    if (!editable) return <span style={{ color: "#233746", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{displayValue(value)}</span>;
    if (typeof value === "number" || (value === null && /amount|value|rate|price|qty|quantity|weight|packages|cbm|charges|freight|insurance|discount|advance|balance|exchange/i.test(String(path.at(-1))))) {
      return <input aria-label={labelFor(String(path.at(-1)))} type="number" step="any" value={value === null ? "" : String(value)} onChange={event => update(path, event.target.value === "" ? null : Number(event.target.value))} style={{ ...controlStyle, width: "100%", boxSizing: "border-box" }} />;
    }
    const textValue = value === null || value === undefined ? "" : String(value);
    const multiline = textValue.length > 90 || /address|remarks|declaration|terms|description|note/i.test(String(path.at(-1)));
    const inputType = /date$/i.test(String(path.at(-1))) ? "date" : "text";
    return multiline ? <textarea aria-label={labelFor(String(path.at(-1)))} value={textValue} onChange={event => update(path, event.target.value)} rows={3} style={{ ...controlStyle, width: "100%", boxSizing: "border-box", resize: "vertical" }} />
      : <input aria-label={labelFor(String(path.at(-1)))} type={inputType} value={textValue} onChange={event => update(path, event.target.value)} style={{ ...controlStyle, width: "100%", boxSizing: "border-box" }} />;
  }

  const fields = mode === "view" ? selected : form;
  const businessFields = fields ? Object.entries(fields).filter(([key]) => !SYSTEM_FIELDS.has(key)) : [];
  const groups = [
    ...(kind === "customers" ? [
      { title: "Company information", matches: /code|name|tradeName|businessRole|industry|country|address|city|stateProvince|postalCode|website|taxRegistrationNo|importerRegistration/i },
      { title: "Contact information", matches: /contactPerson|designation|email|mobile|telephone|whatsapp|alternateContact|phone/i },
      { title: "Commercial information", matches: /currency|incoterm|paymentTerms|interestedProducts|productInterest|destinationCountry|orderHistory|remarks|notes/i },
      { title: "Source review", matches: /sourceEvent|verification|reviewRemarks/i },
    ] : [
      { title: "Business identity and parties", matches: /code|name|buyer|customer|supplier|contact|email|mobile|phone|website|address|city|state|country|postal|taxregistration|iec|gstin|pan/i },
      { title: "Document and relationship details", matches: /no$|number|date|status|currency|quotation|proforma|order|enquiry|invoice|reservation|packing|shipment|reference|validity/i },
      { title: "Products, quantities and values", matches: /item|product|qty|quantity|weight|package|cbm|value|amount|rate|price|cost|freight|insurance|charges|discount|advance|balance/i },
      { title: "Delivery, shipping and terms", matches: /port|destination|incoterm|payment|shipmentmode|vessel|voyage|container|seal|bl|awb|booking|etd|eta|loading|discharge|terms|certificate|document/i },
    ]),
  ];
  const grouped = groups.map(group => ({ ...group, entries: businessFields.filter(([key]) => group.matches.test(key)) }));
  const otherEntries = businessFields.filter(([key]) => !groups.some(group => group.matches.test(key)));
  const previewRecord = fields ? { ...fields, ...(selected?.reviewStatus ? { reviewStatus: selected.reviewStatus } : {}) } : null;

  return <section className="export-workspace" style={{ background: "#fff", borderRadius: 11, padding: 16, boxShadow: "0 3px 12px rgba(15,35,50,.08)", border: "1px solid #e2e8f0", color: "#233746" }}>
    <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
      <div><h2 style={{ margin: 0, color: "#14532d", fontSize: 21 }}>🌍 {config.title}</h2><p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>Authenticated, company-scoped PostgreSQL records · Export remains separate from Domestic business</p></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{kind === "stock" ? <span style={{ ...controlStyle, background: "#f8fafc" }}>Read-only stock register</span> : <button type="button" style={{ ...controlStyle, background: "#14532d", color: "white", borderColor: "#14532d" }} onClick={beginCreate}>＋ New record</button>}</div>
    </header>
    {kind === "stock" && <p role="status" style={{ padding: 10, borderRadius: 7, background: "#f0fdf4", color: "#166534", fontSize: 12 }}>Export stock is isolated from Domestic stock and read-only in the current API. No stock quantities can be changed here.</p>}
    <div className="export-workspace-grid" style={{ display: "grid", gridTemplateColumns: "minmax(270px,.72fr) minmax(0,1.28fr)", gap: 16, alignItems: "start" }}>
      <aside style={{ minWidth: 0, border: "1px solid #e2e8f0", borderRadius: 9, padding: 10, background: "#f8fafc" }}>
        <form onSubmit={event => { event.preventDefault(); void load(query); }} style={{ display: "flex", gap: 7, marginBottom: 10 }}><input aria-label="Search export records" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search code, document number or fields" style={{ ...controlStyle, flex: 1, minWidth: 0 }} /><button type="submit" style={controlStyle}>Search</button></form>
        {state === "loading" && <p role="status">Loading PostgreSQL records…</p>}
        {state === "empty" && <p role="status">No PostgreSQL {config.title.toLowerCase()} are available.</p>}
        {state === "error" && <p role="alert">{message || "Export records could not be loaded."} <button type="button" onClick={() => void load(query)}>Retry</button></p>}
        {state === "ready" && <ul aria-label={config.title} style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: "min(68vh,720px)", overflow: "auto", display: "grid", gap: 6 }}>{records.map(row => {
          const flag = reviewFlag(kind, row);
          return <li key={row.id}><button type="button" onClick={() => void select(row)} aria-current={selected?.id === row.id ? "true" : undefined} style={{ width: "100%", textAlign: "left", padding: 10, border: `1px solid ${selected?.id === row.id ? "#16a34a" : "#dce5e9"}`, borderRadius: 8, background: selected?.id === row.id ? "#f0fdf4" : "#fff", color: "#233746" }}>
            <strong style={{ display: "block", overflowWrap: "anywhere", fontSize: 13 }}>{row.label}</strong>
            <span style={{ display: "block", color: "#64748b", fontSize: 11, marginTop: 4 }}>{row.status ?? ""}{row.reviewStatus === "review_required" ? " · Non-operational: owner verification pending" : row.reviewStatus === "owner_verified" ? " · Owner verified" : ""}</span>
            {row.reviewStatus === "review_required" && <span style={{ display: "block", color: flag ? "#9a3412" : "#64748b", fontSize: 10, marginTop: 3 }}>{flag ? "Source heuristic flag: yes (requires owner review)" : "Source heuristic flag: no · authenticity still unverified"}</span>}
          </button></li>;
        })}</ul>}
      </aside>

      <main style={{ minWidth: 0, border: "1px solid #e2e8f0", borderRadius: 9, padding: 13, background: "#fff", minHeight: 280 }}>
        {message && <p role="status" style={{ padding: 9, borderRadius: 7, background: message.startsWith("Saved") ? "#f0fdf4" : "#fef2f2", color: message.startsWith("Saved") ? "#166534" : "#991b1b" }}>{message}</p>}
        {mode === "view" && selected && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10, flexWrap: "wrap" }}><div><h3 style={{ margin: 0, color: "#15364b" }}>{kind === "customers" ? `${selected.code ?? ""} · ${selected.name ?? ""}` : String(selected.documentNumber ?? selected[config.numberField ?? ""] ?? config.title)}</h3><p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>{selected.status ?? ""}{selected.documentDate ?? selected[config.dateField ?? ""] ? ` · ${String(selected.documentDate ?? selected[config.dateField ?? ""]).slice(0, 10)}` : ""}</p></div><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{kind !== "stock" && <button type="button" style={controlStyle} onClick={() => setPreviewOpen(true)}>{kind === "customers" ? "Preview Profile / Print" : "Preview / Print"}</button>}{selected.reviewStatus === "review_required" && kind !== "stock" && <button type="button" style={{ ...controlStyle, color: "#854d0e", borderColor: "#d6b262", background: "#fffbeb" }} onClick={() => void approveForOperations()}>Approve after review</button>}{canWrite && selected.reviewStatus !== "review_required" && <button type="button" style={controlStyle} onClick={beginEdit}>Edit record</button>}</div></div>
          {selected.reviewStatus === "review_required" && <div role="status" style={{ marginTop: 10, padding: 10, borderRadius: 7, background: "#fffbeb", color: "#854d0e", fontSize: 12 }}><strong>Non-operational review hold.</strong> This record is preserved from the original source but is not approved for export operations. {selectedReviewFlag ? "It also matched a source placeholder heuristic and needs specific owner review." : "It did not match the identified placeholder heuristic; authenticity is still unverified."}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8, marginTop: 12 }}>{businessFields.map(([key, value]) => <div key={key} style={cardStyle}><div style={{ color: "#64748b", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{labelFor(key)}</div><div style={{ fontSize: 12, lineHeight: 1.45 }}>{renderValue(value, [key], false)}</div></div>)}</div>
          {selected.sourceRecord && <details style={{ marginTop: 12, border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}><summary style={{ cursor: "pointer", color: "#475569", fontSize: 12, fontWeight: 700 }}>Administrative audit view · original source_record</summary><pre style={{ maxHeight: 360, overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 11, background: "#f8fafc", padding: 10, borderRadius: 6 }}>{JSON.stringify(selected.sourceRecord, null, 2)}</pre></details>}
        </>}

        {(mode === "create" || mode === "edit") && form && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><div><h3 style={{ margin: 0, color: "#15364b" }}>{mode === "create" ? `New ${kind === "customers" ? "Export Customer" : config.title.replace(/^Export /, "")}` : "Edit Export Record"}</h3><p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 11 }}>Fields are based on the saved source record structure; original unedited fields remain in the payload.</p></div><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button type="button" style={controlStyle} onClick={() => setPreviewOpen(true)}>Preview / Print</button><button type="button" style={controlStyle} onClick={cancelEdit}>Cancel</button><button type="button" style={{ ...controlStyle, background: "#14532d", color: "#fff", borderColor: "#14532d" }} onClick={() => void save()}>{kind === "customers" ? "Save Customer" : "Save Draft to PostgreSQL"}</button></div></div>
          <div style={{ display: "grid", gap: 12, marginTop: 12, maxHeight: "min(68vh,760px)", overflow: "auto", paddingRight: 4 }}>
            {grouped.filter(group => group.entries.length).map(group => <fieldset key={group.title} style={{ border: "1px solid #dbe5e9", borderRadius: 9, padding: 11, minWidth: 0 }}><legend style={{ padding: "0 6px", color: "#14532d", fontSize: 12, fontWeight: 800 }}>{group.title}</legend><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 9 }}>{group.entries.map(([key, value]) => <label key={key} style={{ display: "grid", gap: 4, color: "#51636e", fontSize: 11, minWidth: 0 }}>{labelFor(key)}{key === "id" ? <span>{displayValue(value)}</span> : renderValue(value, [key], true)}</label>)}</div></fieldset>)}
            {otherEntries.length > 0 && <fieldset style={{ border: "1px solid #dbe5e9", borderRadius: 9, padding: 11, minWidth: 0 }}><legend style={{ padding: "0 6px", color: "#14532d", fontSize: 12, fontWeight: 800 }}>Other preserved source fields</legend><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 9 }}>{otherEntries.map(([key, value]) => <label key={key} style={{ display: "grid", gap: 4, color: "#51636e", fontSize: 11, minWidth: 0 }}>{labelFor(key)}{renderValue(value, [key], true)}</label>)}</div></fieldset>}
          </div>
        </>}
        {!selected && mode === "view" && <div style={{ minHeight: 250, display: "grid", placeContent: "center", textAlign: "center", color: "#64748b" }}><strong style={{ color: "#334155" }}>Select a record</strong><span style={{ fontSize: 12, marginTop: 5 }}>Business details will appear here.</span></div>}
      </main>
    </div>
    <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 10 }}>No LocalStorage fallback is used. Existing records are retained; delete is intentionally unavailable.</p>
    <style>{`.export-workspace input:focus,.export-workspace textarea:focus,.export-workspace button:focus-visible{outline:2px solid #16a34a;outline-offset:1px}.export-workspace button{cursor:pointer}.export-workspace fieldset{box-sizing:border-box}@media(max-width:850px){.export-workspace-grid{grid-template-columns:minmax(0,1fr)!important}.export-workspace aside ul{max-height:35vh!important}}`}</style>
    {previewOpen && previewRecord && kind !== "stock" && <ExportRecordPreview kind={kind} record={previewRecord} unsaved={mode !== "view"} onClose={() => setPreviewOpen(false)} />}
  </section>;
}
