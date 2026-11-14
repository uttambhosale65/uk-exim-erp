"use client";

import { useEffect, useState } from "react";

type Product = { code: string; name?: string; hsn?: string; active?: boolean };
type Classification = "taxable" | "nil_rated" | "exempt" | "non_gst" | "unclassified";
type TaxConfiguration = {
  version: 1;
  seller: {
    registrationType: "unknown" | "regular" | "composition";
    gstin: string;
    stateCode: string;
    legalName: string;
    tradeName: string;
    constitution: string;
    registrationStatus: string;
    registrationEffectiveDate: string;
    businessActivities: string;
    verification: { status: "unverified" | "verified"; source: "" | "official_gst_search" | "registration_certificate"; reference: string; verifiedOn: string };
  };
  productClassifications: Array<{ productCode: string; hsn: string; classification: Classification; ratePercent: string | number; effectiveFrom: string; effectiveTo: string | null; evidenceReference: string }>;
  export: { status: "unverified" | "verified"; mode: "unconfigured" | "lut_without_igst" | "igst_paid"; lutReference: string; lutValidFrom: string; lutValidTo: string; igstPaymentPermitted: boolean; igstPermissionReference: string; reference: string };
  approval: { status: "draft" | "approved"; ownerAttested: boolean; accountantReviewed: boolean; accountantReference: string; approvedAt?: string | null; approvedBy?: string | null };
};

const blank = (): TaxConfiguration => ({
  version: 1,
  seller: {
    registrationType: "unknown", gstin: "", stateCode: "27", legalName: "", tradeName: "", constitution: "",
    registrationStatus: "", registrationEffectiveDate: "", businessActivities: "",
    verification: { status: "unverified", source: "", reference: "", verifiedOn: "" },
  },
  productClassifications: [],
  export: { status: "unverified", mode: "unconfigured", lutReference: "", lutValidFrom: "", lutValidTo: "", igstPaymentPermitted: false, igstPermissionReference: "", reference: "" },
  approval: { status: "draft", ownerAttested: false, accountantReviewed: false, accountantReference: "" },
});

const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 9px", border: "1px solid #cbd5e1", borderRadius: 6, boxSizing: "border-box" };
const fieldStyle: React.CSSProperties = { display: "grid", gap: 5, fontSize: 13, color: "#334155" };

