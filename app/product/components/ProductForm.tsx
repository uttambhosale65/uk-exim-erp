"use client";

import { useEffect, useState } from "react";
import { Product } from "./ProductTypes";

type ProductFormProps = {
  products: Product[];
  onSave: (product: Product) => void;
  editingProduct?: Product | null;
};

export default function ProductForm({
  products,
  onSave,
  editingProduct,
}: ProductFormProps) {
  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [gst, setGst] = useState("5%");
  const [unit, setUnit] = useState("Packet");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [openingStock, setOpeningStock] = useState("");
useEffect(() => {
  if (!editingProduct) return;

  setProductCode(editingProduct.code);
  setProductName(editingProduct.name);
  setHsnCode(editingProduct.hsn);
  setGst(editingProduct.gst);
  setUnit(editingProduct.unit);
  setPurchasePrice(String(editingProduct.purchase));
  setSalePrice(String(editingProduct.sale));
  setMrp(String(editingProduct.mrp));
  setOpeningStock(String(editingProduct.stock));
}, [editingProduct]);
 useEffect(() => {
  if (editingProduct) return;

  setProductCode(
    `P${String(products.length + 1).padStart(4, "0")}`
  );
}, [products, editingProduct]);
  const resetForm = () => {
    setProductName("");
    setHsnCode("");
    setGst("5%");
    setUnit("Packet");
    setPurchasePrice("");
    setSalePrice("");
    setMrp("");
    setOpeningStock("");
  };

  const saveProduct = () => {
    if (productName.trim() === "") {
      alert("Enter Product Name");
      return;
    }

   const product: Product = {
  id: editingProduct ? editingProduct.id : crypto.randomUUID(),
  code: productCode,
      name: productName,
      hsn: hsnCode,
      gst,
      unit,
      purchase: Number(purchasePrice) || 0,
      sale: Number(salePrice) || 0,
      mrp: Number(mrp) || 0,
      stock: Number(openingStock) || 0,
    };
if (editingProduct) {
  product.id = editingProduct.id;
}
    onSave(product);

    alert("Product Saved Successfully");

    resetForm();
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    marginTop: "5px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "15px",
  } as const;

  return (
    <div
      style={{
        background: "#fff",
        padding: "25px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        marginBottom: "25px",
      }}
    >
      <h2 style={{ color: "#14532d" }}>
        📦 Product Master
      </h2>

      <label>Product Code</label>
      <input value={productCode} readOnly style={inputStyle} />

      <label>Product Name</label>
      <input
        value={productName}
        onChange={(e) => setProductName(e.target.value)}
        style={inputStyle}
      />

      <label>HSN Code</label>
      <input
        value={hsnCode}
        onChange={(e) => setHsnCode(e.target.value)}
        style={inputStyle}
      />

      <label>GST %</label>
      <select
        value={gst}
        onChange={(e) => setGst(e.target.value)}
        style={inputStyle}
      >
        <option>0%</option>
        <option>5%</option>
        <option>12%</option>
        <option>18%</option>
        <option>28%</option>
      </select>

      <label>Unit</label>
      <select
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        style={inputStyle}
      >
        <option>Kg</option>
        <option>Gram</option>
        <option>Packet</option>
        <option>Box</option>
      </select>

      <label>Purchase Price</label>
      <input
        type="number"
        value={purchasePrice}
        onChange={(e) => setPurchasePrice(e.target.value)}
        style={inputStyle}
      />

      <label>Sale Price</label>
      <input
        type="number"
        value={salePrice}
        onChange={(e) => setSalePrice(e.target.value)}
        style={inputStyle}
      />

      <label>MRP</label>
      <input
        type="number"
        value={mrp}
        onChange={(e) => setMrp(e.target.value)}
        style={inputStyle}
      />

      <label>Opening Stock</label>
      <input
        type="number"
        value={openingStock}
        onChange={(e) => setOpeningStock(e.target.value)}
        style={inputStyle}
      />

      <div style={{ marginTop: "10px" }}>
        <button
          onClick={saveProduct}
          style={{
            background: "#14532d",
            color: "#fff",
            padding: "12px 25px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginRight: "10px",
          }}
        >
         {editingProduct ? "💾 Update Product" : "💾 Save Product"}
        </button>

        <button
          onClick={resetForm}
          style={{
            background: "#666",
            color: "#fff",
            padding: "12px 25px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🔄 Reset
          {editingProduct && (
  <button
    onClick={resetForm}
    style={{
      background: "#dc2626",
      color: "#fff",
      padding: "12px 25px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      marginLeft: "10px",
    }}
  >
    ❌ Cancel Edit
  </button>
)}
        </button>
      </div>
    </div>
  );
}