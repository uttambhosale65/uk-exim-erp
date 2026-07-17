"use client";

import { useEffect, useState } from "react";
import { Stock } from "./StockTypes";

type StockFormProps = {
  stockId: string;
  editingStock: Stock | null;
  onSave: (stock: Stock) => void;
};

const emptyStock: Stock = {
  id: "",
  productCode: "",
  productName: "",
  hsn: "",
  unit: "",
  openingStock: 0,
  purchaseQty: 0,
  salesQty: 0,
  currentStock: 0,
};

export default function StockForm({
  stockId,
  editingStock,
  onSave,
}: StockFormProps) {
  const [stock, setStock] = useState<Stock>({
    ...emptyStock,
    id: stockId,
  });

  useEffect(() => {
    if (editingStock) {
      setStock(editingStock);
    } else {
      setStock({
        ...emptyStock,
        id: stockId,
      });
    }
  }, [editingStock, stockId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    const updated = {
      ...stock,
      [name]:
        name === "openingStock" ||
        name === "purchaseQty" ||
        name === "salesQty"
          ? Math.max(0, Number(value))
          : value,
    };

    updated.currentStock =
      updated.openingStock +
      updated.purchaseQty -
      updated.salesQty;

    if (updated.currentStock < 0) {
      updated.currentStock = 0;
    }

    setStock(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      stock.productCode.trim() === "" ||
      stock.productName.trim() === ""
    ) {
      alert("Product Code and Product Name are required.");
      return;
    }

    onSave(stock);

    setStock({
      ...emptyStock,
      id: stockId,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: "1px solid #ddd",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px",
      }}
    >
      <h2>
        {editingStock ? "✏️ Edit Stock" : "📦 Stock Entry"}
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,1fr)",
          gap: "10px",
        }}
      >
        <input
          name="productCode"
          placeholder="Product Code"
          value={stock.productCode}
          onChange={handleChange}
          required
        />

        <input
          name="productName"
          placeholder="Product Name"
          value={stock.productName}
          onChange={handleChange}
          required
        />

        <input
          name="hsn"
          placeholder="HSN"
          value={stock.hsn}
          onChange={handleChange}
        />

        <input
          name="unit"
          placeholder="Unit"
          value={stock.unit}
          onChange={handleChange}
        />

        <input
          type="number"
          name="openingStock"
          placeholder="Opening Stock"
          value={stock.openingStock}
          onChange={handleChange}
          min={0}
        />

        <input
          type="number"
          name="purchaseQty"
          placeholder="Purchase Qty"
          value={stock.purchaseQty}
          onChange={handleChange}
          min={0}
        />

        <input
          type="number"
          name="salesQty"
          placeholder="Sales Qty"
          value={stock.salesQty}
          onChange={handleChange}
          min={0}
        />

        <input
          value={stock.currentStock}
          readOnly
          placeholder="Current Stock"
        />
      </div>

      <br />

      <button type="submit">
        {editingStock ? "Update Stock" : "Save Stock"}
      </button>
    </form>
  );
}