export default function TaxConfigurationPanel() {
  const [configuration, setConfiguration] = useState<TaxConfiguration>(blank);
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setStatus("loading"); setMessage("");
    try {
      const [taxResponse, productResponse] = await Promise.all([
        fetch("/api/tax/configuration", { cache: "no-store" }),
        fetch("/api/products", { cache: "no-store" }),
      ]);
      const [taxBody, productBody] = await Promise.all([taxResponse.json(), productResponse.json()]) as [
        { taxConfiguration?: { configuration?: TaxConfiguration; approvalStatus?: string }; error?: string },
        { products?: Product[]; error?: string },
      ];
      if (!taxResponse.ok) throw new Error(taxBody.error ?? "Tax configuration storage is unavailable.");
      if (!productResponse.ok || !Array.isArray(productBody.products)) throw new Error(productBody.error ?? "Company Product Master could not be loaded.");
      const current = taxBody.taxConfiguration?.configuration ?? blank();
      const byCode = new Map(current.productClassifications.map((rule) => [rule.productCode, rule]));
      const classifications = productBody.products.map((product) => byCode.get(product.code) ?? ({
        productCode: product.code, hsn: product.hsn ?? "", classification: "unclassified" as const,
        ratePercent: "", effectiveFrom: "", effectiveTo: null, evidenceReference: "",
      }));
      setProducts(productBody.products);
      const defaults = blank();
      setConfiguration({
        ...defaults,
        ...current,
        seller: { ...defaults.seller, ...current.seller, verification: { ...defaults.seller.verification, ...current.seller?.verification } },
        export: { ...defaults.export, ...current.export },
        approval: { ...defaults.approval, ...current.approval },
        productClassifications: classifications.map((rule) => ({ ...rule, effectiveTo: rule.effectiveTo || null })),
      });
      setStatus("ready");
    } catch (error) {
      setStatus("error"); setMessage(error instanceof Error ? error.message : "Tax configuration could not be loaded.");
    }
  };

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  const updateRule = (index: number, key: keyof TaxConfiguration["productClassifications"][number], value: string) => {
    setConfiguration((current) => ({ ...current, productClassifications: current.productClassifications.map((rule, i) => i === index ? { ...rule, [key]: value } : rule) }));
  };

  const save = async () => {
    setBusy(true); setMessage("");
    try {
      const payload = {
        ...configuration,
        productClassifications: configuration.productClassifications.map((rule) => ({ ...rule, effectiveTo: rule.effectiveTo || null })),
      };
      const response = await fetch("/api/tax/configuration", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as { taxConfiguration?: { configuration?: TaxConfiguration; approvalStatus?: string }; error?: string };
      if (!response.ok || !body.taxConfiguration) throw new Error(body.error ?? "Tax configuration could not be saved.");
      setConfiguration(body.taxConfiguration.configuration ?? configuration);
      setMessage(body.taxConfiguration.approvalStatus === "approved" ? "Domestic tax configuration approved. Unclassified products remain blocked, and exports remain blocked until export treatment is separately verified." : "Draft saved. Domestic Sales posting remains blocked until seller and accountant verification is complete.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Tax configuration could not be saved."); }
    finally { setBusy(false); }
  };

  const sectionStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, margin: "12px 0" };
  const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 };

  return <section aria-labelledby="gst-configuration-title" style={{ ...sectionStyle, borderColor: "#fbbf24", background: "#fffcf2" }}>
    <h3 id="gst-configuration-title" style={{ margin: "0 0 8px", color: "#713f12" }}>India GST Tax Configuration</h3>
    <p style={{ margin: "0 0 12px", fontSize: 13, color: "#475569" }}>
      Tax settings are company-scoped and effective-dated. No GST registration scheme, product rate, Place of Supply, or LUT status is inferred. GST Tax Invoice and Without GST remain separate options; taxable supplies by a regular GST seller cannot be moved to Without GST.
    </p>
    {status === "loading" && <p role="status">Loading tax configuration…</p>}
    {status === "error" && <p role="alert">{message}<button type="button" onClick={() => void load()} style={{ marginLeft: 8 }}>Retry</button></p>}
    {status === "ready" && <>
      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>Seller registration</h4>
        <div style={gridStyle}>
          <label style={fieldStyle}>Registration scheme
            <select style={inputStyle} value={configuration.seller.registrationType} onChange={(e) => setConfiguration((x) => ({ ...x, seller: { ...x.seller, registrationType: e.target.value as TaxConfiguration["seller"]["registrationType"] } }))}>
              <option value="unknown">Unverified / not selected</option><option value="regular">Regular</option><option value="composition">Composition</option>
            </select>
          </label>
          <label style={fieldStyle}>GSTIN<input style={inputStyle} maxLength={15} value={configuration.seller.gstin} onChange={(e) => setConfiguration((x) => ({ ...x, seller: { ...x.seller, gstin: e.target.value.toUpperCase() } }))} /></label>
          <label style={fieldStyle}>Seller GST state code<input style={inputStyle} inputMode="numeric" maxLength={2} value={configuration.seller.stateCode} onChange={(e) => setConfiguration((x) => ({ ...x, seller: { ...x.seller, stateCode: e.target.value } }))} /></label>
          <label style={fieldStyle}>Legal name<input style={inputStyle} value={configuration.seller.legalName} onChange={(e) => setConfiguration((x) => ({ ...x, seller: { ...x.seller, legalName: e.target.value } }))} /></label>
          <label style={fieldStyle}>Trade name<input style={inputStyle} value={configuration.seller.tradeName} onChange={(e) => setConfiguration((x) => ({ ...x, seller: { ...x.seller, tradeName: e.target.value } }))} /></label>
          <label style={fieldStyle}>Constitution<input style={inputStyle} value={configuration.seller.constitution} onChange={(e) => setConfiguration((x) => ({ ...x, seller: { ...x.seller, constitution: e.target.value } }))} /></label>
          <label style={fieldStyle}>Registration status<input style={inputStyle} value={configuration.seller.registrationStatus} onChange={(e) => setConfiguration((x) => ({ ...x, seller: { ...x.seller, registrationStatus: e.target.value } }))} /></label>
          <label style={fieldStyle}>Registration effective date<input type="date" style={inputStyle} value={configuration.seller.registrationEffectiveDate} onChange={(e) => setConfiguration((x) => ({ ...x, seller: { ...x.seller, registrationEffectiveDate: e.target.value } }))} /></label>
          <label style={fieldStyle}>Business activities<input style={inputStyle} value={configuration.seller.businessActivities} onChange={(e) => setConfiguration((x) => ({ ...x, seller: { ...x.seller, businessActivities: e.target.value } }))} /></label>
          <label style={fieldStyle}>Verification source
            <select style={inputStyle} value={configuration.seller.verification.source} onChange={(e) => setConfiguration((x) => ({ ...x, seller: { ...x.seller, verification: { ...x.seller.verification, source: e.target.value as TaxConfiguration["seller"]["verification"]["source"], status: e.target.value ? "verified" : "unverified" } } }))}>
              <option value="">Not verified</option><option value="official_gst_search">Official GST taxpayer search</option><option value="registration_certificate">Registration certificate</option>
            </select>
          </label>
          <label style={fieldStyle}>Evidence reference<input style={inputStyle} value={configuration.seller.verification.reference} onChange={(e) => setConfiguration((x) => ({ ...x, seller: { ...x.seller, verification: { ...x.seller.verification, reference: e.target.value } } }))} /></label>
          <label style={fieldStyle}>Verified on<input type="date" style={inputStyle} value={configuration.seller.verification.verifiedOn} onChange={(e) => setConfiguration((x) => ({ ...x, seller: { ...x.seller, verification: { ...x.seller.verification, verifiedOn: e.target.value, status: e.target.value ? "verified" : "unverified" } } }))} /></label>
        </div>
      </div>

      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>Product tax classification</h4>
        <p style={{ fontSize: 12 }}>Each row must match the current Product Master HSN. The entered rate is the combined rate; after approval, the tax engine derives CGST/SGST or IGST from the legally supplied Place of Supply. Enter only a classification and effective rate verified against an official schedule/accountant review.</p>
        {configuration.productClassifications.map((rule, index) => {
          const product = products.find((item) => item.code === rule.productCode);
          return <div key={rule.productCode} style={{ ...gridStyle, borderTop: "1px solid #e2e8f0", padding: "10px 0" }}>
            <label style={fieldStyle}>Product<input style={inputStyle} value={`${rule.productCode}${product?.name ? ` — ${product.name}` : ""}`} readOnly /></label>
            <label style={fieldStyle}>HSN<input style={inputStyle} value={rule.hsn} readOnly /></label>
            <label style={fieldStyle}>Classification
              <select style={inputStyle} value={rule.classification} onChange={(e) => updateRule(index, "classification", e.target.value)}>
                <option value="unclassified">Unclassified</option><option value="taxable">Taxable</option><option value="nil_rated">Nil-rated</option><option value="exempt">Exempt</option><option value="non_gst">Non-GST</option>
              </select>
            </label>
            <label style={fieldStyle}>Rate %<input style={inputStyle} type="number" min="0" max="100" step="0.01" value={rule.ratePercent} onChange={(e) => updateRule(index, "ratePercent", e.target.value)} /></label>
            <label style={fieldStyle}>Effective from<input style={inputStyle} type="date" value={rule.effectiveFrom} onChange={(e) => updateRule(index, "effectiveFrom", e.target.value)} /></label>
            <label style={fieldStyle}>Effective to (optional)<input style={inputStyle} type="date" value={rule.effectiveTo ?? ""} onChange={(e) => updateRule(index, "effectiveTo", e.target.value)} /></label>
            <label style={fieldStyle}>Official/accountant reference<input style={inputStyle} value={rule.evidenceReference} onChange={(e) => updateRule(index, "evidenceReference", e.target.value)} /></label>
          </div>;
        })}
        {!configuration.productClassifications.length && <p>No company products are available for tax classification.</p>}
      </div>

      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>Export GST treatment</h4>
        <div style={gridStyle}>
          <label style={fieldStyle}>Export route
            <select style={inputStyle} value={configuration.export.mode} onChange={(e) => setConfiguration((x) => ({ ...x, export: { ...x.export, mode: e.target.value as TaxConfiguration["export"]["mode"], status: e.target.value === "unconfigured" ? "unverified" : x.export.status } }))}>
              <option value="unconfigured">Not verified</option><option value="lut_without_igst">Valid LUT/Bond without IGST</option><option value="igst_paid">IGST payment, only if permitted</option>
            </select>
          </label>
          <label style={fieldStyle}>Export approval/evidence reference<input style={inputStyle} value={configuration.export.reference} onChange={(e) => setConfiguration((x) => ({ ...x, export: { ...x.export, reference: e.target.value, status: e.target.value ? "verified" : "unverified" } }))} /></label>
          {configuration.export.mode === "lut_without_igst" && <>
            <label style={fieldStyle}>LUT/Bond reference<input style={inputStyle} value={configuration.export.lutReference} onChange={(e) => setConfiguration((x) => ({ ...x, export: { ...x.export, lutReference: e.target.value } }))} /></label>
            <label style={fieldStyle}>LUT valid from<input style={inputStyle} type="date" value={configuration.export.lutValidFrom} onChange={(e) => setConfiguration((x) => ({ ...x, export: { ...x.export, lutValidFrom: e.target.value } }))} /></label>
            <label style={fieldStyle}>LUT valid to<input style={inputStyle} type="date" value={configuration.export.lutValidTo} onChange={(e) => setConfiguration((x) => ({ ...x, export: { ...x.export, lutValidTo: e.target.value } }))} /></label>
          </>}
          {configuration.export.mode === "igst_paid" && <>
            <label style={{ ...fieldStyle, display: "flex", alignItems: "center" }}><span>IGST-paid export has been confirmed as permitted</span><input type="checkbox" checked={configuration.export.igstPaymentPermitted} onChange={(e) => setConfiguration((x) => ({ ...x, export: { ...x.export, igstPaymentPermitted: e.target.checked, status: e.target.checked ? x.export.status : "unverified" } }))} /></label>
            <label style={fieldStyle}>Permission/evidence reference<input style={inputStyle} value={configuration.export.igstPermissionReference} onChange={(e) => setConfiguration((x) => ({ ...x, export: { ...x.export, igstPermissionReference: e.target.value } }))} /></label>
          </>}
        </div>
      </div>

      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>Owner and accountant approval</h4>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}><input type="checkbox" checked={configuration.approval.ownerAttested} onChange={(e) => setConfiguration((x) => ({ ...x, approval: { ...x.approval, ownerAttested: e.target.checked, status: "draft" } }))} /><span>I verified the current seller registration scheme and GSTIN against the selected official source/certificate, and verified each product classification being enabled. Products still marked Unclassified remain blocked.</span></label>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}><input type="checkbox" checked={configuration.approval.accountantReviewed} onChange={(e) => setConfiguration((x) => ({ ...x, approval: { ...x.approval, accountantReviewed: e.target.checked, status: "draft" } }))} /><span>The accountant reviewed domestic Place of Supply, CGST/SGST versus IGST, both billing options, and the enabled product classifications. Export treatment is a separate verification.</span></label>
        <label style={fieldStyle}>Accountant approval reference<input style={inputStyle} value={configuration.approval.accountantReference} onChange={(e) => setConfiguration((x) => ({ ...x, approval: { ...x.approval, accountantReference: e.target.value, status: "draft" } }))} /></label>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" disabled={busy} onClick={() => void save()} style={{ padding: "9px 14px", border: 0, borderRadius: 6, background: "#14532d", color: "#fff", fontWeight: 700, opacity: busy ? 0.65 : 1 }}>{busy ? "Saving…" : "Save tax configuration"}</button>
        <button type="button" disabled={busy} onClick={() => void load()} style={{ padding: "9px 14px", border: "1px solid #cbd5e1", borderRadius: 6 }}>Reload</button>
        <span role="status" style={{ fontSize: 12, color: configuration.approval.status === "approved" ? "#166534" : "#92400e" }}>Status: {configuration.approval.status === "approved" ? "Domestic approval saved; unclassified products blocked; export disabled" : "Draft / Sales posting blocked"}</span>
      </div>
      {message && <p role="status" style={{ marginBottom: 0 }}>{message}</p>}
      <p style={{ fontSize: 11, color: "#64748b", marginBottom: 0 }}>No existing invoice is recalculated. Saving a configuration never changes stock, legacy settings, or historical invoices.</p>
    </>}
  </section>;
}
