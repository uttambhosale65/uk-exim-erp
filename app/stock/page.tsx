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
  const [editingStock, setEditingStock] = useState<Stock | null>(null);

  useEffect(() => {
    const data = loadStock();
    setStock(data);
    setStockId(getNextStockId(data));
  }, []);

  useEffect(() => {
    saveStock(stock);
    setStockId(getNextStockId(stock));
  }, [stock]);

  function handleEditStock(item: Stock) {
    setEditingStock(item);
  }

  function handleDeleteStock(id: string) {
    setStock((prev) => prev.filter((item) => item.id !== id));

    if (editingStock?.id === id) {
      setEditingStock(null);
    }
  }

  function handleSaveStock(item: Stock) {
    if (editingStock) {
      setStock((prev) =>
        prev.map((s) => (s.id === item.id ? item : s))
      );

      setEditingStock(null);
    } else {
      setStock((prev) => [...prev, item]);
    }
  }

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
        editingStock={editingStock}
        onSave={handleSaveStock}
      />

      <br />

      <StockTable
        stock={stock}
        onEdit={handleEditStock}
        onDelete={handleDeleteStock}
      />
    </div>
  );
}