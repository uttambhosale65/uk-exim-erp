"use client";

import { Product } from "./ProductTypes";

type ProductTableProps = {
  products: Product[];
};

export default function ProductTable({
  products,
}: ProductTableProps) {
  const thStyle = {
    border: "1px solid #ddd",
    padding: "10px",
    background: "#14532d",
    color: "#fff",
    textAlign: "left" as const,
  };

  const tdStyle = {
    border: "1px solid #ddd",
    padding: "10px",
  };

  return (
    <div
      style={{
        marginTop: "30px",
        background: "#ffffff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <h2 style={{ color: "#14532d", marginBottom: "20px" }}>
        📋 Product List
      </h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Code</th>
            <th style={thStyle}>Product</th>
            <th style={thStyle}>HSN</th>
            <th style={thStyle}>GST</th>
            <th style={thStyle}>Unit</th>
            <th style={thStyle}>Purchase</th>
            <th style={thStyle}>Sale</th>
            <th style={thStyle}>MRP</th>
            <th style={thStyle}>Stock</th>
          </tr>
        </thead>

        <tbody>
          {products.map((item) => (
            <tr key={item.code}>
              <td style={tdStyle}>{item.code}</td>
              <td style={tdStyle}>{item.name}</td>
              <td style={tdStyle}>{item.hsn}</td>
              <td style={tdStyle}>{item.gst}</td>
              <td style={tdStyle}>{item.unit}</td>
              <td style={tdStyle}>₹{item.purchase}</td>
              <td style={tdStyle}>₹{item.sale}</td>
              <td style={tdStyle}>₹{item.mrp}</td>
              <td style={tdStyle}>{item.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {products.length === 0 && (
        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            color: "#777",
          }}
        >
          No Products Found
        </p>
      )}
    </div>
  );
}