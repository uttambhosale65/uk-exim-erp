"use client";

import { Sales } from "./SalesTypes";
const thStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  padding: "10px",
  textAlign: "center",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: "10px",
  whiteSpace: "nowrap",
};

const tdCenter: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: "10px",
  textAlign: "center",
  whiteSpace: "nowrap",
};
type SalesTableProps = {
  sales: Sales[];
  onEdit: (sale: Sales) => void;
  onDelete: (id: string) => void;
};

export default function SalesTable({
  sales,
  onEdit,
  onDelete,
}: SalesTableProps) {
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
          minWidth: "1400px",
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
            <th style={thStyle}>Sales No</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Customer</th>
            <th style={thStyle}>Product</th>
            <th style={thStyle}>HSN</th>
            <th style={thStyle}>Unit</th>
            <th style={thStyle}>Qty</th>
            <th style={thStyle}>Rate</th>
            <th style={thStyle}>Amount</th>
            <th style={thStyle}>GST %</th>
            <th style={thStyle}>Grand Total</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {sales.length === 0 ? (
            <tr>
              <td
                colSpan={12}
                style={{
                  padding: "20px",
                  textAlign: "center",
                  border: "1px solid #e5e7eb",
                }}
              >
                No Sales Records Found
              </td>
            </tr>
          ) : (
            sales.map((sale, index) => (
              <tr
                key={sale.id}
                style={{
                  background:
                    index % 2 === 0
                      ? "#ffffff"
                      : "#f9fafb",
                }}
              >
                <td style={tdStyle}>
                  {sale.salesNo}
                </td>

                <td style={tdCenter}>
                  {sale.salesDate}
                </td>

                <td style={tdStyle}>
                  {sale.customerName}
                </td>

                <td style={tdStyle}>
                  {sale.productName}
                </td>

                <td style={tdCenter}>
                  {sale.hsn}
                </td>

                <td style={tdCenter}>
                  {sale.unit}
                </td>

                <td style={tdCenter}>
                  {sale.qty}
                </td>

                <td style={tdCenter}>
                  ₹ {sale.rate.toFixed(2)}
                </td>

                <td style={tdCenter}>
                  ₹ {sale.amount.toFixed(2)}
                </td>

                <td style={tdCenter}>
                  {sale.gst}%
                </td>

                <td style={tdCenter}>
                  <span
                    style={{
                      background: "#dcfce7",
                      color: "#166534",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontWeight: 700,
                    }}
                  >
                    ₹ {sale.grandTotal.toFixed(2)}
                  </span>
                </td>

                <td style={tdCenter}>
                  <button
                    onClick={() =>
                      onEdit(sale)
                    }
                    style={{
                      padding: "6px 12px",
                      marginRight: "8px",
                      border: "none",
                      borderRadius: "6px",
                      background: "#2563eb",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      onDelete(sale.id)
                    }
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "6px",
                      background: "#dc2626",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Delete
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