"use client";

import { useMemo, useState } from "react";
import { Stock } from "./StockTypes";

type StockTableProps = {
  stock: Stock[];
  onEdit: (item: Stock) => void;
  onDelete: (id: string) => void;
};

export default function StockTable({
  stock,
  onEdit,
  onDelete,
}: StockTableProps) {
  const [search, setSearch] = useState("");

  const filteredStock = useMemo(() => {
    return stock.filter(
      (item) =>
        item.productCode.toLowerCase().includes(search.toLowerCase()) ||
        item.productName.toLowerCase().includes(search.toLowerCase())
    );
  }, [stock, search]);

  return (
    <div style={{ marginTop: 30 }}>
      <h2>📦 Stock List</h2>

      <input
        type="text"
        placeholder="Search Product Code / Product Name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "20px",
          border: "1px solid #ccc",
          borderRadius: "6px",
          boxSizing: "border-box",
        }}
      />

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "1200px",
          }}
        >
          <thead>
            <tr style={{ background: "#f2f2f2" }}>
              <th style={thStyle}>Product Code</th>
              <th style={thStyle}>Product Name</th>
              <th style={thStyle}>HSN</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Opening</th>
              <th style={thStyle}>Purchase</th>
              <th style={thStyle}>Sales</th>
              <th style={thStyle}>Current</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredStock.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
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
              filteredStock.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.productCode}</td>
                  <td style={tdStyle}>{item.productName}</td>
                  <td style={tdStyle}>{item.hsn}</td>
                  <td style={tdStyle}>{item.unit}</td>
                  <td style={tdCenter}>{item.openingStock}</td>
                  <td style={tdCenter}>{item.purchaseQty}</td>
                  <td style={tdCenter}>{item.salesQty}</td>
                  <td style={tdCenter}>{item.currentStock}</td>

                  <td
                    style={{
                      ...tdCenter,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <button
                      onClick={() => onEdit(item)}
                      style={{
                        padding: "6px 12px",
                        marginRight: "8px",
                        background: "#1976d2",
                        color: "#fff",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Delete this stock record?"
                          )
                        ) {
                          onDelete(item.id);
                        }
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "#d32f2f",
                        color: "#fff",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
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
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "10px",
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