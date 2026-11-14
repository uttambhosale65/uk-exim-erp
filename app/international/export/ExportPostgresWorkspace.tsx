"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ExportKind = "customers" | "enquiry" | "quotation" | "proforma_invoice" | "order" | "purchase" | "stock" | "reservation" | "packing" | "shipment" | "commercial_invoice";
type ExportRow = Record<string, unknown> & { id: string; code?: string; name?: string; documentNumber?: string; documentDate?: string; status?: string; reviewStatus?: string };

const SETTINGS: Record<ExportKind, { title: string; collection: string; numberField?: string; dateField?: string }> = {
  customers: { title: "Export Customers", collection: "customers" },
  enquiry: { title: "Export Enquiries", collection: "documents", numberField: "enquiryNo", dateField: "enquiryDate" },
  quotation: { title: "Export Quotations", collection: "documents", numberField: "quotationNo", dateField: "quotationDate" },
  proforma_invoice: { title: "Proforma Invoices", collection: "documents", numberField: "proformaInvoiceNo", dateField: "proformaInvoiceDate" },
  order: { title: "Export Orders", collection: "documents", numberField: "exportOrderNo", dateField: "exportOrderDate" },
  purchase: { title: "Export Purchases", collection: "documents", numberField: "purchaseNo", dateField: "purchaseDate" },
  stock: { title: "Export Stock", collection: "stock" },
  reservation: { title: "Reservations", collection: "documents", numberField: "reservationNo", dateField: "reservationDate" },
  packing: { title: "Packing", collection: "documents", numberField: "packingNo", dateField: "packingDate" },
  shipment: { title: "Shipments", collection: "documents", numberField: "shipmentNo", dateField: "shipmentDate" },
  commercial_invoice: { title: "Commercial Invoices", collection: "documents", numberField: "invoiceNo", dateField: "invoiceDate" },
};

const blankRecord = (kind: ExportKind): Record<string, unknown> => {
  if (kind === "customers") return { id: crypto.randomUUID(), code: "", name: "", status: "Active" };
  const settings = SETTINGS[kind];
  if (kind === "stock") return {};
  return {
    id: crypto.randomUUID(), [settings.numberField!]: "", [settings.dateField!]: new Date().toISOString().slice(0, 10),
    currency: "USD", status: "Draft", customerCode: "", items: [],
  };
};

