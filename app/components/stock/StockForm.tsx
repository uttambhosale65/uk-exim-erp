"use client";

import { useState } from "react";
import { Stock } from "./StockTypes";

type StockFormProps = {
  stockId: string;
  onSave: (stock: Stock) => void;
};

export default function StockForm({
  stockId,
  onSave,
}: StockFormProps) {
  const [stock, setStock] = useState<Stock>({
    id: "",
    productCode: "",
    productName: "",
    unit: "",
    openingStock: 0,
    purchaseQty: 0,
    salesQty: 0,
    currentStock: 0,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    const updated = {
      ...stock,
      [name]:
        name === "openingStock" ||
        name === "purchaseQty" ||
        name === "salesQty"
          ? Number(value)
          : value,
    };

    updated.currentStock =
      updated.openingStock +
      updated.purchaseQty -
      updated.salesQty;

    setStock(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    onSave({
      ...stock,
      id: stockId,
    });

    setStock({
      id: "",
      productCode: "",
      productName: "",
      unit: "",
      openingStock: 0,
      purchaseQty: 0,
      salesQty: 0,
      currentStock: 0,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Stock Entry</h2>

      <input
        name="productCode"
        placeholder="Product Code"
        value={stock.productCode}
        onChange={handleChange}
      />

      <input
        name="productName"
        placeholder="Product Name"
        value={stock.productName}
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
      />

      <input
        type="number"
        name="purchaseQty"
        placeholder="Purchase Qty"
        value={stock.purchaseQty}
        onChange={handleChange}
      />

      <input
        type="number"
        name="salesQty"
        placeholder="Sales Qty"
        value={stock.salesQty}
        onChange={handleChange}
      />

      <input
        value={stock.currentStock}
        readOnly
        placeholder="Current Stock"
      />

      <br />
      <br />

      <button type="submit">
        Save Stock
      </button>
    </form>
  );
}