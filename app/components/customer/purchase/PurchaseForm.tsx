"use client";

import { useEffect, useState } from "react";
import { Purchase } from "./PurchaseTypes";
import {
  loadProducts,
} from "../../../product/components/ProductStorage";

import { Product } from "../../../product/components/ProductTypes";

import {
  loadSuppliers,
} from "../../supplier/SupplierStorage";
import { Supplier } from "../../supplier/SupplierTypes";

type PurchaseFormProps = {
  purchaseNo: string;
  editingPurchase?: Purchase | null;
  onSave: (purchase: Purchase) => void;
};

export default function PurchaseForm({
  purchaseNo,
  editingPurchase,
  onSave,
}: PurchaseFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const emptyPurchase = (): Purchase => ({
    id: crypto.randomUUID(),

    purchaseNo,
    purchaseDate: new Date()
      .toISOString()
      .split("T")[0],

    invoiceNo: "",

    supplierCode: "",
    supplierName: "",

    productCode: "",
    productName: "",

    hsn: "",
    unit: "KG",

    qty: 0,
    rate: 0,
    amount: 0,

    gst: 5,
    gstAmount: 0,
    netAmount: 0,

    remarks: "",
  });

  const [purchase, setPurchase] =
    useState<Purchase>(emptyPurchase());

  /* =========================
     LOAD MASTER DATA
  ========================= */

  useEffect(() => {
    setProducts(loadProducts());
    setSuppliers(loadSuppliers());
  }, []);

  /* =========================
     EDIT / NEW PURCHASE
  ========================= */

  useEffect(() => {
    if (editingPurchase) {
      setPurchase(editingPurchase);
    } else {
      setPurchase((prev) => ({
        ...prev,
        purchaseNo,
      }));
    }
  }, [purchaseNo, editingPurchase]);

  /* =========================
     SUPPLIER CHANGE
  ========================= */

  const handleSupplierChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const code = e.target.value;

    const supplier = suppliers.find(
      (item) => item.code === code
    );

    if (!supplier) {
      setPurchase((prev) => ({
        ...prev,
        supplierCode: "",
        supplierName: "",
      }));

      return;
    }

    setPurchase((prev) => ({
      ...prev,
      supplierCode: supplier.code,
      supplierName: supplier.name,
    }));
  };

  /* =========================
     PRODUCT CHANGE
  ========================= */

  const handleProductChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const code = e.target.value;

    const product = products.find(
      (item) => item.code === code
    );

    if (!product) {
      setPurchase((prev) => ({
        ...prev,
        productCode: "",
        productName: "",
        hsn: "",
        unit: "KG",
        rate: 0,
        gst: 5,
        amount: 0,
        gstAmount: 0,
        netAmount: 0,
      }));

      return;
    }

    const gstRate =
  parseFloat(String(product.gst).replace("%", "")) || 0;

    setPurchase((prev) => {
      const amount =
        Number(prev.qty) *
        Number(product.purchase);

      const gstAmount =
        (amount * gstRate) / 100;

      return {
        ...prev,

        productCode: product.code,
        productName: product.name,
        hsn: product.hsn,
        unit: product.unit,

        rate: Number(product.purchase),
        gst: gstRate,

        amount: Number(
          amount.toFixed(2)
        ),

        gstAmount: Number(
          gstAmount.toFixed(2)
        ),

        netAmount: Number(
          (amount + gstAmount).toFixed(2)
        ),
      };
    });
  };

  /* =========================
     NORMAL INPUT CHANGE
  ========================= */

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement |
      HTMLTextAreaElement
    >
  ) => {
    const {
      name,
      value,
    } = e.target;

    setPurchase((prev) => {
      const updated = {
        ...prev,

        [name]:
          name === "qty" ||
          name === "rate" ||
          name === "gst"
            ? Number(value)
            : value,
      };

      const amount =
        Number(updated.qty) *
        Number(updated.rate);

      const gstAmount =
        (amount *
          Number(updated.gst)) /
        100;

      const netAmount =
        amount + gstAmount;

      return {
        ...updated,

        amount: Number(
          amount.toFixed(2)
        ),

        gstAmount: Number(
          gstAmount.toFixed(2)
        ),

        netAmount: Number(
          netAmount.toFixed(2)
        ),
      };
    });
  };

  /* =========================
     SAVE
  ========================= */

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!purchase.supplierCode) {
      alert("Please select Supplier");
      return;
    }

    if (!purchase.productCode) {
      alert("Please select Product");
      return;
    }

    if (purchase.qty <= 0) {
      alert(
        "Quantity should be greater than zero"
      );
      return;
    }

    if (purchase.rate <= 0) {
      alert(
        "Purchase Rate should be greater than zero"
      );
      return;
    }

    onSave(purchase);

    setPurchase({
      ...emptyPurchase(),
      purchaseNo,
    });
  };

  /* =========================
     RESET
  ========================= */

  const handleReset = () => {
    setPurchase({
      ...emptyPurchase(),
      purchaseNo,
    });
  };

  /* =========================
     STYLES
  ========================= */

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "40px",
    padding: "0 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    boxSizing: "border-box",
    background: "#ffffff",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    color: "#374151",
    marginBottom: "5px",
  };

  const fieldStyle: React.CSSProperties = {
    minWidth: 0,
  };

  return (
    <form onSubmit={handleSubmit}>
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

        {/* =========================
            TITLE
        ========================= */}

        <h2
          style={{
            margin: "0 0 18px",
            color: "#14532d",
            fontSize: "19px",
            fontWeight: 700,
          }}
        >
          📋 Purchase Entry
        </h2>

        {/* =========================
            ROW 1
        ========================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "120px 150px 150px 1.2fr 2fr",
            gap: "10px",
            alignItems: "end",
          }}
        >

          {/* PURCHASE NO */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Purchase No.
            </label>

            <input
              type="text"
              value={
                purchase.purchaseNo
              }
              readOnly
              style={{
                ...inputStyle,
                background: "#f3f4f6",
                fontWeight: 700,
              }}
            />
          </div>

          {/* DATE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Purchase Date *
            </label>

            <input
              type="date"
              name="purchaseDate"
              value={
                purchase.purchaseDate
              }
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          {/* INVOICE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Invoice No.
            </label>

            <input
              type="text"
              name="invoiceNo"
              value={
                purchase.invoiceNo
              }
              onChange={handleChange}
              placeholder="Invoice No."
              style={inputStyle}
            />
          </div>

          {/* SUPPLIER CODE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Supplier
            </label>

            <select
              value={
                purchase.supplierCode
              }
              onChange={
                handleSupplierChange
              }
              style={inputStyle}
            >
              <option value="">
                Select Supplier
              </option>

              {suppliers
                .filter(
                  (supplier) =>
                    supplier.status ===
                    "Active"
                )
                .map((supplier) => (
                  <option
                    key={supplier.id}
                    value={supplier.code}
                  >
                    {supplier.code} -{" "}
                    {supplier.name}
                  </option>
                ))}
            </select>
          </div>

          {/* SUPPLIER NAME */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Supplier Name
            </label>

            <input
              type="text"
              value={
                purchase.supplierName
              }
              readOnly
              placeholder="Select Supplier"
              style={{
                ...inputStyle,
                background: "#f3f4f6",
                fontWeight: 600,
              }}
            />
          </div>
        </div>

        {/* =========================
            ROW 2
        ========================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "120px 2fr 120px 110px 100px",
            gap: "10px",
            alignItems: "end",
            marginTop: "14px",
          }}
        >

          {/* PRODUCT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Product
            </label>

            <select
              value={
                purchase.productCode
              }
              onChange={
                handleProductChange
              }
              style={inputStyle}
            >
              <option value="">
                Select Product
              </option>

              {products
                .filter(
                  (product) =>
                    product.active
                )
                .map((product) => (
                  <option
                    key={product.id}
                    value={product.code}
                  >
                    {product.code} -{" "}
                    {product.name}
                  </option>
                ))}
            </select>
          </div>

          {/* PRODUCT NAME */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Product Name
            </label>

            <input
              type="text"
              value={
                purchase.productName
              }
              readOnly
              placeholder="Select Product"
              style={{
                ...inputStyle,
                background: "#f3f4f6",
                fontWeight: 600,
              }}
            />
          </div>

          {/* HSN */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              HSN Code
            </label>

            <input
              type="text"
              value={purchase.hsn}
              readOnly
              style={{
                ...inputStyle,
                background: "#f3f4f6",
              }}
            />
          </div>

          {/* UNIT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Unit
            </label>

            <input
              type="text"
              value={purchase.unit}
              readOnly
              style={{
                ...inputStyle,
                background: "#f3f4f6",
              }}
            />
          </div>

          {/* QTY */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Quantity *
            </label>

            <input
              type="number"
              name="qty"
              value={purchase.qty}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
              style={inputStyle}
            />
          </div>
        </div>

        {/* =========================
            ROW 3
        ========================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr 1fr 1fr 1fr 1.2fr auto auto",
            gap: "10px",
            alignItems: "end",
            marginTop: "14px",
          }}
        >

          {/* RATE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Purchase Rate *
            </label>

            <input
              type="number"
              name="rate"
              value={purchase.rate}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
              style={inputStyle}
            />
          </div>

          {/* AMOUNT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Amount
            </label>

            <input
              type="number"
              value={purchase.amount}
              readOnly
              style={{
                ...inputStyle,
                background: "#f3f4f6",
                fontWeight: 700,
              }}
            />
          </div>

          {/* GST */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              GST
            </label>

            <input
  type="text"
  value={`${purchase.gst}%`}
  readOnly
  style={{
    ...inputStyle,
    background: "#f3f4f6",
    fontWeight: 700,
    color: "#14532d",
  }}
/>
          </div>

          {/* GST AMOUNT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              GST Amount
            </label>

            <input
              type="number"
              value={
                purchase.gstAmount
              }
              readOnly
              style={{
                ...inputStyle,
                background: "#f3f4f6",
                fontWeight: 700,
              }}
            />
          </div>

          {/* NET AMOUNT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Net Amount
            </label>

            <input
              type="number"
              value={
                purchase.netAmount
              }
              readOnly
              style={{
                ...inputStyle,
                background: "#f0fdf4",
                color: "#14532d",
                fontWeight: 800,
              }}
            />
          </div>

          {/* REMARKS */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Remarks
            </label>

            <input
              type="text"
              name="remarks"
              value={
                purchase.remarks
              }
              onChange={handleChange}
              placeholder="Remarks"
              style={inputStyle}
            />
          </div>

          {/* RESET */}

          <button
            type="button"
            onClick={handleReset}
            style={{
              height: "40px",
              padding: "0 14px",
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

          {/* SAVE */}

          <button
            type="submit"
            style={{
              height: "40px",
              padding: "0 16px",
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
            {editingPurchase
              ? "Update"
              : "Save Purchase"}
          </button>
        </div>

        {/* =========================
            EDIT MESSAGE
        ========================= */}

        {editingPurchase && (
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
            ✏️ Editing Purchase:{" "}
            {editingPurchase.purchaseNo}
          </div>
        )}
      </div>
    </form>
  );
}