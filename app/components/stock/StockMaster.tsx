"use client";

import { useEffect, useState } from "react";

import StockTable from "./StockTable";
import { Stock } from "./StockTypes";
import {
  loadStock,
  resetStock,
} from "./StockStorage";

export default function StockMaster() {
  const [stock, setStock] = useState<Stock[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setStock(loadStock());
  }, []);

  const handleResetStock = () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset all stock?\n\nThis will clear the current stock records."
    );

    if (!confirmed) return;

    resetStock();

    setStock([]);
  };

  const filteredStock = stock.filter(
    (item) =>
      item.productName
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      item.productCode
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      item.hsn.includes(search)
  );

  const totalStock = filteredStock.reduce(
    (total, item) =>
      total + Number(item.currentStock || 0),
    0
  );

  return (
    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        📦 Stock Report
      </h2>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "15px",
          alignItems: "center",
          gap: "15px",
        }}
      >
        <input
          type="text"
          placeholder="Search Product / Code / HSN..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            width: "320px",
            maxWidth: "100%",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            boxSizing: "border-box",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
          }}
        >
          <h3 style={{ margin: 0 }}>
            Total Stock : {totalStock}
          </h3>

          <button
            type="button"
            onClick={handleResetStock}
            style={{
              padding: "9px 14px",
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            🗑️ Reset Stock
          </button>
        </div>
      </div>

      <StockTable stock={filteredStock} />
    </div>
  );
}