"use client";

import { useState } from "react";
import { Supplier } from "./SupplierTypes";

type SupplierFormProps = {
  supplierCode: string;
  onSave: (supplier: Supplier) => void;
};

export default function SupplierForm({
  supplierCode,
  onSave,
}: SupplierFormProps) {
  const emptySupplier: Supplier = {
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
  };

  const [supplier, setSupplier] = useState<Supplier>(emptySupplier);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setSupplier((prev) => ({
      ...prev,
      [name]:
        name === "openingBalance" || name === "creditLimit"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave(supplier);

    setSupplier({
      ...emptySupplier,
      id: crypto.randomUUID(),
      code: supplierCode,
    });
  };
  return (
    <form onSubmit={handleSubmit}>
      <h2>Supplier Master</h2>

      <input value={supplier.code} readOnly />

      <input
        name="name"
        placeholder="Supplier Name"
        value={supplier.name}
        onChange={handleChange}
        required
      />

      <input
        name="contactPerson"
        placeholder="Contact Person"
        value={supplier.contactPerson}
        onChange={handleChange}
      />

      <input
        name="mobile"
        placeholder="Mobile"
        value={supplier.mobile}
        onChange={handleChange}
      />

      <input
        name="email"
        placeholder="Email"
        value={supplier.email}
        onChange={handleChange}
      />

      <input
        name="gst"
        placeholder="GST Number"
        value={supplier.gst}
        onChange={handleChange}
      />

      <input
        name="pan"
        placeholder="PAN Number"
        value={supplier.pan}
        onChange={handleChange}
      />

      <input
        name="address"
        placeholder="Address"
        value={supplier.address}
        onChange={handleChange}
      />

      <input
        name="city"
        placeholder="City"
        value={supplier.city}
        onChange={handleChange}
      />

      <input
        name="state"
        placeholder="State"
        value={supplier.state}
        onChange={handleChange}
      />

      <input
        name="country"
        placeholder="Country"
        value={supplier.country}
        onChange={handleChange}
      />

      <input
        name="pinCode"
        placeholder="PIN Code"
        value={supplier.pinCode}
        onChange={handleChange}
      />

      <input
        type="number"
        name="openingBalance"
        placeholder="Opening Balance"
        value={supplier.openingBalance}
        onChange={handleChange}
      />

      <input
        type="number"
        name="creditLimit"
        placeholder="Credit Limit"
        value={supplier.creditLimit}
        onChange={handleChange}
      />

      <select
        name="status"
        value={supplier.status}
        onChange={handleChange}
      >
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>

      <br />
      <br />

      <button type="submit">
        Save Supplier
      </button>
    </form>
  );
}