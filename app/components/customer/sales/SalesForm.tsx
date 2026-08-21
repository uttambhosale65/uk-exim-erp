"use client";

import React, { useEffect, useState } from "react";

import { Sales, SalesItem } from "./SalesTypes";

import { Customer } from "../CustomerTypes";
import { loadCustomers } from "../CustomerStorage";

import { Product } from "../../../product/components/ProductTypes";
import { loadProducts } from "../../../product/components/ProductStorage";

import { loadSales } from "./SalesStorage";

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

  /* =========================
     MASTER DATA
  ========================= */

  const [customers, setCustomers] =
    useState<Customer[]>([]);
const [customerSearch, setCustomerSearch] =
    useState("");
  const [products, setProducts] =
    useState<Product[]>([]);

  /* =========================
     DATE
  ========================= */

  const getToday = (): string => {
    return new Date()
      .toISOString()
      .split("T")[0];
  };

  /* =========================
     AUTO INVOICE NUMBER
  ========================= */

  const getNextInvoiceNo = (): string => {
    const sales = loadSales();

    if (!sales || sales.length === 0) {
      return "INV-0001";
    }

    let maxNumber = 0;

    sales.forEach((sale) => {
      const match =
        sale.invoiceNo?.match(/INV-(\d+)/);

      if (match) {
        const number = Number(match[1]);

        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    });

    return `INV-${String(
      maxNumber + 1
    ).padStart(4, "0")}`;
  };

  /* =========================
     EMPTY ITEM
  ========================= */

  const createEmptyItem = (): SalesItem => ({
    productCode: "",
    productName: "",
    hsn: "",
    unit: "KG",

    qty: 0,
    rate: 0,
    amount: 0,

    gst: 0,
    gstAmount: 0,
    taxableAmount: 0,

    cgst: 0,
    sgst: 0,
    igst: 0,

    grandTotal: 0,
  });

  /* =========================
     EMPTY SALE
  ========================= */

  const createEmptySale = (): Sales => ({
    id: crypto.randomUUID(),

    salesNo,

    salesDate: getToday(),

    invoiceNo: getNextInvoiceNo(),

    customerCode: "",
    customerName: "",

    items: [
      createEmptyItem(),
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

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  });

  /* =========================
     SALE STATE
  ========================= */

  const [sale, setSale] =
    useState<Sales>(
      createEmptySale()
    );

  /* =========================
     LOAD MASTER DATA
  ========================= */

  useEffect(() => {

    setCustomers(
      loadCustomers()
    );

    setProducts(
      loadProducts()
    );

  }, []);

  /* =========================
     EDIT / NEW SALE
  ========================= */

  useEffect(() => {

    if (editingSale) {

      setSale(
        editingSale
      );

    } else {

      setSale(
        createEmptySale()
      );

    }

  }, [
    salesNo,
    editingSale,
  ]);

  /* =========================
     ITEM CALCULATION
  ========================= */

  const calculateItem = (
    item: SalesItem
  ): SalesItem => {

    const qty =
      Number(item.qty) || 0;

    const rate =
      Number(item.rate) || 0;

    const gst =
      Number(item.gst) || 0;

    const amount =
      qty * rate;

    const gstAmount =
      (amount * gst) / 100;

    const cgst =
      gstAmount / 2;

    const sgst =
      gstAmount / 2;

    const grandTotal =
      amount + gstAmount;

    return {
      ...item,

      qty,
      rate,
      gst,

      amount,

      taxableAmount:
        amount,

      gstAmount,

      cgst,
      sgst,

      igst: 0,

      grandTotal,
    };
  };

  /* =========================
     UPDATE ITEM
  ========================= */

  const updateItem = (
    field: keyof SalesItem,
    value: string | number
  ) => {

    setSale((prev) => {

      const currentItem =
        prev.items[0] ||
        createEmptyItem();

      const updatedItem =
        calculateItem({
          ...currentItem,
          [field]: value,
        });

      return {
        ...prev,

        items: [
          updatedItem,
        ],

        taxableAmount:
          updatedItem.taxableAmount,

        gstAmount:
          updatedItem.gstAmount,

        cgst:
          updatedItem.cgst,

        sgst:
          updatedItem.sgst,

        igst:
          updatedItem.igst,

        grandTotal:
          updatedItem.grandTotal,
      };
    });
  };
/* =========================
     MULTI PRODUCT HELPERS
  ========================= */

  const recalculateSale = (
    items: SalesItem[]
  ) => {
    const taxableAmount = items.reduce(
      (total, item) =>
        total + Number(item.taxableAmount || 0),
      0
    );

    const gstAmount = items.reduce(
      (total, item) =>
        total + Number(item.gstAmount || 0),
      0
    );

    const cgst = items.reduce(
      (total, item) =>
        total + Number(item.cgst || 0),
      0
    );

    const sgst = items.reduce(
      (total, item) =>
        total + Number(item.sgst || 0),
      0
    );

    const igst = items.reduce(
      (total, item) =>
        total + Number(item.igst || 0),
      0
    );

    const grandTotal = items.reduce(
      (total, item) =>
        total + Number(item.grandTotal || 0),
      0
    );

    return {
      items,
      taxableAmount,
      gstAmount,
      cgst,
      sgst,
      igst,
      grandTotal,
    };
  };

  /* =========================
     UPDATE PRODUCT ROW
  ========================= */

  const updateItemAt = (
    index: number,
    field: keyof SalesItem,
    value: string | number
  ) => {
    setSale((prev) => {
      const items = [...prev.items];

      const currentItem =
        items[index] || createEmptyItem();

      const updatedItem =
        calculateItem({
          ...currentItem,
          [field]: value,
        });

      items[index] = updatedItem;

      return {
        ...prev,
        ...recalculateSale(items),
      };
    });
  };

  /* =========================
     PRODUCT SELECT
  ========================= */

  const handleProductChangeAt = (
    index: number,
    productCode: string
  ) => {
    const product = products.find(
      (p) => p.code === productCode
    );

    if (!product) {
      return;
    }

    const gstValue =
      Number(
        String(product.gst)
          .replace("%", "")
          .trim()
      ) || 0;

    setSale((prev) => {
      const items = [...prev.items];

      const currentItem =
        items[index] || createEmptyItem();

      const updatedItem =
        calculateItem({
          ...currentItem,

          productCode:
            product.code,

          productName:
            product.name,

          hsn:
            product.hsn,

          unit:
            product.unit,

          rate:
            Number(product.sale) || 0,

          gst:
            gstValue,
        });

      items[index] = updatedItem;

      return {
        ...prev,
        ...recalculateSale(items),
      };
    });
  };

  /* =========================
     ADD PRODUCT
  ========================= */

  const handleAddProduct = () => {
    setSale((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        createEmptyItem(),
      ],
    }));
  };

  /* =========================
     REMOVE PRODUCT
  ========================= */

  const handleRemoveProduct = (
    index: number
  ) => {
    setSale((prev) => {
      if (prev.items.length <= 1) {
        return prev;
      }

      const items =
        prev.items.filter(
          (_, itemIndex) =>
            itemIndex !== index
        );

      return {
        ...prev,
        ...recalculateSale(items),
      };
    });
  };
  /* =========================
     CUSTOMER MASTER SELECT
  ========================= */

  const handleCustomerChange = (
    customerCode: string
  ) => {

    const customer =
      customers.find(
        (c) =>
          c.code === customerCode
      );

    if (!customer) {

      setSale((prev) => ({
        ...prev,

        customerCode: "",
        customerName: "",
      }));

      return;
    }

    setSale((prev) => ({
      ...prev,

      customerCode:
        customer.code,

      customerName:
        customer.name,
    }));
  };

  /* =========================
     PRODUCT MASTER SELECT
  ========================= */

  const handleProductChange = (
    productCode: string
  ) => {

    const product =
      products.find(
        (p) =>
          p.code === productCode
      );

    if (!product) {
      return;
    }

    const gstValue =
      Number(
        String(product.gst)
          .replace("%", "")
          .trim()
      ) || 0;

    setSale((prev) => {

      const currentItem =
        prev.items[0] ||
        createEmptyItem();

      const updatedItem =
        calculateItem({

          ...currentItem,

          productCode:
            product.code,

          productName:
            product.name,

          hsn:
            product.hsn,

          unit:
            product.unit,

          rate:
            Number(product.sale) || 0,

          gst:
            gstValue,
        });

      return {
        ...prev,

        items: [
          updatedItem,
        ],

        taxableAmount:
          updatedItem.taxableAmount,

        gstAmount:
          updatedItem.gstAmount,

        cgst:
          updatedItem.cgst,

        sgst:
          updatedItem.sgst,

        igst:
          updatedItem.igst,

        grandTotal:
          updatedItem.grandTotal,
      };
    });
  };
  /* =========================
     GENERAL FIELD CHANGE
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

    setSale((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================
     SUBMIT
  ========================= */

  /* =========================
     SUBMIT - MULTI PRODUCT
  ========================= */

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !sale.customerCode ||
      !sale.customerName.trim()
    ) {
      alert(
        "Please select Customer from Customer Master"
      );
      return;
    }

    if (!sale.items.length) {
      alert(
        "Please add at least one product"
      );
      return;
    }

    const finalItems =
      sale.items.map((item) =>
        calculateItem(item)
      );

    const invalidItem =
      finalItems.find(
        (item) =>
          !item.productCode ||
          !item.productName.trim() ||
          item.qty <= 0 ||
          item.rate <= 0
      );

    if (invalidItem) {
      alert(
        "Please complete Product, Quantity and Rate for all products"
      );
      return;
    }

    const totals =
      recalculateSale(finalItems);

    const now =
      new Date().toISOString();

    const finalSale: Sales = {
      ...sale,

      salesNo,

      invoiceNo:
        sale.invoiceNo ||
        getNextInvoiceNo(),

      updatedAt: now,

      items:
        finalItems,

      taxableAmount:
        totals.taxableAmount,

      gstAmount:
        totals.gstAmount,

      cgst:
        totals.cgst,

      sgst:
        totals.sgst,

      igst:
        totals.igst,

      grandTotal:
        totals.grandTotal,
    };

    onSave(finalSale);

    setSale(
      createEmptySale()
    );

    onCancelEdit?.();
  };

  /* =========================
     RESET
  ========================= */

  const handleReset = () => {

    setSale(
      createEmptySale()
    );

    onCancelEdit?.();
  };

  /* =========================
     STYLES
  ========================= */

  const inputStyle:
    React.CSSProperties = {

    width: "100%",

    height: "40px",

    padding: "0 10px",

    border:
      "1px solid #d1d5db",

    borderRadius:
      "6px",

    fontSize: "13px",

    boxSizing:
      "border-box",

    outline: "none",

    background:
      "#ffffff",
  };

  const labelStyle:
    React.CSSProperties = {

    display: "block",

    fontSize: "11px",

    fontWeight: 700,

    color: "#374151",

    marginBottom: "5px",

    whiteSpace:
      "nowrap",
  };

  const fieldStyle:
    React.CSSProperties = {

    minWidth: 0,
  };

  const item =
    sale.items[0] ||
    createEmptyItem();

  return (
    <form
      onSubmit={handleSubmit}
    >

      <div
        style={{
          background:
            "#ffffff",

          border:
            "1px solid #d1d5db",

          borderRadius:
            "10px",

          padding:
            "18px",

          width:
            "100%",

          boxSizing:
            "border-box",

          boxShadow:
            "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >

        <h2
          style={{
            margin:
              "0 0 18px",

            color:
              "#14532d",

            fontSize:
              "19px",

            fontWeight:
              700,
          }}
        >
          📤 Sales Entry
        </h2>

        {/* =====================
            ROW 1
        ====================== */}

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",

            gap:
              "8px",

            alignItems:
              "end",

            marginTop:
              "14px",

            width:
              "100%",

            boxSizing:
              "border-box",
          }}
        >

          {/* SALES NO */}

          <div
            style={fieldStyle}
          >

            <label
              style={labelStyle}
            >
              Sales No.
            </label>

            <input
              value={
                sale.salesNo
              }

              readOnly

              style={{
                ...inputStyle,

                background:
                  "#f3f4f6",

                fontWeight:
                  700,
              }}
            />

          </div>

          {/* SALES DATE */}

          <div
            style={fieldStyle}
          >

            <label
              style={labelStyle}
            >
              Sales Date *
            </label>

            <input
              type="date"

              name="salesDate"

              value={
                sale.salesDate
              }

              onChange={
                handleChange
              }

              style={
                inputStyle
              }
            />

          </div>

          {/* INVOICE */}

          <div
            style={fieldStyle}
          >

            <label
              style={labelStyle}
            >
              Invoice No.
            </label>

            <input
              value={
                sale.invoiceNo
              }

              readOnly

              style={{
                ...inputStyle,

                background:
                  "#f3f4f6",

                fontWeight:
                  700,
              }}
            />

          </div>

          {/* CUSTOMER */}

          <div
            style={fieldStyle}
          >

            <label
              style={labelStyle}
            >
              Customer
            </label>

  <input
  list="customer-list"
  value={customerSearch}
  onChange={(e) => {
    const value = e.target.value;

    setCustomerSearch(value);

    const selectedCustomer =
      customers.find(
        (customer) =>
          `${customer.code} - ${customer.name}` ===
          value
      );

    if (selectedCustomer) {
      handleCustomerChange(
        selectedCustomer.code
      );
    }
  }}
  placeholder="Type customer name..."
  style={inputStyle}
/>

<datalist id="customer-list">
  {customers.map((customer) => (
    <option
      key={customer.id}
      value={`${customer.code} - ${customer.name}`}
    />
  ))}
</datalist>

          </div>

          {/* CUSTOMER NAME */}

          <div
            style={fieldStyle}
          >

            <label
              style={labelStyle}
            >
              Customer Name
            </label>

            <input
              value={
                sale.customerName
              }

              readOnly

              placeholder="Select Customer"

              style={{
                ...inputStyle,

                background:
                  "#f3f4f6",
              }}
            />

          </div>

        </div>

    {/* =====================
    ROW 2 - MULTI PRODUCTS
====================== */}

<div
  style={{
    marginTop: "14px",
    width: "100%",
  }}
>
  {sale.items.map((item, index) => (
    <div
      key={index}
      style={{
        display: "grid",
       gridTemplateColumns:
  "70px minmax(0,1.6fr) 80px 65px 65px 80px 40px",
        gap: "6px",
        alignItems: "end",
        marginBottom: "10px",
        width: "100%",
      }}
    >

      {/* PRODUCT CODE */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Product Code
        </label>

        <input
          value={item.productCode}
          readOnly
          placeholder="AUTO"
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

        <select
          value={item.productCode}
          onChange={(e) =>
            handleProductChangeAt(
              index,
              e.target.value
            )
          }
          style={inputStyle}
        >
          <option value="">
            Select Product
          </option>

          {products
            .filter(
              (product) =>
                product.active !== false
            )
            .map((product) => (
              <option
                key={product.id}
                value={product.code}
              >
                {product.name}
              </option>
            ))}
        </select>
      </div>

      {/* HSN */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          HSN Code
        </label>

        <input
          value={item.hsn}
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
          value={item.unit}
          readOnly
          style={{
            ...inputStyle,
            background: "#f3f4f6",
          }}
        />
      </div>

      {/* QUANTITY */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Qty *
        </label>

        <input
          type="number"
          value={item.qty}
          min="0"
          step="0.01"
          onChange={(e) =>
            updateItemAt(
              index,
              "qty",
              Number(e.target.value)
            )
          }
          style={inputStyle}
        />
      </div>

      {/* RATE */}

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
            updateItemAt(
              index,
              "rate",
              Number(e.target.value)
            )
          }
          style={inputStyle}
        />
      </div>

      {/* DELETE */}

      <button
        type="button"
        onClick={() =>
          handleRemoveProduct(index)
        }
        disabled={sale.items.length <= 1}
        title="Remove Product"
        style={{
          height: "40px",
          width: "40px",
          border: "none",
          borderRadius: "6px",
          background:
            sale.items.length <= 1
              ? "#d1d5db"
              : "#dc2626",
          color: "#ffffff",
          fontWeight: 700,
          cursor:
            sale.items.length <= 1
              ? "not-allowed"
              : "pointer",
        }}
      >
        🗑️
      </button>
    </div>
  ))}

  {/* ADD PRODUCT */}

  <button
    type="button"
    onClick={handleAddProduct}
    style={{
      marginTop: "4px",
      height: "38px",
      padding: "0 16px",
      border: "none",
      borderRadius: "6px",
      background: "#2563eb",
      color: "#ffffff",
      fontWeight: 700,
      fontSize: "12px",
      cursor: "pointer",
    }}
  >
    ➕ Add Product
  </button>
</div>
        {/* =====================
            ROW 3
        ====================== */}

        <div
          style={{
            display: "grid",
           gridTemplateColumns:
  "minmax(0,1fr) minmax(0,1fr) 70px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) auto auto",
            gap: "6px",
            alignItems: "end",
            marginTop: "14px",
          }}
        >

          {/* AMOUNT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Amount
            </label>

            <input
              value={
                item.amount.toFixed(2)
              }
              readOnly
              style={{
                ...inputStyle,
                background:
                  "#f3f4f6",
              }}
            />
          </div>

          {/* GST */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              GST
            </label>

            <input
              value={`${item.gst}%`}
              readOnly
              style={{
                ...inputStyle,
                background:
                  "#f3f4f6",
              }}
            />
          </div>

          {/* GST AMOUNT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              GST Amt.
            </label>

            <input
              value={
                item.gstAmount.toFixed(2)
              }
              readOnly
              style={{
                ...inputStyle,
                background:
                  "#f3f4f6",
              }}
            />
          </div>

          {/* PAYMENT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Payment
            </label>

            <select
              name="paymentMode"
              value={
                sale.paymentMode
              }
              onChange={
                handleChange
              }
              style={inputStyle}
            >

              <option value="Cash">
                Cash
              </option>

              <option value="UPI">
                UPI
              </option>

              <option value="Card">
                Card
              </option>

              <option value="Bank">
                Bank
              </option>

              <option value="Credit">
                Credit
              </option>

            </select>
          </div>

          {/* STATUS */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Status
            </label>

            <select
              name="status"
              value={
                sale.status
              }
              onChange={
                handleChange
              }
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

          {/* CGST */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              CGST
            </label>

            <input
              value={
                item.cgst.toFixed(2)
              }
              readOnly
              style={{
                ...inputStyle,
                background:
                  "#f3f4f6",
              }}
            />
          </div>

          {/* SGST */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              SGST
            </label>

            <input
              value={
                item.sgst.toFixed(2)
              }
              readOnly
              style={{
                ...inputStyle,
                background:
                  "#f3f4f6",
              }}
            />
          </div>

          {/* NET AMOUNT */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Net Amount
            </label>

            <input
              value={
                sale.grandTotal.toFixed(2)
              }
              readOnly
              style={{
                ...inputStyle,
                background:
                  "#f0fdf4",
                fontWeight: 700,
                color: "#14532d",
              }}
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

        {/* =====================
            REMARKS
        ====================== */}

        <div
          style={{
            marginTop: "14px",
            maxWidth: "500px",
          }}
        >
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

        {/* =====================
            EDIT MESSAGE
        ====================== */}

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