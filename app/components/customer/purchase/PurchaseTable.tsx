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
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "950px",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#0f766e",
              color: "#fff",
            }}
          >
            <th style={thStyle}>#</th>
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
                colSpan={10}
                style={{
                  padding: "25px",
                  textAlign: "center",
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
                      : "#f8fafc",
                }}
              >
                <td style={tdStyle}>{index + 1}</td>
                <td style={tdStyle}>{purchase.purchaseNo}</td>
                <td style={tdStyle}>{purchase.purchaseDate}</td>
                <td style={tdStyle}>{purchase.supplierName}</td>
                <td style={tdStyle}>{purchase.productName}</td>
                <td style={tdStyle}>{purchase.hsn}</td>
                <td style={tdStyle}>{purchase.unit}</td>
                <td style={tdStyle}>{purchase.qty}</td>
                <td style={tdStyle}>₹ {purchase.rate}</td>
                <td
                  style={{
                    ...tdStyle,
                    fontWeight: "bold",
                  }}
                >
                  ₹ {purchase.amount}
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
  padding: "12px",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
};