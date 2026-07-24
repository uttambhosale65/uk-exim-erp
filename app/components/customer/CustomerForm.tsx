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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "40px",
    padding: "0 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(6, minmax(160px, 1fr))",
          gap: "10px",
        }}
      >
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Customer Code
          </label>
          <input
            type="text"
            value={customer.code}
            readOnly
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Customer Name *
          </label>
          <input
            type="text"
            name="name"
            value={customer.name}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Contact Person
          </label>
          <input
            type="text"
            name="contactPerson"
            value={customer.contactPerson}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Mobile
          </label>
          <input
            type="tel"
            name="mobile"
            value={customer.mobile}
            onChange={handleChange}
            maxLength={10}
            pattern="[0-9]{10}"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Email
          </label>
          <input
            type="email"
            name="email"
            value={customer.email}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            GST Number
          </label>
          <input
            type="text"
            name="gst"
            value={customer.gst}
            onChange={handleChange}
            maxLength={15}
            style={{
              ...inputStyle,
              textTransform: "uppercase",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            PAN Number
          </label>
          <input
            type="text"
            name="pan"
            value={customer.pan}
            onChange={handleChange}
            maxLength={10}
            style={{
              ...inputStyle,
              textTransform: "uppercase",
            }}
          />
        </div>

        <div style={{ gridColumn: "span 2" }}>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Address
          </label>
          <input
            type="text"
            name="address"
            value={customer.address}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            City
          </label>
          <input
            type="text"
            name="city"
            value={customer.city}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            State
          </label>
          <input
            type="text"
            name="state"
            value={customer.state}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Country
          </label>
          <input
            type="text"
            name="country"
            value={customer.country}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            PIN Code
          </label>
          <input
            type="text"
            name="pinCode"
            value={customer.pinCode}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Opening Balance
          </label>
          <input
            type="number"
            name="openingBalance"
            value={customer.openingBalance}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Credit Limit
          </label>
          <input
            type="number"
            name="creditLimit"
            value={customer.creditLimit}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Status
          </label>
          <select
            name="status"
            value={customer.status}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "10px",
            gridColumn: "span 2",
          }}
        >
          <button
            type="submit"
            style={{
              flex: 1,
              height: "40px",
              border: "none",
              borderRadius: "6px",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            💾 {editingCustomer ? "Update Customer" : "Save Customer"}
          </button>

          <button
            type="button"
            onClick={handleReset}
            style={{
              flex: 1,
              height: "40px",
              border: "none",
              borderRadius: "6px",
              background: "#6b7280",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  );
}