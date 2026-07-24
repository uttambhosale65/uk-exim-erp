"use client";

import { useState } from "react";
import { Supplier } from "./SupplierTypes";

type SupplierTableProps = {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
};

export default function SupplierTable({
  suppliers,
  onEdit,
  onDelete,
}: SupplierTableProps) {
  const [search, setSearch] = useState("");

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      supplier.code
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      supplier.contactPerson
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      supplier.mobile.includes(search) ||
      supplier.city
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      supplier.gst
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        placeholder="🔍 Search Supplier..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          height: "40px",
          padding: "0 12px",
          marginBottom: "12px",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid #dbe3ea",
          fontSize: "14px",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#2563eb",
              color: "#ffffff",
            }}
          >
            <th style={thStyle}>Code</th>
            <th style={thStyle}>Supplier Name</th>
            <th style={thStyle}>Contact Person</th>
            <th style={thStyle}>Mobile</th>
            <th style={thStyle}>City</th>
            <th style={thStyle}>GST No.</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredSuppliers.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                No Suppliers Found
              </td>
            </tr>
          ) : (
            filteredSuppliers.map((supplier, index) => (
              <tr
                key={supplier.id}
                style={{
                  background:
                    index % 2 === 0
                      ? "#ffffff"
                      : "#f8fafc",
                }}
              >
                <td style={tdStyle}>{supplier.code}</td>
                <td style={tdStyle}>{supplier.name}</td>
                <td style={tdStyle}>{supplier.contactPerson}</td>
                <td style={tdStyle}>{supplier.mobile}</td>
                <td style={tdStyle}>{supplier.city}</td>
                <td style={tdStyle}>{supplier.gst}</td>

                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background:
                        supplier.status === "Active"
                          ? "#dcfce7"
                          : "#fee2e2",
                      color:
                        supplier.status === "Active"
                          ? "#166534"
                          : "#991b1b",
                    }}
                  >
                    {supplier.status}
                  </span>
                </td>

                <td style={tdStyle}>                  <button
                    onClick={() => onEdit(supplier)}
                    style={{
                      marginRight: "8px",
                      padding: "6px 10px",
                      border: "none",
                      borderRadius: "4px",
                      background: "#2563eb",
                      color: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    ✏️ Edit
                  </button>

                  <button
                    onClick={() => onDelete(supplier.id)}
                    style={{
                      padding: "6px 10px",
                      border: "none",
                      borderRadius: "4px",
                      background: "#dc2626",
                      color: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: "13px",
  borderBottom: "1px solid #1d4ed8",
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "13px",
  color: "#374151",
  verticalAlign: "middle",
};