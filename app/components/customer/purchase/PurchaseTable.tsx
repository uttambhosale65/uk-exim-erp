"use client";

import { Purchase } from "./PurchaseTypes";

type PurchaseTableProps = {
  purchases: Purchase[];
};

export default function PurchaseTable({
  purchases,
}: PurchaseTableProps) {
  return (
    <div
      style={{
        marginTop: "30px",
        background: "#ffffff",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
      }}
    >
      <h2
        style={{
          marginBottom: "20px",
          color: "#0f766e",
        }}
      >
        📋 Purchase List
      </h2>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "900px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#0f766e",
                color: "#ffffff",
              }}
            >
              <th style={thStyle}>Purchase No</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Supplier</th>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>HSN</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Rate</th>
              <th style={thStyle}>Amount</th>
            </tr>
          </thead>

          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    textAlign: "center",
                    padding: "25px",
                    color: "#6b7280",
                  }}
                >
                  No Purchase Records Found
                </td>
              </tr>
            ) : (
              purchases.map((purchase, index) => (
                <tr
                  key={purchase.id}
                  style={{
                    background:
                      index % 2 === 0
                        ? "#ffffff"
                        : "#f9fafb",
                  }}
                >
                  <td style={tdStyle}>{purchase.purchaseNo}</td>
                  <td style={tdStyle}>{purchase.purchaseDate}</td>
                  <td style={tdStyle}>{purchase.supplierName}</td>
                  <td style={tdStyle}>{purchase.productName}</td>
                  <td style={tdStyle}>{purchase.hsn}</td>
                  <td style={tdStyle}>{purchase.unit}</td>
                  <td style={tdStyle}>{purchase.qty}</td>
                  <td style={tdStyle}>₹ {purchase.rate}</td>
                  <td style={tdStyle}>
                    <b>₹ {purchase.amount}</b>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
};