"use client";

import { useState } from "react";
import { Customer } from "./CustomerTypes";

type CustomerTableProps = {
  customers: Customer[];
};

export default function CustomerTable({
  customers,
}: CustomerTableProps) {
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.code.toLowerCase().includes(search.toLowerCase()) ||
      customer.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      customer.mobile.includes(search)
  );

  return (
    <div style={{ marginTop: "20px" }}>
      <h2>Customer List</h2>

      <input
        type="text"
        placeholder="Search Customer..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "300px",
          padding: "10px",
          marginBottom: "15px",
        }}
      />

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
        border={1}
        cellPadding={8}
      >
        <thead>
          <tr>
            <th>Code</th>
            <th>Customer Name</th>
            <th>Contact Person</th>
            <th>Mobile</th>
            <th>City</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {filteredCustomers.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center" }}>
                No Customers Found
              </td>
            </tr>
          ) : (
            filteredCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.code}</td>
                <td>{customer.name}</td>
                <td>{customer.contactPerson}</td>
                <td>{customer.mobile}</td>
                <td>{customer.city}</td>
                <td>{customer.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}