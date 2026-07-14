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
  const [supplier, setSupplier] = useState<Supplier>({
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

  useEffect(() => {
    setSupplier((prev) => ({
      ...prev,
      code: supplierCode,
    }));
  }, [supplierCode]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;

    setSupplier((prev) => ({
      ...prev,
      [name]:
        name === "openingBalance" ||
        name === "creditLimit"
          ? Number(value)
          : value,
    }));
  }

  function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    onSave(supplier);
    setSupplier({
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
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Supplier Master</h2>

      <input
        type="text"
        value={supplier.code}
        readOnly
        placeholder="Supplier Code"
      />

      <input
        type="text"
        name="name"
        placeholder="Supplier Name"
        value={supplier.name}
        onChange={handleChange}
        required
      />

      <input
        type="text"
        name="contactPerson"
        placeholder="Contact Person"
        value={supplier.contactPerson}
        onChange={handleChange}
      />

      <input
        type="text"
        name="mobile"
        placeholder="Mobile"
        value={supplier.mobile}
        onChange={handleChange}
      />

      <input
        type="email"
        name="email"
        placeholder="Email"
        value={supplier.email}
        onChange={handleChange}
      />

      <input
        type="text"
        name="gst"
        placeholder="GST Number"
        value={supplier.gst}
        onChange={handleChange}
      />

      <input
        type="text"
        name="pan"
        placeholder="PAN Number"
        value={supplier.pan}
        onChange={handleChange}
      />

      <input
        type="text"
        name="address"
        placeholder="Address"
        value={supplier.address}
        onChange={handleChange}
      />

      <input
        type="text"
        name="city"
        placeholder="City"
        value={supplier.city}
        onChange={handleChange}
      />

      <input
        type="text"
        name="state"
        placeholder="State"
        value={supplier.state}
        onChange={handleChange}
      />

      <input
        type="text"
        name="country"
        placeholder="Country"
        value={supplier.country}
        onChange={handleChange}
      />

      <input
        type="text"
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