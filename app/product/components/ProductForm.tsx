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
  const [category, setCategory] = useState("Spices");

  const [hsnCode, setHsnCode] = useState("");
  const [gst, setGst] = useState("5%");

  const [unit, setUnit] = useState<"Gram" | "KG">("Gram");
  const [netWeight, setNetWeight] = useState("");

  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [mrp, setMrp] = useState("");

  const [openingStock, setOpeningStock] = useState("");
  const [minimumStock, setMinimumStock] = useState("");

  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!editingProduct) return;

    setProductCode(editingProduct.code);
    setProductName(editingProduct.name);
    setCategory(editingProduct.category);

    setHsnCode(editingProduct.hsn);
    setGst(editingProduct.gst);

    setUnit(editingProduct.unit);
    setNetWeight(String(editingProduct.netWeight));

    setPurchasePrice(String(editingProduct.purchase));
    setSalePrice(String(editingProduct.sale));
    setMrp(String(editingProduct.mrp));

    setOpeningStock(String(editingProduct.stock));
    setMinimumStock(String(editingProduct.minimumStock));

    setActive(editingProduct.active);
  }, [editingProduct]);

  useEffect(() => {
    if (editingProduct) return;

    setProductCode(
      `P${String(products.length + 1).padStart(4, "0")}`
    );
  }, [products, editingProduct]);
  const resetForm = () => {
    setProductName("");
    setCategory("Spices");

    setHsnCode("");
    setGst("5%");

    setUnit("Gram");
    setNetWeight("");

    setPurchasePrice("");
    setSalePrice("");
    setMrp("");

    setOpeningStock("");
    setMinimumStock("");

    setActive(true);

    if (!editingProduct) {
      setProductCode(
        `P${String(products.length + 1).padStart(4, "0")}`
      );
    }
  };

  const saveProduct = () => {
    if (productName.trim() === "") {
      alert("Please enter Product Name");
      return;
    }

    if (netWeight.trim() === "") {
      alert("Please enter Net Weight");
      return;
    }

    const product: Product = {
      id: editingProduct
        ? editingProduct.id
        : crypto.randomUUID(),

      code: productCode,
      name: productName,
      category: category,

      hsn: hsnCode,
      gst: gst,

      unit: unit,
      netWeight: Number(netWeight),

      purchase: Number(purchasePrice) || 0,
      sale: Number(salePrice) || 0,
      mrp: Number(mrp) || 0,

      stock: Number(openingStock) || 0,
      minimumStock: Number(minimumStock) || 0,

      active: active,
    };

    onSave(product);

    alert(
      editingProduct
        ? "Product Updated Successfully"
        : "Product Saved Successfully"
    );

    resetForm();
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    marginTop: "5px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
    outline: "none",
  } as const;

  return (
    <div
      style={{
        background: "#ffffff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        marginBottom: "30px",
      }}
    >
      <h2 style={{ color: "#14532d", marginBottom: "20px" }}>
        📦 Product Master
      </h2>
<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  }}
></div>
      <label>Product Code</label>
      <input
        type="text"
        value={productCode}
        readOnly
        style={inputStyle}
      />

      <label>Product Name</label>
      <input
        type="text"
        value={productName}
        onChange={(e) => setProductName(e.target.value)}
        style={inputStyle}
      />

      <label>Category</label>
      <input
        type="text"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={inputStyle}
      />

      <label>HSN Code</label>
      <input
        type="text"
        value={hsnCode}
        onChange={(e) => setHsnCode(e.target.value)}
        style={inputStyle}
      />

      <label>GST</label>
      <select
        value={gst}
        onChange={(e) => setGst(e.target.value)}
        style={inputStyle}
      >
        <option value="0%">0%</option>
        <option value="5%">5%</option>
        <option value="12%">12%</option>
        <option value="18%">18%</option>
        <option value="28%">28%</option>
      </select>

      <label>Unit of Measure</label>
      <select
        value={unit}
        onChange={(e) =>
          setUnit(e.target.value as "Gram" | "KG")
        }
        style={inputStyle}
      >
        <option value="Gram">Gram</option>
        <option value="KG">KG</option>
      </select>

      <label>Net Weight</label>
      <input
        type="number"
        value={netWeight}
        onChange={(e) => setNetWeight(e.target.value)}
        style={inputStyle}
      />

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

      <label>Minimum Stock</label>
      <input
        type="number"
        value={minimumStock}
        onChange={(e) => setMinimumStock(e.target.value)}
        style={inputStyle}
      />

      <div style={{ marginBottom: "20px" }}>
        <label>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          Active Product
        </label>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={saveProduct}
          style={{
            background: "#14532d",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {editingProduct ? "💾 Update Product" : "💾 Save Product"}
        </button>

        <button
          type="button"
          onClick={resetForm}
          style={{
            background: "#6b7280",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🔄 Reset
        </button>
      </div>
    </div>
  );
}