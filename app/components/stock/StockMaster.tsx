"use client";

import { useEffect, useState } from "react";

import StockTable from "./StockTable";
import { Stock } from "./StockTypes";
import { loadStock } from "./StockStorage";

export default function StockMaster() {
  const [stock, setStock] = useState<Stock[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setStock(loadStock());
  }, []);

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

  return (
    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
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
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "6px",
          }}
        />

        <h3 style={{ margin: 0 }}>
          Total Stock :
          {" "}
          {filteredStock.reduce(
            (total, item) =>
              total + item.currentStock,
            0
          )}
        </h3>
      </div>

      <StockTable stock={filteredStock} />
    </div>
  );
}