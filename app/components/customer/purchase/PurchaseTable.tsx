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
        border: "1px solid #dbe3ea",
        borderRadius: "8px",
        background: "#ffffff",
      }}
    >
      <table
        style={{
          width: "100%",
          minWidth: "1150px",
          borderCollapse: "collapse",
          fontSize: "14px",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#0F4C81",
              color: "#ffffff",
              position: "sticky",
              top: 0,
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
                  padding: "30px",
                  textAlign: "center",
                  color: "#6b7280",
                  fontWeight: 600,
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
                  transition: "0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "#eef6ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    index % 2 === 0
                      ? "#ffffff"
                      : "#f8fafc";
                }}
              >
                <td style={tdStyle}>{index + 1}</td>

                <td style={tdStyle}>
                  {purchase.purchaseNo}
                </td>

                <td style={tdStyle}>
                  {purchase.purchaseDate}
                </td>

                <td style={tdStyle}>
                  {purchase.supplierName}
                </td>

                <td style={tdStyle}>
                  {purchase.productName}
                </td>

                <td style={tdStyle}>
                  {purchase.hsn}
                </td>

                <td style={tdStyle}>
                  {purchase.unit}
                </td>

                <td
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                  }}
                >
                  {purchase.qty}
                </td>

                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                  }}
                >
                  ₹ {purchase.rate}
                </td>

                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#0f4c81",
                  }}
                >
                  ₹ {purchase.amount}
                </td>

                <td
                  style={{
                    ...tdStyle,
                    whiteSpace: "nowrap",
                  }}
                >
                  <button
                    onClick={() =>
                      onEdit(purchase)
                    }
                    style={{
                      padding: "6px 12px",
                      marginRight: "6px",
                      border: "none",
                      borderRadius: "4px",
                      background: "#2563eb",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    ✏️ Edit
                  </button>

                  <button
                    onClick={() =>
                      onDelete(purchase.id)
                    }
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "4px",
                      background: "#dc2626",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "13px",
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
  padding: "10px 12px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: 700,
  borderBottom: "2px solid #0c3d66",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: "13px",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "middle",
};