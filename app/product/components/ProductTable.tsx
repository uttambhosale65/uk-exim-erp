"use client";

import { useState } from "react";
import { Product } from "./ProductTypes";

type ProductTableProps = {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
};

export default function ProductTable({
  products,
  onEdit,
  onDelete,
}: ProductTableProps) {
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.hsn.toLowerCase().includes(search.toLowerCase())
  );

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

      <input
        type="text"
        placeholder="🔍 Search Product..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "20px",
          border: "1px solid #ccc",
          borderRadius: "6px",
          fontSize: "15px",
        }}
      />

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
            <th style={thStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredProducts.map((item) => (
            <tr key={item.id}>
              <td style={tdStyle}>{item.code}</td>
              <td style={tdStyle}>{item.name}</td>
              <td style={tdStyle}>{item.hsn}</td>
              <td style={tdStyle}>{item.gst}</td>
              <td style={tdStyle}>{item.unit}</td>
              <td style={tdStyle}>₹{item.purchase}</td>
              <td style={tdStyle}>₹{item.sale}</td>
              <td style={tdStyle}>₹{item.mrp}</td>
              <td style={tdStyle}>{item.stock}</td>
              <td style={tdStyle}>
                <button
                  onClick={() => onEdit(item)}
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    padding: "6px 10px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    marginRight: "8px",
                  }}
                >
                  ✏️ Edit
                </button>

                <button
                  onClick={() => onDelete(item.id)}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    padding: "6px 10px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  🗑 Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredProducts.length === 0 && (
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