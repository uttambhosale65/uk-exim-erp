"use client";

import { useEffect, useState } from "react";
import { Product } from "./ProductTypes";

type ProductFormProps = {
  productCode: string;
  editingProduct?: Product | null;
  onSave: (product: Product) => void;
  onCancelEdit?: () => void;
};

export default function ProductForm({
  productCode,
  editingProduct,
  onSave,
  onCancelEdit,
}: ProductFormProps) {
  const emptyProduct = (): Product => ({
    id: crypto.randomUUID(),
    code: productCode,

    // Basic Details
    name: "",
    category: "Spices",

    // Tax Details
    hsn: "",
    gst: "5%",

    // Product Details
    unit: "Gram",
    netWeight: 0,

    // Pricing
    purchase: 0,
    sale: 0,
    mrp: 0,

    // Stock
    stock: 0,
    minimumStock: 0,

    // Status
    active: true,
  });

  const [product, setProduct] =
    useState<Product>(emptyProduct());

  useEffect(() => {
    if (editingProduct) {
      setProduct(editingProduct);
    } else {
      setProduct((prev) => ({
        ...prev,
        code: productCode,
      }));
    }
  }, [productCode, editingProduct]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (
        e.target as HTMLInputElement
      ).checked;

      setProduct((prev) => ({
        ...prev,
        [name]: checked,
      }));

      return;
    }

    setProduct((prev) => ({
      ...prev,
      [name]:
        name === "netWeight" ||
        name === "purchase" ||
        name === "sale" ||
        name === "mrp" ||
        name === "stock" ||
        name === "minimumStock"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!product.name.trim()) {
      alert("Please enter Product Name");
      return;
    }

    onSave(product);

    setProduct({
      ...emptyProduct(),
      code: productCode,
    });

    onCancelEdit?.();
  };

  const handleReset = () => {
    setProduct({
      ...emptyProduct(),
      code: productCode,
    });

    onCancelEdit?.();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "40px",
    padding: "0 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(6, minmax(160px, 1fr))",
          gap: "10px",
        }}
      >
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Product Code
          </label>
          <input
            type="text"
            value={product.code}
            readOnly
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Product Name *
          </label>
          <input
            type="text"
            name="name"
            value={product.name}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Category
          </label>
          <input
            type="text"
            name="category"
            value={product.category}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            HSN Code
          </label>
          <input
            type="text"
            name="hsn"
            value={product.hsn}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            GST
          </label>
          <select
            name="gst"
            value={product.gst}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="0%">0%</option>
            <option value="5%">5%</option>
            <option value="12%">12%</option>
            <option value="18%">18%</option>
            <option value="28%">28%</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Unit
          </label>
          <select
            name="unit"
            value={product.unit}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="Gram">Gram</option>
            <option value="KG">KG</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Net Weight
          </label>
          <input
            type="number"
            name="netWeight"
            value={product.netWeight}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Purchase Price
          </label>
          <input
            type="number"
            name="purchase"
            value={product.purchase}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Sale Price
          </label>
          <input
            type="number"
            name="sale"
            value={product.sale}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            MRP
          </label>
          <input
            type="number"
            name="mrp"
            value={product.mrp}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Opening Stock
          </label>
          <input
            type="number"
            name="stock"
            value={product.stock}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Minimum Stock
          </label>
          <input
            type="number"
            name="minimumStock"
            value={product.minimumStock}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Status
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              height: "40px",
              gap: "8px",
            }}
          >
            <input
              type="checkbox"
              name="active"
              checked={product.active}
              onChange={handleChange}
            />
            Active Product
          </label>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "10px",
            gridColumn: "span 2",
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={{
              flex: 1,
              height: "40px",
              border: "none",
              borderRadius: "6px",
              background: "#6b7280",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔄 Reset
          </button>

          <button
            type="submit"
            style={{
              flex: 1,
              height: "40px",
              border: "none",
              borderRadius: "6px",
              background: "#14532d",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            💾 {editingProduct ? "Update Product" : "Save Product"}
          </button>
        </div>
      </div>
    </form>
  );
}