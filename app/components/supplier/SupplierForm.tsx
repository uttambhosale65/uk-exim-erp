"use client";

import { useEffect, useState } from "react";
import { Supplier } from "./SupplierTypes";

type SupplierFormProps = {
  supplierCode: string;
  onSave: (supplier: Supplier) => void;
};

export default function SupplierForm({
  supplierCode,
  onSave,
}: SupplierFormProps) {
  const emptySupplier = (): Supplier => ({
    id: crypto.randomUUID(),
    code: supplierCode,

    name: "",
    contactPerson: "",

    mobile: "",
    email: "",

    gst: "",
    pan: "",

    address: "",
    city: "",
    state: "",
    country: "India",
    pinCode: "",

    openingBalance: 0,
    creditLimit: 0,

    status: "Active",
  });

  const [supplier, setSupplier] =
    useState<Supplier>(emptySupplier());

  useEffect(() => {
    setSupplier((prev) => ({
      ...prev,
      code: supplierCode,
    }));
  }, [supplierCode]);

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

    onSave(supplier);

    setSupplier({
      ...emptySupplier(),
      code: supplierCode,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(160px, 1fr))",
          gap: "10px",
        }}
      >
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Supplier Code
          </label>
          <input
            type="text"
            value={supplier.code}
            readOnly
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Supplier Name *
          </label>
          <input
            type="text"
            name="name"
            value={supplier.name}
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
            value={supplier.contactPerson}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Mobile
          </label>
          <input
            type="text"
            name="mobile"
            value={supplier.mobile}
            onChange={handleChange}
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
            value={supplier.email}
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
            value={supplier.gst}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            PAN Number
          </label>
          <input
            type="text"
            name="pan"
            value={supplier.pan}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div style={{ gridColumn: "span 2" }}>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Address
          </label>
          <input
            type="text"
            name="address"
            value={supplier.address}
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
            value={supplier.city}
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
            value={supplier.state}
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
            value={supplier.country}
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
            value={supplier.pinCode}
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
            value={supplier.openingBalance}
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
            value={supplier.creditLimit}
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
            value={supplier.status}
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
          }}
        >
          <button
            type="submit"
            style={{
              width: "100%",
              height: "40px",
              border: "none",
              borderRadius: "6px",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save Supplier
          </button>
        </div>
      </div>
    </form>
  );
}

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