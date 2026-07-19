"use client";

import { useEffect, useState } from "react";

import { Sales } from "./SalesTypes";
import { Customer } from "../CustomerTypes";
import { Product } from "../../../product/components/ProductTypes";

import { loadCustomers } from "../CustomerStorage";
import { loadProducts } from "../../../product/components/ProductStorage";

import {
  reduceStock,
  getCurrentStock,
} from "../../stock/StockStorage";

type SalesFormProps = {
  salesNo: string;
  onSave: (sales: Sales) => void;
  editingSale: Sales | null;
};

export default function SalesForm({
  salesNo,
  onSave,
  editingSale,
}: SalesFormProps) {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [availableStock, setAvailableStock] =
    useState(0);

  const emptySales = (): Sales => ({
    id: "",
    salesNo,
    salesDate: new Date()
      .toISOString()
      .split("T")[0],

    invoiceNo: "",

    customerCode: "",
    customerName: "",

    productCode: "",
    productName: "",

    hsn: "",
    unit: "",

    qty: 1,
    rate: 0,
    amount: 0,

    gst: 0,
    taxableAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    grandTotal: 0,
  });

  const [sales, setSales] =
    useState<Sales>(emptySales());

  useEffect(() => {
    setCustomers(loadCustomers());
    setProducts(loadProducts());
  }, []);

  useEffect(() => {
    if (editingSale) {
      setSales(editingSale);

      setAvailableStock(
        getCurrentStock(
          editingSale.productCode
        )
      );
    }
  }, [editingSale]);

  useEffect(() => {
    if (!editingSale) {
      setSales((prev) => ({
        ...prev,
        salesNo,
      }));
    }
  }, [salesNo, editingSale]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;

    let updated: Sales = {
      ...sales,
      [name]:
        name === "qty" ||
        name === "rate"
          ? Number(value)
          : value,
    };

    if (name === "customerCode") {
      const customer = customers.find(
        (c) => c.code === value
      );

      if (customer) {
        updated.customerCode =
          customer.code;
        updated.customerName =
          customer.name;
      }
    }

    if (name === "productCode") {
      const product = products.find(
        (p) => p.code === value
      );

      if (product) {
        updated.productCode =
          product.code;

        updated.productName =
          product.name;

        updated.hsn = product.hsn;
        updated.unit = product.unit;

        updated.rate =
          product.sale;

        updated.gst =
          Number(product.gst);

        setAvailableStock(
          getCurrentStock(
            product.code
          )
        );
      }
    }

    updated.amount =
      updated.qty *
      updated.rate;

    updated.taxableAmount =
      updated.amount;

    updated.cgst =
      (updated.taxableAmount *
        updated.gst) /
      200;

    updated.sgst =
      (updated.taxableAmount *
        updated.gst) /
      200;

    updated.igst = 0;

    updated.grandTotal =
      updated.taxableAmount +
      updated.cgst +
      updated.sgst;

    setSales(updated);
  }

  function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      sales.qty >
      availableStock
    ) {
      alert(
        "Insufficient Stock!"
      );
      return;
    }

    onSave({
      ...sales,
      id: editingSale
        ? editingSale.id
        : Date.now().toString(),

      salesNo: editingSale
        ? editingSale.salesNo
        : salesNo,
    });

    if (!editingSale) {
      reduceStock(
        sales.productCode,
        sales.qty
      );
    }

    setSales(emptySales());

    setAvailableStock(0);
  }

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
          <label style={labelStyle}>
            Sales No
          </label>
          <input
            type="text"
            value={sales.salesNo || salesNo}
            readOnly
            style={{
              ...inputStyle,
              background: "#f3f4f6",
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Sales Date
          </label>
          <input
            type="date"
            name="salesDate"
            value={sales.salesDate}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Invoice No
          </label>
          <input
            type="text"
            value={
              sales.invoiceNo ||
              sales.salesNo
            }
            readOnly
            style={{
              ...inputStyle,
              background: "#f3f4f6",
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Customer
          </label>
          <select
            name="customerCode"
            value={sales.customerCode}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="">
              Select Customer
            </option>

            {customers.map(
              (customer) => (
                <option
                  key={customer.id}
                  value={customer.code}
                >
                  {customer.name}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label style={labelStyle}>
            Product
          </label>
          <select
            name="productCode"
            value={sales.productCode}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="">
              Select Product
            </option>

            {products.map(
              (product) => (
                <option
                  key={product.id}
                  value={product.code}
                >
                  {product.name}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label style={labelStyle}>
            HSN
          </label>
          <input
            type="text"
            value={sales.hsn}
            readOnly
            style={{
              ...inputStyle,
              background: "#f3f4f6",
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Unit
          </label>
          <input
            type="text"
            value={sales.unit}
            readOnly
            style={{
              ...inputStyle,
              background: "#f3f4f6",
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Quantity
          </label>
          <input
            type="number"
            name="qty"
            value={sales.qty}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Sales Rate
          </label>
          <input
            type="number"
            value={sales.rate}
            readOnly
            style={{
              ...inputStyle,
              background: "#f3f4f6",
            }}
          />
        </div>
        <div>
          <label style={labelStyle}>
            Amount
          </label>
          <input
            type="number"
            value={sales.amount}
            readOnly
            style={{
              ...inputStyle,
              background: "#f3f4f6",
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            GST %
          </label>
          <input
            type="number"
            value={sales.gst}
            readOnly
            style={{
              ...inputStyle,
              background: "#f3f4f6",
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            CGST
          </label>
          <input
            type="number"
            value={sales.cgst}
            readOnly
            style={{
              ...inputStyle,
              background: "#f3f4f6",
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            SGST
          </label>
          <input
            type="number"
            value={sales.sgst}
            readOnly
            style={{
              ...inputStyle,
              background: "#f3f4f6",
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Grand Total
          </label>
          <input
            type="number"
            value={sales.grandTotal}
            readOnly
            style={{
              ...inputStyle,
              background: "#f3f4f6",
              fontWeight: 700,
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Available Stock
          </label>
          <input
            type="number"
            value={availableStock}
            readOnly
            style={{
              ...inputStyle,
              background:
                availableStock > 0
                  ? "#dcfce7"
                  : "#fee2e2",
              fontWeight: 700,
            }}
          />
        </div>

        <div
          style={{
            gridColumn: "span 6",
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "8px",
          }}
        >
          <button
            type="submit"
            style={{
              minWidth: "180px",
              height: "40px",
              border: "none",
              borderRadius: "6px",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save Sales
          </button>
        </div>
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "4px",
  fontSize: "12px",
  fontWeight: 600,
  color: "#374151",
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