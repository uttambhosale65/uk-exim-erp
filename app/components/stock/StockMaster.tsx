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
      background: "#ffffff",
      padding: "14px",
      borderRadius: "10px",
      border: "1px solid #d1d5db",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      width: "100%",
      boxSizing: "border-box",
      overflow: "hidden",
    }}
  >
    {/* =================================================
        HEADER
    ================================================== */}

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        marginBottom: "12px",
        flexWrap: "wrap",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            color: "#14532d",
            fontSize: "18px",
            fontWeight: 700,
          }}
        >
          📦 Stock Report
        </h2>

        <div
          style={{
            marginTop: "4px",
            color: "#6b7280",
            fontSize: "11px",
          }}
        >
          Product-wise Current Stock Details
        </div>
      </div>

      <input
        type="text"
        placeholder="🔍 Search Product / Code / HSN..."
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
        style={{
          width: "300px",
          maxWidth: "100%",
          height: "34px",
          padding: "0 10px",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          fontSize: "12px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>

    {/* =================================================
        SUMMARY
    ================================================== */}

    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "minmax(0, 1fr) auto",
        gap: "8px",
        marginBottom: "12px",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #d1d5db",
          borderRadius: "7px",
          padding: "9px 12px",
          minHeight: "58px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            color: "#6b7280",
            fontSize: "10px",
            fontWeight: 600,
            marginBottom: "4px",
          }}
        >
          TOTAL CURRENT STOCK
        </div>

        <div
          style={{
            color: "#14532d",
            fontSize: "18px",
            fontWeight: 800,
          }}
        >
          {totalStock}
        </div>
      </div>

      <button
        type="button"
        onClick={handleResetStock}
        style={{
          padding: "0 14px",
          background: "#dc2626",
          color: "#ffffff",
          border: "none",
          borderRadius: "7px",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "11px",
          minHeight: "58px",
          whiteSpace: "nowrap",
        }}
      >
        🗑️ Reset Stock
      </button>
    </div>

    {/* =================================================
        STOCK TABLE
    ================================================== */}

    <StockTable stock={filteredStock} />

  </div>
);
}