export default function ExportPostgresWorkspace({ kind }: { kind: ExportKind }) {
  const config = SETTINGS[kind];
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [selected, setSelected] = useState<ExportRow | null>(null);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState("");
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [message, setMessage] = useState("");
  const canWrite = kind !== "stock" && (!selected || selected.reviewStatus !== "review_required");
  let editorObject: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(editor) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) editorObject = parsed as Record<string, unknown>;
  } catch { /* The JSON fields remain editable and validation reports the issue on save. */ }

  const updateEditorField = (key: string, value: unknown) => {
    if (!editorObject) return;
    setEditor(JSON.stringify({ ...editorObject, [key]: value }, null, 2));
  };

  const load = useCallback(async (search = query) => {
    setState("loading");
    try {
      const response = await fetch(`/api/export/${kind}?q=${encodeURIComponent(search)}`, { cache: "no-store" });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Export data could not be loaded.");
      const result = payload[config.collection];
      if (!Array.isArray(result)) throw new Error("Export API returned an invalid response.");
      setRows(result as ExportRow[]);
      setState(result.length ? "ready" : "empty");
      setMessage("");
    } catch (error) {
      setRows([]);
      setState("error");
      setMessage(error instanceof Error ? error.message : "Export data could not be loaded.");
    }
  }, [config.collection, kind, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(""); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const beginCreate = () => {
    const record = blankRecord(kind);
    setSelected(null);
    setEditor(JSON.stringify(record, null, 2));
    setMode("create");
    setMessage("");
  };
  const select = async (row: ExportRow) => {
    setMessage("");
    if (kind === "stock") {
      setSelected(row); setEditor(JSON.stringify(row, null, 2)); setMode("view"); return;
    }
    try {
      const response = await fetch(`/api/export/${kind}/${encodeURIComponent(row.id)}`, { cache: "no-store" });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Export detail could not be loaded.");
      const record = payload[kind === "customers" ? "customer" : "document"] as ExportRow;
      setSelected(record);
      setEditor(JSON.stringify(record, null, 2));
      setMode("view");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Export detail could not be loaded."); }
  };
  const save = async () => {
    let record: Record<string, unknown>;
    try { record = JSON.parse(editor) as Record<string, unknown>; }
    catch { setMessage("The record is not valid JSON. Correct it before saving."); return; }
    if (!record || Array.isArray(record) || typeof record !== "object") { setMessage("A JSON object is required."); return; }
    if (mode === "edit" && selected && record.id !== selected.id) { setMessage("Record IDs are immutable."); return; }
    delete record.reviewStatus;
    delete record.documentNumber;
    delete record.documentDate;
    delete record.documentKind;
    try {
      const response = await fetch(mode === "create" ? `/api/export/${kind}` : `/api/export/${kind}/${encodeURIComponent(selected!.id)}`, {
        method: mode === "create" ? "POST" : "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(record),
      });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Export record could not be saved.");
      const saved = payload[kind === "customers" ? "customer" : "document"] as ExportRow;
      setSelected(saved); setEditor(JSON.stringify(saved, null, 2)); setMode("view"); setMessage("Saved to PostgreSQL.");
      window.dispatchEvent(new Event("ukexim:export-data-changed"));
      await load(query);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Export record could not be saved."); }
  };

  const rowLabel = useMemo(() => (row: ExportRow) => kind === "customers"
    ? `${row.code ?? ""} · ${row.name ?? ""}`
    : `${row.documentNumber ?? ""} · ${String(row.documentDate ?? "").slice(0, 10)}`, [kind]);

  return <section style={{ background: "white", borderRadius: 10, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,.07)" }}>
    <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div><h2 style={{ margin: 0, color: "#14532d" }}>🌍 {config.title}</h2><p style={{ color: "#6b7280", fontSize: 12 }}>Company-scoped PostgreSQL records · source fields retained</p></div>
      {kind !== "stock" && <button type="button" onClick={beginCreate}>New record</button>}
    </header>
    {kind === "stock" && <p role="status">Export Stock is read-only in the current API. Domestic stock remains separate.</p>}
    <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, .8fr) minmax(320px, 1.2fr)", gap: 16 }}>
      <div>
        <form onSubmit={(event) => { event.preventDefault(); void load(query); }} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input aria-label="Search export records" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code, document number or fields" style={{ flex: 1, minWidth: 0, padding: 9 }} />
          <button type="submit">Search</button>
        </form>
        {state === "loading" && <p role="status">Loading PostgreSQL records…</p>}
        {state === "empty" && <p role="status">No PostgreSQL {config.title.toLowerCase()} are available.</p>}
        {state === "error" && <p role="alert">{message || "The PostgreSQL request failed."}</p>}
        {state === "ready" && <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 480, overflow: "auto" }}>{rows.map(row => <li key={row.id}>
          <button type="button" onClick={() => void select(row)} style={{ width: "100%", textAlign: "left", padding: 10, marginBottom: 6, border: "1px solid #e5e7eb", borderRadius: 7, background: selected?.id === row.id ? "#f0fdf4" : "white" }}>
            <strong>{rowLabel(row)}</strong><br /><small>{row.status ?? row.reviewStatus ?? ""}{row.reviewStatus === "review_required" ? " · Owner review required" : ""}</small>
          </button>
        </li>)}</ul>}
      </div>
      <div>
        {mode === "view" && selected && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3>Record details</h3>{canWrite && <button type="button" onClick={() => setMode("edit")}>Edit</button>}</div>}
        {(mode === "create" || mode === "edit") && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3>{mode === "create" ? "Create record" : "Edit record"}</h3><div><button type="button" onClick={() => { setMode("view"); if (selected) setEditor(JSON.stringify(selected, null, 2)); }}>Cancel</button> <button type="button" onClick={() => void save()}>Save to PostgreSQL</button></div></div>}
        {mode === "view" && selected && <pre style={{ maxHeight: 480, overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", padding: 12, background: "#f9fafb", borderRadius: 7 }}>{JSON.stringify(selected, null, 2)}</pre>}
        {(mode === "create" || mode === "edit") && editorObject && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, maxHeight: 520, overflow: "auto", padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
          {Object.entries(editorObject).map(([key, value]) => {
            const label = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, character => character.toUpperCase());
            const mutable = key !== "id" && key !== "reviewStatus" && key !== "documentKind";
            if (typeof value === "boolean") return <label key={key} style={{ fontSize: 12, color: "#374151" }}>
              <input aria-label={label} type="checkbox" checked={value} disabled={!mutable} onChange={event => updateEditorField(key, event.target.checked)} /> {label}
            </label>;
            if (value !== null && typeof value === "object") return <label key={key} style={{ gridColumn: "1 / -1", fontSize: 12, color: "#374151" }}>
              {label} (JSON)
              <textarea aria-label={label} readOnly={!mutable} defaultValue={JSON.stringify(value, null, 2)} onBlur={event => {
                if (!mutable) return;
                try { updateEditorField(key, JSON.parse(event.currentTarget.value)); }
                catch { setMessage(`${label} must be valid JSON.`); }
              }} style={{ width: "100%", minHeight: 90, marginTop: 4, boxSizing: "border-box", fontFamily: "monospace", padding: 8 }} />
            </label>;
            const inputType = typeof value === "number" ? "number" : key.toLowerCase().endsWith("date") ? "date" : "text";
            return <label key={key} style={{ fontSize: 12, color: "#374151" }}>{label}
              <input aria-label={label} readOnly={!mutable} type={inputType} step={inputType === "number" ? "any" : undefined}
                value={value === null || value === undefined ? "" : String(value)}
                onChange={event => updateEditorField(key, inputType === "number" && event.target.value !== "" ? Number(event.target.value) : event.target.value)}
                style={{ display: "block", width: "100%", marginTop: 4, padding: 8, boxSizing: "border-box", background: mutable ? "white" : "#f3f4f6" }} />
            </label>;
          })}
        </div>}
        {(mode === "create" || mode === "edit") && !editorObject && <p role="alert">Record editor state is invalid JSON.</p>}
        {!selected && mode === "view" && <p style={{ color: "#6b7280" }}>Select a record or create a new one. Existing source field values are retained in the record payload.</p>}
        {message && <p role="status" style={{ color: message.startsWith("Saved") ? "#166534" : "#b91c1c" }}>{message}</p>}
      </div>
    </div>
    <p style={{ color: "#6b7280", fontSize: 11 }}>No LocalStorage fallback is used. Delete is not enabled for this retained document ledger; records are preserved.</p>
  </section>;
}
