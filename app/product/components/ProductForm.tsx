"use client";

import { useEffect, useState } from "react";
import {
  Product,
  ProductUnit,
} from "./ProductTypes";
import { loadProducts } from "./ProductStorage";

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

    /* BASIC */

    name: "",

    category: "Spices",

    hsn: "",

    gst: "5%",

    /* UOM */

    unit: "Gram",

    netWeight: 0,

    /* STOCK BASE PRODUCT */

    stockBaseCode: "",

    /* EXISTING PRICING */

    purchase: 0,

    sale: 0,

    mrp: 0,

    /* COST */

    baseCost: 0,

    packingCost: 0,

    otherCharges: 0,

    totalCost: 0,

    /* STOCK */

    stock: 0,

    minimumStock: 0,

    /* STATUS */

    active: true,
  });

  const [product, setProduct] =
    useState<Product>(
      emptyProduct()
    );

  /* =====================================================
     LOAD EDIT PRODUCT
  ===================================================== */

  useEffect(() => {
    if (editingProduct) {
      const baseCost =
        Number(
          editingProduct.baseCost ??
            editingProduct.purchase ??
            0
        ) || 0;

      const packingCost =
        Number(
          editingProduct.packingCost || 0
        );

      const otherCharges =
        Number(
          editingProduct.otherCharges || 0
        );

      setProduct({
        ...editingProduct,

        stockBaseCode:
          editingProduct.stockBaseCode ||
          "",

        baseCost,

        packingCost,

        otherCharges,

        totalCost:
          baseCost +
          packingCost +
          otherCharges,
      });
    } else {
      setProduct((prev) => ({
        ...prev,
        code: productCode,
      }));
    }
  }, [
    productCode,
    editingProduct,
  ]);

  /* =====================================================
     STOCK BASE PRODUCT OPTIONS

     Packet products can point to one loose/base product.
     KG / Gram products can keep their own stock code.
  ===================================================== */

  const availableProducts =
    loadProducts().filter(
      (item) =>
        item.code !== product.code &&
        item.active !== false
    );

  /* =====================================================
     HANDLE CHANGE
  ===================================================== */

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const {
      name,
      value,
      type,
    } = e.target;

    /* STOCK BASE PRODUCT */

    if (name === "unit") {
      setProduct((prev) => ({
        ...prev,
        unit: value as ProductUnit,
        stockBaseCode:
          value === "Pkt"
            ? prev.stockBaseCode || ""
            : prev.code,
      }));

      return;
    }

    /* CHECKBOX */

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

    /* NUMBER FIELDS */

    const numberFields = [
      "netWeight",
      "purchase",
      "sale",
      "mrp",
      "baseCost",
      "packingCost",
      "otherCharges",
      "stock",
      "minimumStock",
    ];

    setProduct((prev) => {
      const updated = {
        ...prev,
        [name]: numberFields.includes(
          name
        )
          ? Number(value)
          : value,
      } as Product;

      /* AUTOMATIC TOTAL COST */

      if (
        name === "baseCost" ||
        name === "packingCost" ||
        name === "otherCharges"
      ) {
        updated.totalCost =
          Number(
            updated.baseCost || 0
          ) +
          Number(
            updated.packingCost || 0
          ) +
          Number(
            updated.otherCharges || 0
          );
      }

      return updated;
    });
  };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!product.name.trim()) {
      alert(
        "Please enter Product Name"
      );
      return;
    }

    if (!product.hsn.trim()) {
      alert(
        "Please enter HSN Code"
      );
      return;
    }

    if (product.sale <= 0) {
      alert(
        "Sale Price should be greater than zero"
      );
      return;
    }

    if (product.unit === "Pkt" && !product.stockBaseCode) {
      alert(
        "Please select Loose / Base Product for packet stock."
      );
      return;
    }

    if (product.mrp < product.sale) {
      alert(
        "MRP should not be less than Sale Price"
      );
      return;
    }

    /*
      Final Total Cost calculation
      before saving.
    */

    const finalBaseCost =
      Number(
        product.baseCost || 0
      );

    const finalPackingCost =
      Number(
        product.packingCost || 0
      );

    const finalOtherCharges =
      Number(
        product.otherCharges || 0
      );

    const finalTotalCost =
      finalBaseCost +
      finalPackingCost +
      finalOtherCharges;

    const finalProduct: Product = {
      ...product,

      stockBaseCode:
        product.unit === "Pkt"
          ? product.stockBaseCode || ""
          : product.code,

      baseCost:
        finalBaseCost,

      packingCost:
        finalPackingCost,

      otherCharges:
        finalOtherCharges,

      totalCost:
        finalTotalCost,
    };

    onSave(finalProduct);

    setProduct({
      ...emptyProduct(),
      code: productCode,
    });

    onCancelEdit?.();
  };

  /* =====================================================
     RESET
  ===================================================== */

  const handleReset = () => {
    setProduct({
      ...emptyProduct(),
      code: productCode,
    });

    onCancelEdit?.();
  };

  /* =====================================================
     COMMON STYLES
  ===================================================== */

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "40px",
    padding: "0 10px",
    border:
      "1px solid #d1d5db",
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
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          border:
            "1px solid #d1d5db",
          borderRadius: "10px",
          padding: "18px",
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          overflow: "hidden",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {/* TITLE */}

        <h2
          style={{
            margin:
              "0 0 18px 0",
            color: "#14532d",
            fontSize: "19px",
            fontWeight: 700,
          }}
        >
          📋 Product Entry
        </h2>

        {/* =================================================
            ROW 1 — BASIC
        ================================================= */}

        <div
          style={{
            display: "grid",
           gridTemplateColumns:
 "0.7fr 1.8fr 1.2fr 1.3fr 0.7fr 0.8fr",
gap: "10px",
            alignItems: "end",
          }}
        >
          {/* CODE */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              Product Code
            </label>

            <input
              type="text"
              value={product.code}
              readOnly
              style={{
                ...inputStyle,
                background:
                  "#f3f4f6",
                fontWeight: 700,
              }}
            />
          </div>

          {/* NAME */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              Product Name *
            </label>

            <input
              type="text"
              name="name"
              value={product.name}
              onChange={
                handleChange
              }
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
            <label
              style={labelStyle}
            >
              Category
            </label>

            <input
              type="text"
              name="category"
              value={
                product.category
              }
              onChange={
                handleChange
              }
              placeholder="Category"
              style={inputStyle}
            />
          </div>

          {/* HSN */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              HSN Code *
            </label>

            <input
              type="text"
              name="hsn"
              value={product.hsn}
              onChange={
                handleChange
              }
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
            <label
              style={labelStyle}
            >
              GST
            </label>

            <select
              name="gst"
              value={product.gst}
              onChange={
                handleChange
              }
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            >
              <option value="0%">
                0%
              </option>

              <option value="5%">
                5%
              </option>

              <option value="12%">
                12%
              </option>

              <option value="18%">
                18%
              </option>

              <option value="28%">
                28%
              </option>
            </select>
          </div>

          {/* UOM */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              UOM
            </label>

            <select
              name="unit"
              value={product.unit}
              onChange={
                handleChange
              }
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

              <option value="Pkt">
                Pkt
              </option>
            </select>
          </div>
        </div>

        {/* =================================================
            STOCK BASE PRODUCT
        ================================================= */}

        <div
          style={{
            marginTop: "14px",
            padding: "12px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              color: "#14532d",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            📦 Stock Base Product
          </div>

          <select
            name="stockBaseCode"
            value={product.stockBaseCode || ""}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="">
              {product.unit === "Pkt"
                ? "Select Loose / Base Product"
                : "Use Own Product Stock"}
            </option>

            {product.unit !== "Pkt" && (
              <option value={product.code}>
                {product.code} — {product.name || "Current Product"}
              </option>
            )}

            {availableProducts.map((item) => (
              <option
                key={item.code}
                value={item.code}
              >
                {item.code} — {item.name}
              </option>
            ))}
          </select>

          <div
            style={{
              marginTop: "6px",
              fontSize: "11px",
              color: "#6b7280",
            }}
          >
            Packet purchases/sales are converted to KG and posted to this base product.
          </div>
        </div>

        {/* =================================================
            ROW 2 — PACK / SELLING
        ================================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(6, minmax(0, 1fr))",
            gap: "10px",
            alignItems: "end",
            marginTop: "14px",
          }}
        >
          {/* NET WEIGHT */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              Net Weight (g)
            </label>

            <input
              type="number"
              name="netWeight"
              value={
                product.netWeight
              }
              onChange={
                handleChange
              }
              min="0"
              step="0.01"
              style={inputStyle}
            />
          </div>

          {/* PURCHASE */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              Purchase Price
            </label>

            <input
              type="number"
              name="purchase"
              value={
                product.purchase
              }
              onChange={
                handleChange
              }
              min="0"
              step="0.01"
              placeholder="Purchase Price"
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* SALE */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              Sale Price *
            </label>

            <input
              type="number"
              name="sale"
              value={product.sale}
              onChange={
                handleChange
              }
              min="0"
              step="0.01"
              required
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>

          {/* MRP */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              MRP
            </label>

            <input
              type="number"
              name="mrp"
              value={product.mrp}
              onChange={
                handleChange
              }
              min="0"
              step="0.01"
              style={inputStyle}
            />
          </div>

          {/* OPENING STOCK */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              Opening Stock
            </label>

            <input
              type="number"
              name="stock"
              value={product.stock}
              onChange={
                handleChange
              }
              min="0"
              step="0.01"
              style={inputStyle}
            />
          </div>

          {/* MIN STOCK */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              Min Stock
            </label>

            <input
              type="number"
              name="minimumStock"
              value={
                product.minimumStock
              }
              onChange={
                handleChange
              }
              min="0"
              step="0.01"
              style={inputStyle}
            />
          </div>
        </div>

        {/* =================================================
            ROW 3 — COST STRUCTURE
        ================================================= */}

        <div
          style={{
            marginTop: "14px",
            padding:
              "12px",
            border:
              "1px solid #d1d5db",
            borderRadius:
              "8px",
            background:
              "#f8fafc",
          }}
        >
          <div
            style={{
              color:
                "#14532d",
              fontSize:
                "13px",
              fontWeight: 700,
              marginBottom:
                "10px",
            }}
          >
            💰 Product Cost Structure
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: "10px",
              alignItems:
                "end",
            }}
          >
            {/* BASE COST */}

            <div
              style={
                fieldStyle
              }
            >
              <label
                style={
                  labelStyle
                }
              >
                Base Cost
              </label>

              <input
                type="number"
                name="baseCost"
                value={
                  product.baseCost
                }
                onChange={
                  handleChange
                }
                min="0"
                step="0.01"
                placeholder="0.00"
                style={
                  inputStyle
                }
              />
            </div>

            {/* PACKING COST */}

            <div
              style={
                fieldStyle
              }
            >
              <label
                style={
                  labelStyle
                }
              >
                Packing Cost
              </label>

              <input
                type="number"
                name="packingCost"
                value={
                  product.packingCost
                }
                onChange={
                  handleChange
                }
                min="0"
                step="0.01"
                placeholder="0.00"
                style={
                  inputStyle
                }
              />
            </div>

            {/* OTHER CHARGES */}

            <div
              style={
                fieldStyle
              }
            >
              <label
                style={
                  labelStyle
                }
              >
                Other Charges
              </label>

              <input
                type="number"
                name="otherCharges"
                value={
                  product.otherCharges
                }
                onChange={
                  handleChange
                }
                min="0"
                step="0.01"
                placeholder="0.00"
                style={
                  inputStyle
                }
              />
            </div>

            {/* TOTAL COST */}

            <div
              style={
                fieldStyle
              }
            >
              <label
                style={
                  labelStyle
                }
              >
                Total Cost
              </label>

              <input
                type="number"
                value={Number(
                  product.totalCost ||
                    0
                ).toFixed(2)}
                readOnly
                style={{
                  ...inputStyle,
                  background:
                    "#ecfdf5",
                  color:
                    "#166534",
                  fontWeight: 700,
                }}
              />
            </div>
          </div>
        </div>

        {/* =================================================
            ROW 4 — STATUS + ACTION
        ================================================= */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-end",
            gap: "10px",
            marginTop: "14px",
          }}
        >
          {/* STATUS */}

          <div
            style={{
              minWidth:
                "160px",
            }}
          >
            <label
              style={
                labelStyle
              }
            >
              Status
            </label>

            <label
              style={{
                height:
                  "40px",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                gap: "6px",
                border:
                  "1px solid #d1d5db",
                borderRadius:
                  "6px",
                background:
                  product.active
                    ? "#f0fdf4"
                    : "#f3f4f6",
                fontSize:
                  "12px",
                fontWeight: 700,
                cursor:
                  "pointer",
                boxSizing:
                  "border-box",
              }}
            >
              <input
                type="checkbox"
                name="active"
                checked={
                  product.active
                }
                onChange={
                  handleChange
                }
              />

              {product.active
                ? "Active"
                : "Inactive"}
            </label>
          </div>

          {/* ACTIONS */}

          <div
            style={{
              display:
                "flex",
              gap: "8px",
            }}
          >
            <button
              type="button"
              onClick={
                handleReset
              }
              style={{
                height:
                  "40px",
                padding:
                  "0 16px",
                border:
                  "none",
                borderRadius:
                  "6px",
                background:
                  "#6b7280",
                color:
                  "#ffffff",
                fontWeight:
                  700,
                fontSize:
                  "12px",
                cursor:
                  "pointer",
              }}
            >
              🔄 Reset
            </button>

            <button
              type="submit"
              style={{
                height:
                  "40px",
                padding:
                  "0 18px",
                border:
                  "none",
                borderRadius:
                  "6px",
                background:
                  "#14532d",
                color:
                  "#ffffff",
                fontWeight:
                  700,
                fontSize:
                  "12px",
                cursor:
                  "pointer",
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
              marginTop:
                "12px",
              padding:
                "7px 10px",
              background:
                "#fef3c7",
              color:
                "#92400e",
              borderRadius:
                "5px",
              fontSize:
                "12px",
              fontWeight: 600,
            }}
          >
            ✏️ Editing Product:{" "}
            {
              editingProduct.name
            }
          </div>
        )}
      </div>
    </form>
  );
}