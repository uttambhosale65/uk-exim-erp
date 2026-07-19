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
      customer.contactPerson
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      customer.mobile.includes(search) ||
      customer.city.toLowerCase().includes(search.toLowerCase()) ||
      customer.gst.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        placeholder="🔍 Search Customer..."
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
            <th style={thStyle}>Customer Name</th>
            <th style={thStyle}>Contact Person</th>
            <th style={thStyle}>Mobile</th>
            <th style={thStyle}>City</th>
            <th style={thStyle}>GST No.</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>

        <tbody>
          {filteredCustomers.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                No Customers Found
              </td>
            </tr>
          ) : (
            filteredCustomers.map((customer, index) => (
              <tr
                key={customer.id}
                style={{
                  background:
                    index % 2 === 0
                      ? "#ffffff"
                      : "#f8fafc",
                }}
              >
                <td style={tdStyle}>{customer.code}</td>
                <td style={tdStyle}>{customer.name}</td>
                <td style={tdStyle}>{customer.contactPerson}</td>
                <td style={tdStyle}>{customer.mobile}</td>
                <td style={tdStyle}>{customer.city}</td>
                <td style={tdStyle}>{customer.gst}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background:
                        customer.status === "Active"
                          ? "#dcfce7"
                          : "#fee2e2",
                      color:
                        customer.status === "Active"
                          ? "#166534"
                          : "#991b1b",
                    }}
                  >
                    {customer.status}
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