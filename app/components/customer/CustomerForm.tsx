"use client";

import { useEffect, useState } from "react";
import { Customer } from "./CustomerTypes";

type CustomerFormProps = {
  customerCode: string;
  editingCustomer?: Customer | null;
  onSave: (customer: Customer) => void;
  onCancelEdit?: () => void;
};

export default function CustomerForm({
  customerCode,
  editingCustomer,
  onSave,
  onCancelEdit,
}: CustomerFormProps) {
  const emptyCustomer = (): Customer => ({
    id: crypto.randomUUID(),
    code: customerCode,

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

  const [customer, setCustomer] =
    useState<Customer>(emptyCustomer());

  useEffect(() => {
    if (editingCustomer) {
      setCustomer(editingCustomer);
    } else {
      setCustomer((prev) => ({
        ...prev,
        code: customerCode,
      }));
    }
  }, [customerCode, editingCustomer]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setCustomer((prev) => ({
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

    if (!customer.name.trim()) {
      alert("Please enter Customer Name");
      return;
    }

    if (
      customer.mobile &&
      !/^[0-9]{10}$/.test(customer.mobile)
    ) {
      alert("Please enter a valid 10 digit Mobile Number");
      return;
    }

    onSave(customer);

    setCustomer({
      ...emptyCustomer(),
      code: customerCode,
    });

    onCancelEdit?.();
  };

  const handleReset = () => {
    setCustomer({
      ...emptyCustomer(),
      code: customerCode,
    });

    onCancelEdit?.();
  };

  // ==============================
  // COMMON STYLES
  // ==============================

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
    fontSize: "12px",
    fontWeight: 700,
    color: "#374151",
    marginBottom: "5px",
    whiteSpace: "nowrap",
  };

  const fieldStyle: React.CSSProperties = {
    minWidth: 0,
  };

  const sectionStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "18px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  };

  const buttonStyle: React.CSSProperties = {
    height: "40px",
    padding: "0 18px",
    border: "none",
    borderRadius: "6px",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <form onSubmit={handleSubmit}>

      {/* ==========================================
          CUSTOMER ENTRY
      =========================================== */}

      <div style={sectionStyle}>

        <h2
          style={{
            margin: "0 0 18px 0",
            color: "#14532d",
            fontSize: "20px",
            fontWeight: 700,
          }}
        >
          📋 Customer Entry
        </h2>

        {/* ======================================
            ROW 1
        ======================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1.8fr 1.5fr 1.2fr 1.6fr 1.5fr",
            gap: "10px",
            marginBottom: "12px",
          }}
        >

          {/* CUSTOMER CODE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Customer Code
            </label>

            <input
              type="text"
              value={customer.code}
              readOnly
              style={{
                ...inputStyle,
                background: "#f3f4f6",
                fontWeight: 600,
              }}
            />
          </div>

          {/* CUSTOMER NAME */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Customer Name *
            </label>

            <input
              type="text"
              name="name"
              value={customer.name}
              onChange={handleChange}
              required
              placeholder="Enter Customer Name"
              style={inputStyle}
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
              value={customer.contactPerson}
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
              value={customer.mobile}
              onChange={handleChange}
              maxLength={10}
              placeholder="Mobile Number"
              style={inputStyle}
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
              value={customer.email}
              onChange={handleChange}
              placeholder="Email Address"
              style={inputStyle}
            />
          </div>

          {/* GST */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              GST Number
            </label>

            <input
              type="text"
              name="gst"
              value={customer.gst}
              onChange={handleChange}
              maxLength={15}
              placeholder="GST Number"
              style={{
                ...inputStyle,
                textTransform: "uppercase",
              }}
            />
          </div>
        </div>

        {/* ======================================
            ROW 2
        ======================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 2fr 1fr 1fr 1fr 1fr",
            gap: "10px",
            marginBottom: "12px",
          }}
        >

          {/* PAN */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              PAN Number
            </label>

            <input
              type="text"
              name="pan"
              value={customer.pan}
              onChange={handleChange}
              maxLength={10}
              placeholder="PAN Number"
              style={{
                ...inputStyle,
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
              value={customer.address}
              onChange={handleChange}
              placeholder="Customer Address"
              style={inputStyle}
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
              value={customer.city}
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
              value={customer.state}
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
              value={customer.country}
              onChange={handleChange}
              placeholder="Country"
              style={inputStyle}
            />
          </div>

          {/* PIN */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              PIN Code
            </label>

            <input
              type="text"
              name="pinCode"
              value={customer.pinCode}
              onChange={handleChange}
              maxLength={6}
              placeholder="PIN Code"
              style={inputStyle}
            />
          </div>
        </div>

        {/* ======================================
            ROW 3
        ======================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1.3fr 1.3fr 1fr auto auto",
            gap: "10px",
            alignItems: "end",
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
              value={customer.openingBalance}
              onChange={handleChange}
              min="0"
              step="0.01"
              style={inputStyle}
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
              value={customer.creditLimit}
              onChange={handleChange}
              min="0"
              step="0.01"
              style={inputStyle}
            />
          </div>

          {/* STATUS */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Status
            </label>

            <select
              name="status"
              value={customer.status}
              onChange={handleChange}
              style={inputStyle}
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

          <button
            type="button"
            onClick={handleReset}
            style={{
              ...buttonStyle,
              background: "#374151",
              minWidth: "105px",
            }}
          >
            🔄 Reset
          </button>

          {/* SAVE */}

          <button
            type="submit"
            style={{
              ...buttonStyle,
              background: "#14532d",
              minWidth: "145px",
            }}
          >
            💾{" "}
            {editingCustomer
              ? "Update Customer"
              : "Save Customer"}
          </button>
        </div>

        {/* EDIT MESSAGE */}

        {editingCustomer && (
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
            ✏️ Editing Customer:{" "}
            {editingCustomer.name}
          </div>
        )}
      </div>
    </form>
  );
}