"use client";

import { useState } from "react";
import { Customer } from "./CustomerTypes";

type CustomerFormProps = {
  customerCode: string;
  onSave: (customer: Customer) => void;
};

export default function CustomerForm({
  customerCode,
  onSave,
}: CustomerFormProps) {
  const emptyCustomer = (): Customer => ({
    id: crypto.randomUUID(),
    code: customerCode,
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

  const [customer, setCustomer] = useState<Customer>(emptyCustomer());

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setCustomer((prev) => ({
      ...prev,
      [name]:
        name === "openingBalance" || name === "creditLimit"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave(customer);

    setCustomer({
      ...emptyCustomer(),
      code: customerCode,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Customer Master</h2>

      <input value={customer.code} readOnly />

      <input
        name="name"
        placeholder="Customer Name"
        value={customer.name}
        onChange={handleChange}
        required
      />

      <input
        name="contactPerson"
        placeholder="Contact Person"
        value={customer.contactPerson}
        onChange={handleChange}
      />

      <input
        name="mobile"
        placeholder="Mobile"
        value={customer.mobile}
        onChange={handleChange}
      />

      <input
        name="email"
        placeholder="Email"
        value={customer.email}
        onChange={handleChange}
      />

      <input
        name="gst"
        placeholder="GST Number"
        value={customer.gst}
        onChange={handleChange}
      />

      <input
        name="pan"
        placeholder="PAN Number"
        value={customer.pan}
        onChange={handleChange}
      />

      <input
        name="address"
        placeholder="Address"
        value={customer.address}
        onChange={handleChange}
      />

      <input
        name="city"
        placeholder="City"
        value={customer.city}
        onChange={handleChange}
      />

      <input
        name="state"
        placeholder="State"
        value={customer.state}
        onChange={handleChange}
      />

      <input
        name="country"
        placeholder="Country"
        value={customer.country}
        onChange={handleChange}
      />

      <input
        name="pinCode"
        placeholder="PIN Code"
        value={customer.pinCode}
        onChange={handleChange}
      />

      <input
        type="number"
        name="openingBalance"
        placeholder="Opening Balance"
        value={customer.openingBalance}
        onChange={handleChange}
      />

      <input
        type="number"
        name="creditLimit"
        placeholder="Credit Limit"
        value={customer.creditLimit}
        onChange={handleChange}
      />

      <select
        name="status"
        value={customer.status}
        onChange={handleChange}
      >
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>

      <br />
      <br />

      <button type="submit">Save Customer</button>
    </form>
  );
}