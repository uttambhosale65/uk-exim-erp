"use client";

import { useCallback, useEffect, useState } from "react";
import SupplierForm from "./SupplierForm";
import SupplierTable from "./SupplierTable";
import { Supplier } from "./SupplierTypes";

type SupplierListResponse = { suppliers: Supplier[]; nextCode: string };

async function readJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "(missing content-type)";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`Supplier API returned ${contentType} (HTTP ${response.status}); expected JSON.`);
  }
  try {
    return await response.json() as T;
  } catch {
    throw new Error(`Supplier API returned invalid JSON (HTTP ${response.status}).`);
  }
}

async function readError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "(missing content-type)";
  if (!contentType.toLowerCase().includes("application/json")) {
    return `Supplier API returned ${contentType} (HTTP ${response.status}); expected a JSON error response.`;
  }
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : `The supplier request failed (HTTP ${response.status}).`;
}

function inputPayload(supplier: Supplier) {
  return Object.fromEntries(Object.entries(supplier).filter(([field]) => field !== "id" && field !== "code"));
}

export default function SupplierMaster() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierCode, setSupplierCode] = useState("SUP0001");
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshSuppliers = useCallback(async (query = search, status = statusFilter) => {
    const params = new URLSearchParams({ q: query, status });
    const response = await fetch(`/api/suppliers?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(await readError(response));
    const data = await readJson<SupplierListResponse>(response);
    setSuppliers(data.suppliers);
    setSupplierCode(data.nextCode);
  }, [search, statusFilter]);

  useEffect(() => {
    let current = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ q: search, status: statusFilter });
        const response = await fetch(`/api/suppliers?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(await readError(response));
        const data = await readJson<SupplierListResponse>(response);
        if (current) {
          setSuppliers(data.suppliers);
          setSupplierCode(data.nextCode);
        }
      } catch (loadError) {
        if (current) setError(loadError instanceof Error ? loadError.message : "Suppliers could not be loaded.");
      } finally {
        if (current) setLoading(false);
      }
    }, search ? 200 : 0);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [search, statusFilter]);

  const handleSave = async (supplier: Supplier): Promise<boolean> => {
    setError("");
    const duplicateResponse = await fetch("/api/suppliers/duplicate-check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: editingSupplier?.id ?? null, mobile: supplier.mobile, email: supplier.email, gst: supplier.gst }),
    });
    if (!duplicateResponse.ok) throw new Error(await readError(duplicateResponse));
    const duplicateData = await readJson<{ warnings: string[] }>(duplicateResponse);
    if (duplicateData.warnings.length > 0) {
      const labels = duplicateData.warnings.map((field) => ({ mobile: "mobile", email: "email", gst: "GST" }[field] ?? field));
      if (!window.confirm(`Possible same-company matches were found for ${labels.join(", ")}. Review for duplicates; no records will be merged. Save anyway?`)) {
        return false;
      }
    }

    const editing = Boolean(editingSupplier);
    const response = await fetch(editing ? `/api/suppliers/${encodeURIComponent(supplier.id)}` : "/api/suppliers", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(inputPayload(supplier)),
    });
    if (!response.ok) throw new Error(await readError(response));
    await refreshSuppliers();
    setEditingSupplier(null);
    return true;
  };

  const handleSetStatus = async (supplier: Supplier) => {
    const deactivate = supplier.status === "Active";
    if (!window.confirm(`${deactivate ? "Deactivate" : "Reactivate"} supplier ${supplier.code}? Existing records will be retained.`)) return;
    setError("");
    const response = await fetch(`/api/suppliers/${encodeURIComponent(supplier.id)}`, { method: deactivate ? "DELETE" : "POST" });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    await refreshSuppliers();
  };

  return (
    <div style={{ padding: "10px" }}>
      <h2 style={{ color: "#14532d", marginBottom: "15px" }}>🚚 Supplier Master</h2>
      {error && <p role="alert" style={{ color: "#b91c1c", background: "#fef2f2", padding: "10px", borderRadius: "6px" }}>{error}</p>}
      <SupplierForm
        key={editingSupplier?.id ?? `new:${supplierCode}`}
        supplierCode={supplierCode}
        editingSupplier={editingSupplier}
        onSave={handleSave}
        onCancelEdit={() => setEditingSupplier(null)}
      />
      <hr style={{ margin: "25px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
      <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#374151", fontSize: "12px" }}>
        Status
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </label>
      {loading && <p role="status">Loading suppliers…</p>}
      {!loading && !error && suppliers.length === 0 && <p role="status">No suppliers found in PostgreSQL.</p>}
      {!loading && !error && <SupplierTable
        suppliers={suppliers}
        search={search}
        onSearch={setSearch}
        onEdit={setEditingSupplier}
        onView={setViewingSupplier}
        onSetStatus={(supplier) => void handleSetStatus(supplier)}
      />}
      {viewingSupplier && (
        <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingSupplier(null); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.55)", display: "grid", placeItems: "center", padding: "20px" }}>
          <section role="dialog" aria-modal="true" aria-labelledby="supplier-details-title" style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "min(720px, 100%)", maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <h2 id="supplier-details-title">Supplier details</h2>
              <button type="button" onClick={() => setViewingSupplier(null)}>Close</button>
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px 18px" }}>
              {[
                ["Code", viewingSupplier.code], ["Name", viewingSupplier.name], ["Contact person", viewingSupplier.contactPerson],
                ["Mobile", viewingSupplier.mobile], ["Email", viewingSupplier.email], ["GST", viewingSupplier.gst],
                ["PAN", viewingSupplier.pan], ["Address", viewingSupplier.address], ["City", viewingSupplier.city],
                ["State", viewingSupplier.state], ["Country", viewingSupplier.country], ["PIN code", viewingSupplier.pinCode],
                ["Opening balance", String(viewingSupplier.openingBalance)], ["Credit limit", String(viewingSupplier.creditLimit)],
                ["Status", viewingSupplier.status],
              ].map(([label, value]) => <div key={label}><dt style={{ fontWeight: 700 }}>{label}</dt><dd style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{value}</dd></div>)}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
