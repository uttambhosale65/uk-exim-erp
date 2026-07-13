"use client";

import { useState } from "react";
import { Supplier } from "./SupplierTypes";

type SupplierTableProps = {
  suppliers: Supplier[];
};

export default function SupplierTable({
  suppliers,
}: SupplierTableProps) {
  const [search, setSearch] = useState("");

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(search.toLowerCase()) ||
      supplier.code.toLowerCase().includes(search.toLowerCase()) ||
      supplier.contactPerson
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      supplier.mobile.includes(search)
  );

  return (
    <div style={{ marginTop: "20px" }}>
      <h2>Supplier List</h2>

      <input
        type="text"
        placeholder="Search Supplier..."
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
            <th>Supplier Name</th>
            <th>Contact Person</th>
            <th>Mobile</th>
            <th>City</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {filteredSuppliers.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center" }}>
                No Suppliers Found
              </td>
            </tr>
          ) : (
            filteredSuppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td>{supplier.code}</td>
                <td>{supplier.name}</td>
                <td>{supplier.contactPerson}</td>
                <td>{supplier.mobile}</td>
                <td>{supplier.city}</td>
                <td>{supplier.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}