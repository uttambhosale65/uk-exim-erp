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
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "1000px",
        }}
      >
        <thead>
          <tr style={{ background: "#1976d2", color: "#fff" }}>
            <th style={thStyle}>Product Code</th>
            <th style={thStyle}>Product Name</th>
            <th style={thStyle}>HSN</th>
            <th style={thStyle}>Unit</th>
            <th style={thStyle}>Opening</th>
            <th style={thStyle}>Purchase</th>
            <th style={thStyle}>Sales</th>
            <th style={thStyle}>Current Stock</th>
          </tr>
        </thead>

        <tbody>
          {stock.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                style={{
                  textAlign: "center",
                  padding: "20px",
                  border: "1px solid #ddd",
                }}
              >
                No Stock Records Found
              </td>
            </tr>
          ) : (
            stock.map((item, index) => (
              <tr
                key={item.id}
                style={{
                  background:
                    index % 2 === 0 ? "#ffffff" : "#f8fafc",
                }}
              >
                <td style={tdStyle}>{item.productCode}</td>
                <td style={tdStyle}>{item.productName}</td>
                <td style={tdCenter}>{item.hsn}</td>
                <td style={tdCenter}>{item.unit}</td>
                <td style={tdCenter}>{item.openingStock}</td>
                <td style={tdCenter}>{item.purchaseQty}</td>
                <td style={tdCenter}>{item.salesQty}</td>

                <td
                  style={{
                    ...tdCenter,
                    fontWeight: "bold",
                    color:
                      item.currentStock > 0
                        ? "#2e7d32"
                        : "#d32f2f",
                  }}
                >
                  {item.currentStock}
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