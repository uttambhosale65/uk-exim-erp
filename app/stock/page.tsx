"use client";

import { useEffect, useState } from "react";

import StockForm from "../components/stock/StockForm";
import StockTable from "../components/stock/StockTable";

import { Stock } from "../components/stock/StockTypes";

import {
  loadStock,
  saveStock,
  getNextStockId,
} from "../components/stock/StockStorage";

export default function StockPage() {
  const [stock, setStock] = useState<Stock[]>([]);
  const [stockId, setStockId] = useState("");

  useEffect(() => {
    const data = loadStock();
    setStock(data);
    setStockId(getNextStockId(data));
  }, []);

  useEffect(() => {
    saveStock(stock);
    setStockId(getNextStockId(stock));
  }, [stock]);

  const addStock = (item: Stock) => {
    setStock((prev) => [...prev, item]);
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1>📦 UK EXIM ERP - Stock Master</h1>

      <StockForm
        stockId={stockId}
        onSave={addStock}
      />

      <br />

      <StockTable stock={stock} />
    </div>
  );
}