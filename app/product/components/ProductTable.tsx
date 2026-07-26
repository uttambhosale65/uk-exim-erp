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
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.hsn.toLowerCase().includes(search.toLowerCase())
  );

  const thStyle = {
    border: "1px solid #ddd",
    padding: "10px",
    background: "#14532d",
    color: "#fff",
    textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
  };

  const tdStyle = {
    border: "1px solid #ddd",
    padding: "10px",
    whiteSpace: "nowrap" as const,
  };

  return (
    <div
      style={{
        marginTop: "30px",
        background: "#ffffff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        overflowX: "auto",
      }}
    >
      <h2
        style={{
          color: "#14532d",
          marginBottom: "20px",
        }}
      >
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
            <th style={thStyle}>Category</th>
            <th style={thStyle}>HSN</th>
            <th style={thStyle}>GST</th>
            <th style={thStyle}>UOM</th>
            <th style={thStyle}>Net Wt.</th>
            <th style={thStyle}>Purchase</th>
            <th style={thStyle}>Sale</th>
            <th style={thStyle}>MRP</th>
            <th style={thStyle}>Opening</th>
            <th style={thStyle}>Min Stock</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredProducts.map((item) => (
            <tr key={item.id}>
              <td style={tdStyle}>{item.code}</td>
              <td style={tdStyle}>{item.name}</td>
              <td style={tdStyle}>{item.category}</td>
              <td style={tdStyle}>{item.hsn}</td>
              <td style={tdStyle}>{item.gst}</td>
              <td style={tdStyle}>{item.unit}</td>

              <td style={tdStyle}>
                {item.netWeight}
              </td>

              <td style={tdStyle}>
                ₹{item.purchase.toFixed(2)}
              </td>

              <td style={tdStyle}>
                ₹{item.sale.toFixed(2)}
              </td>

              <td style={tdStyle}>
                ₹{item.mrp.toFixed(2)}
              </td>

              <td style={tdStyle}>
                {item.stock}
              </td>

              <td style={tdStyle}>
                {item.minimumStock}
              </td>

              <td style={tdStyle}>
                <span
                  style={{
                    background: item.active
                      ? "#16a34a"
                      : "#dc2626",
                    color: "#fff",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  {item.active
                    ? "Active"
                    : "Inactive"}
                </span>
              </td>

              <td style={tdStyle}>
                <button
                  onClick={() => onEdit(item)}
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    marginRight: "8px",
                  }}
                >
                  ✏️ Edit
                </button>

                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Are you sure you want to delete "${item.name}"?`
                      )
                    ) {
                      onDelete(item.id);
                    }
                  }}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    padding: "6px 12px",
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
        <div
          style={{
            textAlign: "center",
            padding: "25px",
            color: "#6b7280",
            fontWeight: "bold",
          }}
        >
          📦 No Products Found
        </div>
      )}
    </div>
  );
}