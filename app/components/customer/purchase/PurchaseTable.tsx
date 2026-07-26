"use client";

import { useMemo, useState } from "react";

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
  const [search, setSearch] = useState("");

  const filteredPurchases = useMemo(() => {
    const keyword = search.toLowerCase();

    return purchases.filter(
      (purchase) =>
        purchase.purchaseNo.toLowerCase().includes(keyword) ||
        purchase.supplierName.toLowerCase().includes(keyword) ||
        purchase.productName.toLowerCase().includes(keyword) ||
        purchase.invoiceNo.toLowerCase().includes(keyword)
    );
  }, [purchases, search]);

  return (
    <>
      <div
        style={{
          margin: "15px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search Purchase..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "320px",
            padding: "10px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        />
      </div>

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
            minWidth: "1450px",
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
              <th style={thStyle}>Invoice</th>
              <th style={thStyle}>Supplier</th>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>HSN</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Rate</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>GST %</th>
              <th style={thStyle}>GST Amount</th>
              <th style={thStyle}>Net Amount</th>
              <th style={thStyle}>Remarks</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredPurchases.length === 0 ? (
              <tr>
                <td
                  colSpan={16}
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
              filteredPurchases.map((purchase, index) => (
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
                  <td style={tdStyle}>{purchase.invoiceNo}</td>
                  <td style={tdStyle}>{purchase.supplierName}</td>
                  <td style={tdStyle}>{purchase.productName}</td>
                  <td style={tdStyle}>{purchase.hsn}</td>
                  <td style={tdStyle}>{purchase.unit}</td>

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
                  ₹ {(purchase.rate ?? 0).toFixed(2)}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                    }}
                  >
                   ₹ {(purchase.amount ?? 0).toFixed(2)}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                    }}
                  >
                    {purchase.gst}%
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                    }}
                  >
                  ₹ {(purchase.gstAmount ?? 0).toFixed(2)}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#0F4C81",
                    }}
                  >
                  ₹ {(purchase.netAmount ?? 0).toFixed(2)}
                  </td>

                  <td style={tdStyle}>
                    {purchase.remarks || "-"}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <button
                      onClick={() => onEdit(purchase)}
                      style={{
                        padding: "6px 12px",
                        marginRight: "6px",
                        border: "none",
                        borderRadius: "4px",
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
                        borderRadius: "4px",
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
    </>
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