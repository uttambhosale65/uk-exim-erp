"use client";

import { Supplier } from "./SupplierTypes";

type SupplierTableProps = {
  suppliers: Supplier[];
};

export default function SupplierTable({
  suppliers,
}: SupplierTableProps) {
  return (
    <div>
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
          </tr>
        </thead>

        <tbody>
          {suppliers.length === 0 ? (
            <tr>
              <td
                colSpan={7}
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
            suppliers.map((supplier, index) => (
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