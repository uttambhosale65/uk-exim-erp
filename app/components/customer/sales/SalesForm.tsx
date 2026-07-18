"use client";

import { useEffect, useState } from "react";

import { Sales } from "./SalesTypes";
import { Customer } from "../CustomerTypes";
import { Product } from "../../../product/components/ProductTypes";

import { loadCustomers } from "../CustomerStorage";
import { loadProducts } from "../../../product/components/ProductStorage";
import { reduceStock } from "../../stock/StockStorage";

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableStock, setAvailableStock] =
  useState(0);

  const [sales, setSales] = useState<Sales>({
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

  useEffect(() => {
    setCustomers(loadCustomers());
    setProducts(loadProducts());
  }, []);
useEffect(() => {
  if (editingSale) {
    setSales(editingSale);
  }
}, [editingSale]);
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;

    let updated: Sales = {
      ...sales,
      [name]:
        name === "qty" || name === "rate"
          ? Number(value)
          : value,
    };

    if (name === "customerCode") {
      const customer = customers.find(
        (c) => c.code === value
      );

      if (customer) {
        updated.customerCode = customer.code;
        updated.customerName = customer.name;
      }
    }

    if (name === "productCode") {
      const product = products.find(
        (p) => p.code === value
      );

      if (product) {
        updated.productCode = product.code;
        updated.productName = product.name;
        updated.hsn = product.hsn;
        updated.unit = product.unit;
        updated.rate = product.sale;
        updated.gst = parseFloat(product.gst);
        setAvailableStock(product.stock);
      }
    }

    updated.amount =
  Number(updated.qty) *
  Number(updated.rate);
  updated.taxableAmount = updated.amount;

updated.cgst =
  (updated.taxableAmount * updated.gst) / 200;

updated.sgst =
  (updated.taxableAmount * updated.gst) / 200;

updated.igst = 0;

updated.grandTotal =
  updated.taxableAmount +
  updated.cgst +
  updated.sgst;
console.log(
  "GST =", updated.gst,
  "Amount =", updated.amount,
  "CGST =", updated.cgst,
  "SGST =", updated.sgst,
  "Grand Total =", updated.grandTotal
);
    setSales(updated);
  }
  function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();
    if (sales.qty > availableStock) {
  alert(
    "Insufficient Stock! Please check available quantity."
  );
  return;
}
console.log("editingSale =", editingSale);
   onSave({
  ...sales,
  id: editingSale ? editingSale.id : Date.now().toString(),
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

    setSales({
      id: "",
      salesNo,
      salesDate: "",
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
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Sales Entry</h2>
      <div
  style={{
    marginBottom: "15px",
    fontWeight: "bold",
    color: "#0d6efd",
  }}
>
  Sales No : {sales.salesNo || salesNo}
</div>

      <input
        type="date"
        name="salesDate"
        value={sales.salesDate}
        onChange={handleChange}
      />

      <input
  type="text"
  name="invoiceNo"
  value={sales.invoiceNo || sales.salesNo}
  readOnly
/>

      <select
        name="customerCode"
        value={sales.customerCode}
        onChange={handleChange}
      >
        <option value="">Select Customer</option>

        {customers.map((customer) => (
          <option
            key={customer.id}
            value={customer.code}
          >
            {customer.name}
          </option>
        ))}
      </select>

      <select
        name="productCode"
        value={sales.productCode}
        onChange={handleChange}
      >
        <option value="">Select Product</option>

        {products.map((product) => (
          <option
            key={product.id}
            value={product.code}
          >
            {product.name}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={sales.hsn}
        placeholder="HSN"
        readOnly
      />

      <input
        type="text"
        value={sales.unit}
        placeholder="Unit"
        readOnly
      />

      <input
        type="number"
        name="qty"
        placeholder="Quantity"
        value={sales.qty}
        onChange={handleChange}
      />

      <input
  type="number"
  name="rate"
  placeholder="Sales Rate"
  value={sales.rate}
  readOnly
/>

      <input
        type="number"
        value={sales.amount}
        placeholder="Amount"
        readOnly
      />
      <input
  type="number"
  value={sales.gst}
  placeholder="GST %"
  readOnly
/>

<input
  type="number"
  value={sales.cgst}
  placeholder="CGST"
  readOnly
/>

<input
  type="number"
  value={sales.sgst}
  placeholder="SGST"
  readOnly
/>

<input
  type="number"
  value={sales.grandTotal}
  placeholder="Grand Total"
  readOnly
/>
<div
  style={{
    color: "#0d6efd",
    fontWeight: "bold",
    marginTop: "8px",
    marginBottom: "10px",
  }}
>
  Available Stock : {availableStock}
</div>
      <br />
      <br />

      <button type="submit">
        Save Sales
      </button>
    </form>
  );
}