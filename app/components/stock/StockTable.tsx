"use client";

import React from "react";
import { Stock } from "./StockTypes";

type StockTableProps = {
  stock: Stock[];
};

export default function StockTable({
  stock,
}: StockTableProps) {
 return (
  <div
    style={{
      width: "100%",
      overflow: "hidden",
      border: "1px solid #d1d5db",
      borderRadius: "7px",
      boxSizing: "border-box",
    }}
  >
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        tableLayout: "fixed",
        fontSize: "10px",
      }}
    >
      <thead>
        <tr
          style={{
            background: "#14532d",
            color: "#ffffff",
          }}
        >
          <th style={{ ...thStyle, width: "13%" }}>
            Product Code
          </th>

          <th style={{ ...thStyle, width: "25%" }}>
            Product Name
          </th>

          <th style={{ ...thStyle, width: "12%" }}>
            HSN
          </th>

          <th style={{ ...thStyle, width: "9%" }}>
            Unit
          </th>

          <th style={{ ...thStyle, width: "10%" }}>
            Opening
          </th>

          <th style={{ ...thStyle, width: "10%" }}>
            Purchase
          </th>

          <th style={{ ...thStyle, width: "10%" }}>
            Sales
          </th>

          <th style={{ ...thStyle, width: "11%" }}>
            Current Stock
          </th>
        </tr>
      </thead>

      <tbody>
        {stock.length === 0 ? (
          <tr>
            <td
              colSpan={8}
              style={{
                ...tdStyle,
                textAlign: "center",
                padding: "30px",
                color: "#6b7280",
                fontWeight: 600,
              }}
            >
              📋 No Stock Records Found
            </td>
          </tr>
        ) : (
          stock.map((item, index) => (
            <tr
              key={item.id}
              style={{
                background:
                  index % 2 === 0
                    ? "#ffffff"
                    : "#f8fafc",
              }}
            >
              <td
                style={{
                  ...tdStyle,
                  fontWeight: 700,
                  color: "#14532d",
                }}
              >
                {item.productCode}
              </td>

              <td
                style={{
                  ...tdStyle,
                  fontWeight: 600,
                }}
              >
                {item.productName}
              </td>

              <td style={tdCenter}>
                {item.hsn}
              </td>

              <td style={tdCenter}>
                {item.unit}
              </td>

              <td style={tdNumber}>
                {Number(
                  item.openingStock || 0
                ).toFixed(2)}
              </td>

              <td style={tdNumber}>
                {Number(
                  item.purchaseQty || 0
                ).toFixed(2)}
              </td>

              <td style={tdNumber}>
                {Number(
                  item.salesQty || 0
                ).toFixed(2)}
              </td>

              <td
                style={{
                  ...tdNumber,
                  fontWeight: 800,
                  color:
                    Number(
                      item.currentStock || 0
                    ) > 0
                      ? "#14532d"
                      : "#dc2626",
                }}
              >
                {Number(
                  item.currentStock || 0
                ).toFixed(2)}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
}

const tdNumber: React.CSSProperties = {
  border: "1px solid #d1d5db",
  padding: "5px 4px",
  textAlign: "right",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: "9px",
  lineHeight: 1.2,
  verticalAlign: "middle",
  boxSizing: "border-box",
};

const thStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "12px",
  textAlign: "center",
  fontWeight: "bold",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "10px",
};

const tdCenter: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "10px",
  textAlign: "center",
};