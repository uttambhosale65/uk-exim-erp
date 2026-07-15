"use client";

import { useEffect, useState } from "react";

import { Purchase } from "./PurchaseTypes";
import { Supplier } from "../../supplier/SupplierTypes";
import { Product } from "../../../product/components/ProductTypes";

import { loadSuppliers } from "../../supplier/SupplierStorage";
import { loadProducts } from "../../../product/components/ProductStorage";
import { updateStock } from "../../stock/StockStorage";

type PurchaseFormProps = {
  purchaseNo: string;
  onSave: (purchase: Purchase) => void;
};

export default function PurchaseForm({
  purchaseNo,
  onSave,
}: PurchaseFormProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [purchase, setPurchase] = useState<Purchase>({
    id: "",
    purchaseNo,
    purchaseDate: "",
    invoiceNo: "",
    supplierCode: "",
    supplierName: "",
    productCode: "",
    productName: "",
    hsn: "",
    unit: "",
    qty: 0,
    rate: 0,
    amount: 0,
  });

  useEffect(() => {
    setSuppliers(loadSuppliers());
    setProducts(loadProducts());
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;

    let updated: Purchase = {
      ...purchase,
      [name]:
        name === "qty" || name === "rate"
          ? Number(value)
          : value,
    };

    if (name === "supplierCode") {
      const supplier = suppliers.find(
        (s) => s.code === value
      );

      if (supplier) {
        updated.supplierCode = supplier.code;
        updated.supplierName = supplier.name;
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
        updated.rate = product.purchase;
      }
    }

    updated.amount = updated.qty * updated.rate;

    setPurchase(updated);
  }

  function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    onSave({
      ...purchase,
      id: Date.now().toString(),
      purchaseNo,
    });

    updateStock(
      purchase.productCode,
      purchase.productName,
      purchase.hsn,
      purchase.unit,
      purchase.qty
    );

    setPurchase({
      id: "",
      purchaseNo,
      purchaseDate: "",
      invoiceNo: "",
      supplierCode: "",
      supplierName: "",
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
    <form
  onSubmit={handleSubmit}
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "15px",
    alignItems: "end",
  }}
>
      <h2>Purchase Entry</h2>

      <input
        type="date"
        name="purchaseDate"
        value={purchase.purchaseDate}
        onChange={handleChange}
        style={{ width: "180px", padding: "8px", margin: "5px" }}
      />

      <input
        type="text"
        name="invoiceNo"
        placeholder="Invoice No"
        value={purchase.invoiceNo}
        onChange={handleChange}
        style={{ width: "180px", padding: "8px", margin: "5px" }}
      />
      <select
        name="supplierCode"
        value={purchase.supplierCode}
        onChange={handleChange}
        style={{ width: "220px", padding: "8px", margin: "5px" }}
      >
        <option value="">Select Supplier</option>

        {suppliers.map((supplier) => (
          <option
            key={supplier.id}
            value={supplier.code}
          >
            {supplier.name}
          </option>
        ))}
      </select>

      <select
        name="productCode"
        value={purchase.productCode}
        onChange={handleChange}
        style={{ width: "220px", padding: "8px", margin: "5px" }}
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
        placeholder="HSN"
        value={purchase.hsn}
        readOnly
        style={{ width: "120px", padding: "8px", margin: "5px" }}
      />

      <input
        type="text"
        placeholder="Unit"
        value={purchase.unit}
        readOnly
        style={{ width: "120px", padding: "8px", margin: "5px" }}
      />

    <input
  type="text"
  name="qty"
  placeholder="Quantity"
  value={purchase.qty}
  onChange={handleChange}
  style={{
    border: "2px solid red",
    background: "yellow",
    width: "120px",
    padding: "8px",
  }}
/>

      <input
        type="number"
        name="rate"
        placeholder="Purchase Rate"
        value={purchase.rate}
        onChange={handleChange}
        style={{ width: "120px", padding: "8px", margin: "5px" }}
      />

      <input
        type="number"
        placeholder="Amount"
        value={purchase.amount}
        readOnly
        style={{ width: "120px", padding: "8px", margin: "5px" }}
      />

      <br />
      <br />

      <button type="submit">
        Save Purchase
      </button>
    </form>
  );
}