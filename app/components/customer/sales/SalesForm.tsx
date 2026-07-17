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

  const [sales, setSales] = useState<Sales>({
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

    qty: 0,
    rate: 0,
    amount: 0,
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
      }
    }

    updated.amount = updated.qty * updated.rate;

    setSales(updated);
  }
  function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();
console.log("editingSale =", editingSale);
   onSave({
  ...sales,
  id: editingSale ? editingSale.id : Date.now().toString(),
  salesNo: editingSale
    ? editingSale.salesNo
    : salesNo,
});

    reduceStock(
      sales.productCode,
      sales.qty
    );

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

      qty: 0,
      rate: 0,
      amount: 0,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Sales Entry</h2>

      <input
        type="date"
        name="salesDate"
        value={sales.salesDate}
        onChange={handleChange}
      />

      <input
        type="text"
        name="invoiceNo"
        placeholder="Invoice No"
        value={sales.invoiceNo}
        onChange={handleChange}
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
        onChange={handleChange}
      />

      <input
        type="number"
        value={sales.amount}
        placeholder="Amount"
        readOnly
      />

      <br />
      <br />

      <button type="submit">
        Save Sales
      </button>
    </form>
  );
}