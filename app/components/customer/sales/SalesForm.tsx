"use client";

import { useEffect, useState } from "react";
import { Sales, SalesItem } from "./SalesTypes";

type SalesFormProps = {
  salesNo: string;
  editingSale?: Sales | null;
  onSave: (sale: Sales) => void;
  onCancelEdit?: () => void;
};

export default function SalesForm({
  salesNo,
  editingSale,
  onSave,
  onCancelEdit,
}: SalesFormProps) {
  const getToday = () => {
    return new Date()
      .toISOString()
      .split("T")[0];
  };

  const createEmptySale = (): Sales => ({
    id: crypto.randomUUID(),

    salesNo,

    salesDate: getToday(),

    invoiceNo: "",

    customerCode: "",
    customerName: "",

    items: [
      {
        productCode: "",
        productName: "",
        hsn: "",
        unit: "KG",

        qty: 0,
        rate: 0,

        amount: 0,

        gst: 5,
        gstAmount: 0,

        taxableAmount: 0,

        cgst: 0,
        sgst: 0,
        igst: 0,

        grandTotal: 0,
      },
    ],

    taxableAmount: 0,
    gstAmount: 0,

    cgst: 0,
    sgst: 0,
    igst: 0,

    grandTotal: 0,

    paymentMode: "Cash",

    status: "Completed",

    remarks: "",

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [sale, setSale] =
    useState<Sales>(createEmptySale());

  useEffect(() => {
    if (editingSale) {
      setSale(editingSale);
    } else {
      setSale((prev) => ({
        ...prev,
        salesNo,
      }));
    }
  }, [salesNo, editingSale]);

  const calculateItem = (
    item: SalesItem
  ): SalesItem => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const gst = Number(item.gst) || 0;

    const amount = qty * rate;

    const gstAmount =
      (amount * gst) / 100;

    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;

    const grandTotal =
      amount + gstAmount;

    return {
      ...item,
      qty,
      rate,
      gst,
      amount,
      taxableAmount: amount,
      gstAmount,
      cgst,
      sgst,
      igst: 0,
      grandTotal,
    };
  };

  const updateItem = (
    field: keyof SalesItem,
    value: string | number
  ) => {
    setSale((prev) => {
      const currentItem =
        prev.items[0];

      const updatedItem =
        calculateItem({
          ...currentItem,
          [field]: value,
        });

      return {
        ...prev,
        items: [updatedItem],
        taxableAmount:
          updatedItem.taxableAmount,
        gstAmount:
          updatedItem.gstAmount,
        cgst: updatedItem.cgst,
        sgst: updatedItem.sgst,
        igst: updatedItem.igst,
        grandTotal:
          updatedItem.grandTotal,
      };
    });
  };

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

    if (
      name === "qty" ||
      name === "rate" ||
      name === "gst"
    ) {
      updateItem(
        name as keyof SalesItem,
        Number(value)
      );

      return;
    }

    setSale((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const item = sale.items[0];

    if (!sale.customerName.trim()) {
      alert("Please enter Customer Name");
      return;
    }

    if (!item.productName.trim()) {
      alert("Please enter Product Name");
      return;
    }

    if (item.qty <= 0) {
      alert("Quantity should be greater than zero");
      return;
    }

    if (item.rate <= 0) {
      alert("Rate should be greater than zero");
      return;
    }

    const now =
      new Date().toISOString();

    const finalSale: Sales = {
      ...sale,

      salesNo,

      updatedAt: now,

      items: [
        calculateItem(item),
      ],
    };

    onSave(finalSale);

    setSale(createEmptySale());

    onCancelEdit?.();
  };

  const handleReset = () => {
    setSale(createEmptySale());

    onCancelEdit?.();
  };

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

  const item = sale.items[0];

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
        <h2
          style={{
            margin: "0 0 18px",
            color: "#14532d",
            fontSize: "19px",
            fontWeight: 700,
          }}
        >
          📤 Sales Entry
        </h2>

        {/* ROW 1 */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "100px 120px 120px 1.5fr 1.5fr",
            gap: "10px",
            alignItems: "end",
          }}
        >
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Sales No.
            </label>

            <input
              value={sale.salesNo}
              readOnly
              style={{
                ...inputStyle,
                background: "#f3f4f6",
                fontWeight: 700,
              }}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Sales Date *
            </label>

            <input
              type="date"
              name="salesDate"
              value={sale.salesDate}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Invoice No.
            </label>

            <input
              type="text"
              name="invoiceNo"
              value={sale.invoiceNo}
              onChange={handleChange}
              placeholder="Invoice No."
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Customer Code
            </label>

            <input
              type="text"
              name="customerCode"
              value={sale.customerCode}
              onChange={handleChange}
              placeholder="Customer Code"
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Customer Name *
            </label>

            <input
              type="text"
              name="customerName"
              value={sale.customerName}
              onChange={handleChange}
              placeholder="Enter Customer Name"
              style={inputStyle}
            />
          </div>
        </div>

        {/* ROW 2 */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "110px 2fr 110px 100px 100px 110px",
            gap: "10px",
            alignItems: "end",
            marginTop: "14px",
          }}
        >
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Product Code
            </label>

            <input
              type="text"
              value={item.productCode}
              onChange={(e) =>
                updateItem(
                  "productCode",
                  e.target.value
                )
              }
              placeholder="Product Code"
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Product Name *
            </label>

            <input
              type="text"
              value={item.productName}
              onChange={(e) =>
                updateItem(
                  "productName",
                  e.target.value
                )
              }
              placeholder="Enter Product Name"
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              HSN Code
            </label>

            <input
              type="text"
              value={item.hsn}
              onChange={(e) =>
                updateItem(
                  "hsn",
                  e.target.value
                )
              }
              placeholder="HSN"
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Unit
            </label>

            <select
              value={item.unit}
              onChange={(e) =>
                updateItem(
                  "unit",
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="KG">KG</option>
              <option value="Gram">
                Gram
              </option>
              <option value="Nos">Nos</option>
              <option value="Box">Box</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Quantity *
            </label>

            <input
              type="number"
              value={item.qty}
              min="0"
              step="0.01"
              onChange={(e) =>
                updateItem(
                  "qty",
                  Number(e.target.value)
                )
              }
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Rate *
            </label>

            <input
              type="number"
              value={item.rate}
              min="0"
              step="0.01"
              onChange={(e) =>
                updateItem(
                  "rate",
                  Number(e.target.value)
                )
              }
              style={inputStyle}
            />
          </div>
        </div>

        {/* ROW 3 */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr 100px 1fr 1fr 1fr 1fr auto auto",
            gap: "10px",
            alignItems: "end",
            marginTop: "14px",
          }}
        >
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Amount
            </label>

            <input
              value={item.amount.toFixed(2)}
              readOnly
              style={{
                ...inputStyle,
                background: "#f3f4f6",
              }}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              GST
            </label>

            <select
              value={item.gst}
              onChange={(e) =>
                updateItem(
                  "gst",
                  Number(e.target.value)
                )
              }
              style={inputStyle}
            >
              <option value={0}>0%</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
              <option value={28}>28%</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              GST Amt.
            </label>

            <input
              value={item.gstAmount.toFixed(2)}
              readOnly
              style={{
                ...inputStyle,
                background: "#f3f4f6",
              }}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Payment
            </label>

            <select
              name="paymentMode"
              value={sale.paymentMode}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Bank">Bank</option>
              <option value="Credit">Credit</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Status
            </label>

            <select
              name="status"
              value={sale.status}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="Completed">
                Completed
              </option>
              <option value="Pending">
                Pending
              </option>
              <option value="Cancelled">
                Cancelled
              </option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Net Amount
            </label>

            <input
              value={sale.grandTotal.toFixed(2)}
              readOnly
              style={{
                ...inputStyle,
                background: "#f0fdf4",
                fontWeight: 700,
                color: "#14532d",
              }}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Remarks
            </label>

            <input
              type="text"
              name="remarks"
              value={sale.remarks}
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
            {editingSale
              ? "Update Sale"
              : "Save Sale"}
          </button>
        </div>

        {editingSale && (
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
            ✏️ Editing Sale:{" "}
            {editingSale.salesNo}
          </div>
        )}
      </div>
    </form>
  );
}