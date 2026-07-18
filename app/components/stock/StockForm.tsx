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
    } as Stock;

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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px",
        background: "#fff",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>
        {editingStock ? "✏️ Edit Stock" : "📦 Stock Entry"}
      </h2>

      <>
  <div>
    <label style={{ fontWeight: "bold" }}>Product Code *</label>
    <input
      style={inputStyle}
      name="productCode"
      placeholder="Enter Product Code"
      value={stock.productCode}
      onChange={handleChange}
      required
    />
  </div>

  <div>
    <label style={{ fontWeight: "bold" }}>Product Name *</label>
    <input
      style={inputStyle}
      name="productName"
      placeholder="Enter Product Name"
      value={stock.productName}
      onChange={handleChange}
      required
    />
  </div>

  <div>
    <label style={{ fontWeight: "bold" }}>HSN Code</label>
    <input
      style={inputStyle}
      name="hsn"
      placeholder="Enter HSN Code"
      value={stock.hsn}
      onChange={handleChange}
    />
  </div>

  <div>
    <label style={{ fontWeight: "bold" }}>Unit</label>
    <input
      style={inputStyle}
      name="unit"
      placeholder="Packet / Kg / Box"
      value={stock.unit}
      onChange={handleChange}
    />
  </div>

  <div>
    <label style={{ fontWeight: "bold" }}>Opening Stock</label>
    <input
      style={inputStyle}
      type="number"
      name="openingStock"
      value={stock.openingStock}
      onChange={handleChange}
      min={0}
    />
  </div>

  <div>
    <label style={{ fontWeight: "bold" }}>Purchase Qty</label>
    <input
      style={inputStyle}
      type="number"
      name="purchaseQty"
      value={stock.purchaseQty}
      onChange={handleChange}
      min={0}
    />
  </div>

  <div>
    <label style={{ fontWeight: "bold" }}>Sales Qty</label>
    <input
      style={inputStyle}
      type="number"
      name="salesQty"
      value={stock.salesQty}
      onChange={handleChange}
      min={0}
    />
  </div>

  <div>
    <label style={{ fontWeight: "bold" }}>Current Stock</label>
    <input
      style={{
        ...inputStyle,
        background: "#f5f5f5",
        fontWeight: "bold",
      }}
      value={stock.currentStock}
      readOnly
    />
  </div>
</>

      <div style={{ marginTop: "20px" }}>
        <button
          type="submit"
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {editingStock ? "Update Stock" : "Save Stock"}
        </button>
      </div>
    </form>
  );
}