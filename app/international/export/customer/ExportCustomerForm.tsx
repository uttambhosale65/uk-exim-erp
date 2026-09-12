"use client";

import { useEffect, useState } from "react";
import { ExportCustomer } from "./ExportCustomerTypes";

type ExportCustomerFormProps = {
  customerCode: string;
  editingCustomer?: ExportCustomer | null;
  onSave: (customer: ExportCustomer) => void;
  onCancelEdit?: () => void;
};

export default function ExportCustomerForm({
  customerCode,
  editingCustomer,
  onSave,
  onCancelEdit,
}: ExportCustomerFormProps) {
  const emptyCustomer = (): ExportCustomer => ({
    id: crypto.randomUUID(),
    code: customerCode,

    // Basic Details
    name: "",
    contactPerson: "",
    mobile: "",
    email: "",

    // International Details
    country: "",
    currency: "USD",

    // Address
    address: "",
    city: "",
    stateProvince: "",
    postalCode: "",

    // Tax / Registration
    taxRegistrationNo: "",

    // Commercial Terms
    paymentTerms: "Advance / LC / TT",

    // Status
    status: "Active",

    // Additional Information
    remarks: "",
  });

  const [customer, setCustomer] =
    useState<ExportCustomer>(emptyCustomer());

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
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setCustomer((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!customer.name.trim()) {
      alert("Please enter Export Customer Name");
      return;
    }

    if (!customer.contactPerson.trim()) {
      alert("Please enter Contact Person");
      return;
    }

    if (!customer.country.trim()) {
      alert("Please enter Country");
      return;
    }

    if (!customer.currency.trim()) {
      alert("Please select Currency");
      return;
    }

    if (
      customer.mobile &&
      !/^[0-9]{10}$/.test(customer.mobile)
    ) {
      alert(
        "Please enter a valid 10 digit Mobile Number"
      );
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
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.08)",
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
          EXPORT CUSTOMER ENTRY
      =========================================== */}

      <div style={sectionStyle}>
        <h2
          style={{
            margin: "0 0 18px 0",
            color: "#0F4C81",
            fontSize: "20px",
            fontWeight: 700,
          }}
        >
          🌍 Export Customer Entry
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
              Export Customer Code
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
              Contact Person *
            </label>

            <input
              type="text"
              name="contactPerson"
              value={customer.contactPerson}
              onChange={handleChange}
              required
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

          {/* COUNTRY */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Country *
            </label>

            <input
              type="text"
              name="country"
              value={customer.country}
              onChange={handleChange}
              required
              placeholder="Country"
              style={inputStyle}
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
              "1fr 1fr 2fr 1fr 1fr 1fr",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          {/* CURRENCY */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Currency *
            </label>

            <select
              name="currency"
              value={customer.currency}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="USD">
                USD - US Dollar
              </option>
              <option value="EUR">
                EUR - Euro
              </option>
              <option value="GBP">
                GBP - British Pound
              </option>
              <option value="AED">
                AED - UAE Dirham
              </option>
              <option value="SAR">
                SAR - Saudi Riyal
              </option>
              <option value="QAR">
                QAR - Qatari Riyal
              </option>
              <option value="OMR">
                OMR - Omani Rial
              </option>
              <option value="KWD">
                KWD - Kuwaiti Dinar
              </option>
              <option value="JPY">
                JPY - Japanese Yen
              </option>
              <option value="CAD">
                CAD - Canadian Dollar
              </option>
              <option value="AUD">
                AUD - Australian Dollar
              </option>
              <option value="Other">
                Other
              </option>
            </select>
          </div>

          {/* ADDRESS */}

          <div
            style={{
              ...fieldStyle,
              gridColumn: "span 2",
            }}
          >
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

          {/* STATE / PROVINCE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              State / Province
            </label>

            <input
              type="text"
              name="stateProvince"
              value={customer.stateProvince}
              onChange={handleChange}
              placeholder="State / Province"
              style={inputStyle}
            />
          </div>

          {/* POSTAL CODE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Postal Code
            </label>

            <input
              type="text"
              name="postalCode"
              value={customer.postalCode}
              onChange={handleChange}
              maxLength={12}
              placeholder="Postal Code"
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
              "1.5fr 2fr 1.3fr 1fr 2fr",
            gap: "10px",
            alignItems: "end",
          }}
        >
          {/* TAX / REGISTRATION */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Tax / Registration No.
            </label>

            <input
              type="text"
              name="taxRegistrationNo"
              value={
                customer.taxRegistrationNo
              }
              onChange={handleChange}
              placeholder="Tax / Registration No."
              style={{
                ...inputStyle,
                textTransform: "uppercase",
              }}
            />
          </div>

          {/* PAYMENT TERMS */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Payment Terms
            </label>

            <select
              name="paymentTerms"
              value={customer.paymentTerms}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="Advance / LC / TT">
                Advance / LC / TT
              </option>
              <option value="100% Advance">
                100% Advance
              </option>
              <option value="30% Advance / 70% against BL">
                30% Advance / 70% against BL
              </option>
              <option value="LC at Sight">
                LC at Sight
              </option>
              <option value="LC 30 Days">
                LC 30 Days
              </option>
              <option value="TT in Advance">
                TT in Advance
              </option>
              <option value="TT against Documents">
                TT against Documents
              </option>
              <option value="Credit">
                Credit
              </option>
              <option value="Other">
                Other
              </option>
            </select>
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

          {/* REMARKS */}

          <div
            style={{
              ...fieldStyle,
              gridColumn: "span 1",
            }}
          >
            <label style={labelStyle}>
              Remarks
            </label>

            <input
              type="text"
              name="remarks"
              value={customer.remarks}
              onChange={handleChange}
              placeholder="Remarks"
              style={inputStyle}
            />
          </div>

          {/* ACTIONS */}

          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              style={{
                ...buttonStyle,
                background: "#374151",
                minWidth: "90px",
              }}
            >
              🔄 Reset
            </button>

            <button
              type="submit"
              style={{
                ...buttonStyle,
                background: "#0F4C81",
                minWidth: "145px",
              }}
            >
              💾{" "}
              {editingCustomer
                ? "Update Customer"
                : "Save Customer"}
            </button>
          </div>
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
            ✏️ Editing Export Customer:{" "}
            {editingCustomer.name}
          </div>
        )}
      </div>
    </form>
  );
}