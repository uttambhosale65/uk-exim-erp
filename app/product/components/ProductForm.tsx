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

    if (!product.hsn.trim()) {
      alert("Please enter HSN Code");
      return;
    }

    if (product.sale <= 0) {
      alert(
        "Sale Price should be greater than zero"
      );
      return;
    }

    if (product.mrp < product.sale) {
      alert(
        "MRP should not be less than Sale Price"
      );
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

  /* ================================
     COMMON STYLES
  ================================= */

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "40px",
    padding: "0 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    boxSizing: "border-box",
    outline: "none",
    background: "#ffffff",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    color: "#374151",
    marginBottom: "5px",
    whiteSpace: "nowrap",
  };

  const fieldStyle: React.CSSProperties = {
    minWidth: 0,
  };

  return (
    <form onSubmit={handleSubmit}>

      {/* ==========================================
          PRODUCT ENTRY BOX
      =========================================== */}

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d1d5db",
          borderRadius: "10px",
          padding: "18px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >

        {/* TITLE */}

        <h2
          style={{
            margin: "0 0 18px 0",
            color: "#14532d",
            fontSize: "19px",
            fontWeight: 700,
          }}
        >
          📋 Product Entry
        </h2>

        {/* ======================================
            ROW 1 — BASIC PRODUCT DETAILS
        ======================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "110px 2fr 1.15fr 1.2fr 100px 110px",
            gap: "10px",
            alignItems: "end",
          }}
        >

          {/* PRODUCT CODE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Product Code
            </label>

            <input
              type="text"
              value={product.code}
              readOnly
              style={{
                ...inputStyle,
                background: "#f3f4f6",
                fontWeight: 700,
              }}
            />
          </div>

          {/* PRODUCT NAME */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Product Name *
            </label>

            <input
              type="text"
              name="name"
              value={product.name}
              onChange={handleChange}
              required
              placeholder="Enter Product Name"
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* CATEGORY */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Category
            </label>

            <input
              type="text"
              name="category"
              value={product.category}
              onChange={handleChange}
              placeholder="Category"
              style={inputStyle}
            />
          </div>

          {/* HSN CODE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              HSN Code *
            </label>

            <input
              type="text"
              name="hsn"
              value={product.hsn}
              onChange={handleChange}
              required
              placeholder="Enter HSN Code"
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* GST */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              GST
            </label>

            <select
              name="gst"
              value={product.gst}
              onChange={handleChange}
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            >
              <option value="0%">0%</option>
              <option value="5%">5%</option>
              <option value="12%">12%</option>
              <option value="18%">18%</option>
              <option value="28%">28%</option>
            </select>
          </div>

          {/* UNIT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Unit
            </label>

            <select
              name="unit"
              value={product.unit}
              onChange={handleChange}
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            >
              <option value="Gram">
                Gram
              </option>

              <option value="KG">
                KG
              </option>
            </select>
          </div>
        </div>

        {/* ======================================
            ROW 2 — PRICE + STOCK + ACTION
        ======================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1.15fr 1.15fr 1fr 1.15fr 1fr 110px auto auto",
            gap: "10px",
            alignItems: "end",
            marginTop: "14px",
          }}
        >

          {/* NET WEIGHT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Net Weight
            </label>

            <input
              type="number"
              name="netWeight"
              value={product.netWeight}
              onChange={handleChange}
              min="0"
              step="0.01"
              style={inputStyle}
            />
          </div>

          {/* PURCHASE PRICE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Purchase Price
            </label>

            <input
              type="number"
              name="purchase"
              value={product.purchase}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="Purchase Price"
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* SALE PRICE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Sale Price *
            </label>

            <input
              type="number"
              name="sale"
              value={product.sale}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="Sale Price"
              required
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* MRP */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              MRP
            </label>

            <input
              type="number"
              name="mrp"
              value={product.mrp}
              onChange={handleChange}
              min="0"
              step="0.01"
              style={inputStyle}
            />
          </div>

          {/* OPENING STOCK */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Opening Stock
            </label>

            <input
              type="number"
              name="stock"
              value={product.stock}
              onChange={handleChange}
              min="0"
              step="0.01"
              style={inputStyle}
            />
          </div>

          {/* MIN STOCK */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Min Stock
            </label>

            <input
              type="number"
              name="minimumStock"
              value={product.minimumStock}
              onChange={handleChange}
              min="0"
              step="0.01"
              style={inputStyle}
            />
          </div>

          {/* STATUS */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Status
            </label>

            <label
              style={{
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "6px",
                background:
                  product.active
                    ? "#f0fdf4"
                    : "#f3f4f6",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              <input
                type="checkbox"
                name="active"
                checked={product.active}
                onChange={handleChange}
              />

              {product.active
                ? "Active"
                : "Inactive"}
            </label>
          </div>

          {/* RESET */}

          <div>
            <label
              style={{
                ...labelStyle,
                visibility: "hidden",
              }}
            >
              Action
            </label>

            <button
              type="button"
              onClick={handleReset}
              style={{
                height: "40px",
                padding: "0 16px",
                border: "none",
                borderRadius: "6px",
                background: "#6b7280",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              🔄 Reset
            </button>
          </div>

          {/* SAVE */}

          <div>
            <label
              style={{
                ...labelStyle,
                visibility: "hidden",
              }}
            >
              Action
            </label>

            <button
              type="submit"
              style={{
                height: "40px",
                padding: "0 18px",
                border: "none",
                borderRadius: "6px",
                background: "#14532d",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              💾{" "}
              {editingProduct
                ? "Update Product"
                : "Save Product"}
            </button>
          </div>
        </div>

        {/* EDIT MESSAGE */}

        {editingProduct && (
          <div
            style={{
              marginTop: "12px",
              padding: "7px 10px",
              background: "#fef3c7",
              color: "#92400e",
              borderRadius: "5px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            ✏️ Editing Product:{" "}
            {editingProduct.name}
          </div>
        )}
      </div>
    </form>
  );
}