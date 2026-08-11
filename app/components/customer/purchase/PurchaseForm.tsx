"use client";

import { useEffect, useState } from "react";
import { Purchase } from "./PurchaseTypes";

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
  const emptyPurchase = (): Purchase => ({
    id: crypto.randomUUID(),

    purchaseNo: purchaseNo,
    purchaseDate: new Date().toISOString().split("T")[0],
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

  /* ==========================================
     LOAD EDITING PURCHASE
  ========================================== */

  useEffect(() => {
    if (editingPurchase) {
      setPurchase(editingPurchase);
    } else {
      setPurchase((prev) => ({
        ...prev,
        purchaseNo: purchaseNo,
      }));
    }
  }, [purchaseNo, editingPurchase]);

  /* ==========================================
     HANDLE CHANGE
  ========================================== */

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

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

      /* ==============================
         AUTOMATIC CALCULATION
      ============================== */

      const amount =
        Number(updated.qty) *
        Number(updated.rate);

      const gstAmount =
        (amount * Number(updated.gst)) / 100;

      const netAmount =
        amount + gstAmount;

      return {
        ...updated,
        amount: Number(amount.toFixed(2)),
        gstAmount: Number(gstAmount.toFixed(2)),
        netAmount: Number(netAmount.toFixed(2)),
      };
    });
  };

  /* ==========================================
     SAVE
  ========================================== */

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!purchase.supplierName.trim()) {
      alert("Please enter Supplier Name");
      return;
    }

    if (!purchase.productName.trim()) {
      alert("Please enter Product Name");
      return;
    }

    if (purchase.qty <= 0) {
      alert("Quantity should be greater than zero");
      return;
    }

    if (purchase.rate <= 0) {
      alert("Purchase Rate should be greater than zero");
      return;
    }

    onSave(purchase);

    setPurchase({
      ...emptyPurchase(),
      purchaseNo: purchaseNo,
    });
  };

  /* ==========================================
     RESET
  ========================================== */

  const handleReset = () => {
    setPurchase({
      ...emptyPurchase(),
      purchaseNo: purchaseNo,
    });
  };

  /* ==========================================
     COMMON STYLES
  ========================================== */

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
          PURCHASE ENTRY BOX
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
          📋 Purchase Entry
        </h2>

        {/* ======================================
            ROW 1 — PURCHASE DETAILS
        ======================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "120px 150px 150px 1.5fr 2fr",
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
              value={purchase.purchaseNo}
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
              value={purchase.purchaseDate}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          {/* INVOICE NO */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Invoice No.
            </label>

            <input
              type="text"
              name="invoiceNo"
              value={purchase.invoiceNo}
              onChange={handleChange}
              placeholder="Invoice No."
              style={inputStyle}
            />
          </div>

          {/* SUPPLIER CODE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Supplier Code
            </label>

            <input
              type="text"
              name="supplierCode"
              value={purchase.supplierCode}
              onChange={handleChange}
              placeholder="Supplier Code"
              style={inputStyle}
            />
          </div>

          {/* SUPPLIER NAME */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Supplier Name *
            </label>

            <input
              type="text"
              name="supplierName"
              value={purchase.supplierName}
              onChange={handleChange}
              required
              placeholder="Enter Supplier Name"
              style={{
                ...inputStyle,
                fontSize: "14px",
              }}
            />
          </div>
        </div>

        {/* ======================================
            ROW 2 — PRODUCT DETAILS
        ======================================= */}

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

          {/* PRODUCT CODE */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Product Code
            </label>

            <input
              type="text"
              name="productCode"
              value={purchase.productCode}
              onChange={handleChange}
              placeholder="Product Code"
              style={inputStyle}
            />
          </div>

          {/* PRODUCT NAME */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Product Name *
            </label>

            <input
              type="text"
              name="productName"
              value={purchase.productName}
              onChange={handleChange}
              required
              placeholder="Enter Product Name"
              style={{
                ...inputStyle,
                fontSize: "14px",
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
              name="hsn"
              value={purchase.hsn}
              onChange={handleChange}
              placeholder="HSN"
              style={inputStyle}
            />
          </div>

          {/* UNIT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Unit
            </label>

            <select
              name="unit"
              value={purchase.unit}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="KG">KG</option>
              <option value="Gram">Gram</option>
              <option value="Nos">Nos</option>
              <option value="Litre">Litre</option>
              <option value="Box">Box</option>
              <option value="Bag">Bag</option>
            </select>
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

        {/* ======================================
            ROW 3 — PRICE & TAX
        ======================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr 1.1fr 1fr 1fr 1fr auto auto",
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

            <select
              name="gst"
              value={purchase.gst}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value={0}>0%</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
              <option value={28}>28%</option>
            </select>
          </div>

          {/* GST AMOUNT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              GST Amount
            </label>

            <input
              type="number"
              value={purchase.gstAmount}
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
              value={purchase.netAmount}
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

          <div
            style={{
              ...fieldStyle,
              gridColumn: "span 1",
            }}
          >
            <label style={labelStyle}>
              Remarks
            </label>

            <input
              type="text"
              name="remarks"
              value={purchase.remarks}
              onChange={handleChange}
              placeholder="Remarks"
              style={inputStyle}
            />
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
              {editingPurchase
                ? "Update Purchase"
                : "Save Purchase"}
            </button>
          </div>
        </div>

        {/* ======================================
            EDIT MESSAGE
        ======================================= */}

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