"use client";

import { useEffect, useState } from "react";
import { Supplier } from "./SupplierTypes";

type SupplierFormProps = {
  supplierCode: string;
  editingSupplier?: Supplier | null;
  onSave: (supplier: Supplier) => void;
  onCancelEdit?: () => void;
};

export default function SupplierForm({
  supplierCode,
  editingSupplier,
  onSave,
  onCancelEdit,
}: SupplierFormProps) {
  const emptySupplier = (): Supplier => ({
    id: crypto.randomUUID(),
    code: supplierCode,

    // Basic Details
    name: "",
    contactPerson: "",
    mobile: "",
    email: "",

    // Tax Details
    gst: "",
    pan: "",

    // Address
    address: "",
    city: "",
    state: "",
    country: "India",
    pinCode: "",

    // Financial
    openingBalance: 0,
    creditLimit: 0,

    // Status
    status: "Active",
  });

  const [supplier, setSupplier] =
    useState<Supplier>(emptySupplier());

  useEffect(() => {
    if (editingSupplier) {
      setSupplier(editingSupplier);
    } else {
      setSupplier((prev) => ({
        ...prev,
        code: supplierCode,
      }));
    }
  }, [supplierCode, editingSupplier]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setSupplier((prev) => ({
      ...prev,
      [name]:
        name === "openingBalance" ||
        name === "creditLimit"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!supplier.name.trim()) {
      alert("Please enter Supplier Name");
      return;
    }

    onSave(supplier);

    setSupplier({
      ...emptySupplier(),
      code: supplierCode,
    });

    onCancelEdit?.();
  };

  const handleReset = () => {
    setSupplier({
      ...emptySupplier(),
      code: supplierCode,
    });

    onCancelEdit?.();
  };

  /* ==========================================
     COMMON STYLES
  ========================================== */

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "40px",
    padding: "0 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    boxSizing: "border-box",
    outline: "none",
    background: "#ffffff",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    color: "#374151",
    marginBottom: "5px",
    whiteSpace: "nowrap",
  };

  const fieldStyle: React.CSSProperties = {
    minWidth: 0,
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ==========================================
          SUPPLIER ENTRY BOX
      =========================================== */}

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d1d5db",
          borderRadius: "10px",
          padding: "18px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {/* TITLE */}

        <h2
          style={{
            margin: "0 0 18px 0",
            color: "#14532d",
            fontSize: "19px",
            fontWeight: 700,
          }}
        >
          🚚 Supplier Entry
        </h2>

        {/* ======================================
            ROW 1 — BASIC SUPPLIER DETAILS
        ======================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "110px 2fr 1.15fr 1.2fr 1.15fr 1.2fr",
            gap: "10px",
            alignItems: "end",
          }}
        >
          {/* SUPPLIER CODE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Supplier Code
            </label>

            <input
              type="text"
              value={supplier.code}
              readOnly
              style={{
                ...inputStyle,
                background: "#f3f4f6",
                fontWeight: 700,
              }}
            />
          </div>

          {/* SUPPLIER NAME */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Supplier Name *
            </label>

            <input
              type="text"
              name="name"
              value={supplier.name}
              onChange={handleChange}
              required
              placeholder="Enter Supplier Name"
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* CONTACT PERSON */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Contact Person
            </label>

            <input
              type="text"
              name="contactPerson"
              value={supplier.contactPerson}
              onChange={handleChange}
              placeholder="Contact Person"
              style={inputStyle}
            />
          </div>

          {/* MOBILE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Mobile
            </label>

            <input
              type="tel"
              name="mobile"
              value={supplier.mobile}
              onChange={handleChange}
              maxLength={10}
              placeholder="Mobile Number"
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* EMAIL */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Email
            </label>

            <input
              type="email"
              name="email"
              value={supplier.email}
              onChange={handleChange}
              placeholder="Email Address"
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* GST NUMBER */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              GST Number
            </label>

            <input
              type="text"
              name="gst"
              value={supplier.gst}
              onChange={handleChange}
              maxLength={15}
              placeholder="GST NUMBER"
              style={{
                ...inputStyle,
                fontSize: "14px",
                textTransform: "uppercase",
              }}
            />
          </div>
        </div>

        {/* ======================================
            ROW 2 — ADDRESS DETAILS
        ======================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 2.2fr 1.25fr 1.25fr 1.25fr 1fr",
            gap: "10px",
            alignItems: "end",
            marginTop: "14px",
          }}
        >
          {/* PAN NUMBER */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              PAN Number
            </label>

            <input
              type="text"
              name="pan"
              value={supplier.pan}
              onChange={handleChange}
              maxLength={10}
              placeholder="PAN NUMBER"
              style={{
                ...inputStyle,
                fontSize: "14px",
                textTransform: "uppercase",
              }}
            />
          </div>

          {/* ADDRESS */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Address
            </label>

            <input
              type="text"
              name="address"
              value={supplier.address}
              onChange={handleChange}
              placeholder="Supplier Address"
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* CITY */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              City
            </label>

            <input
              type="text"
              name="city"
              value={supplier.city}
              onChange={handleChange}
              placeholder="City"
              style={inputStyle}
            />
          </div>

          {/* STATE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              State
            </label>

            <input
              type="text"
              name="state"
              value={supplier.state}
              onChange={handleChange}
              placeholder="State"
              style={inputStyle}
            />
          </div>

          {/* COUNTRY */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Country
            </label>

            <input
              type="text"
              name="country"
              value={supplier.country}
              onChange={handleChange}
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* PIN CODE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              PIN Code
            </label>

            <input
              type="text"
              name="pinCode"
              value={supplier.pinCode}
              onChange={handleChange}
              maxLength={6}
              placeholder="PIN Code"
              style={inputStyle}
            />
          </div>
        </div>

        {/* ======================================
            ROW 3 — FINANCIAL + STATUS + ACTION
        ======================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1.15fr 1.15fr 1fr auto auto",
            gap: "10px",
            alignItems: "end",
            marginTop: "14px",
          }}
        >
          {/* OPENING BALANCE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Opening Balance
            </label>

            <input
              type="number"
              name="openingBalance"
              value={supplier.openingBalance}
              onChange={handleChange}
              min="0"
              step="0.01"
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* CREDIT LIMIT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Credit Limit
            </label>

            <input
              type="number"
              name="creditLimit"
              value={supplier.creditLimit}
              onChange={handleChange}
              min="0"
              step="0.01"
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* STATUS */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Status
            </label>

            <select
              name="status"
              value={supplier.status}
              onChange={handleChange}
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            >
              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>
          </div>

          {/* RESET */}

          <div>
            <label
              style={{
                ...labelStyle,
                visibility: "hidden",
              }}
            >
              Action
            </label>

            <button
              type="button"
              onClick={handleReset}
              style={{
                height: "40px",
                padding: "0 16px",
                border: "none",
                borderRadius: "6px",
                background: "#6b7280",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              🔄 Reset
            </button>
          </div>

          {/* SAVE / UPDATE */}

          <div>
            <label
              style={{
                ...labelStyle,
                visibility: "hidden",
              }}
            >
              Action
            </label>

            <button
              type="submit"
              style={{
                height: "40px",
                padding: "0 18px",
                border: "none",
                borderRadius: "6px",
                background: "#14532d",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              💾{" "}
              {editingSupplier
                ? "Update Supplier"
                : "Save Supplier"}
            </button>
          </div>
        </div>

        {/* EDIT MESSAGE */}

        {editingSupplier && (
          <div
            style={{
              marginTop: "12px",
              padding: "7px 10px",
              background: "#fef3c7",
              color: "#92400e",
              borderRadius: "5px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            ✏️ Editing Supplier:{" "}
            {editingSupplier.name}
          </div>
        )}
      </div>
    </form>
  );
}