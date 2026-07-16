"use client";

import { Purchase } from "./PurchaseTypes";

type PurchaseTableProps = {
  purchases: Purchase[];
  onEdit: (purchase: Purchase) => void;
  onDelete: (id: string) => void;
};

export default function PurchaseTable({
  purchases,
  onEdit,
  onDelete,
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
          minWidth: "1100px",
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
            <th style={thStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {purchases.length === 0 ? (
            <tr>
              <td
                colSpan={11}
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

                <td style={tdStyle}>
                  ₹ {purchase.rate}
                </td>

                <td
                  style={{
                    ...tdStyle,
                    fontWeight: "bold",
                  }}
                >
                  ₹ {purchase.amount}
                </td>

                <td style={tdStyle}>
                  <button
                    onClick={() => onEdit(purchase)}
                    style={{
                      marginRight: "8px",
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "6px",
                      background: "#2563eb",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    ✏️ Edit
                  </button>

                  <button
                    onClick={() => onDelete(purchase.id)}
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "6px",
                      background: "#dc2626",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    🗑 Delete
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
  padding: "12px",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
};