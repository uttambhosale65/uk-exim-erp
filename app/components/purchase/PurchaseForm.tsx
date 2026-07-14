"use client";

import { useState } from "react";
import { Purchase } from "./PurchaseTypes";

type PurchaseFormProps = {
  purchaseNo: string;
  onSave: (purchase: Purchase) => void;
};

export default function PurchaseForm({
  purchaseNo,
  onSave,
}: PurchaseFormProps) {
  const [purchase, setPurchase] = useState<Purchase>({
    id: "",
    purchaseNo,
    purchaseDate: "",
    invoiceNo: "",
    supplierCode: "",
    supplierName: "",
    productCode: "",
    productName: "",
    qty: 0,
    rate: 0,
    amount: 0,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    const updated = {
      ...purchase,
      [name]:
        name === "qty" || name === "rate"
          ? Number(value)
          : value,
    };

    updated.amount = updated.qty * updated.rate;

    setPurchase(updated);
  };

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    onSave({
      ...purchase,
      id: Date.now().toString(),
      purchaseNo,
    });

    setPurchase({
      id: "",
      purchaseNo,
      purchaseDate: "",
      invoiceNo: "",
      supplierCode: "",
      supplierName: "",
      productCode: "",
      productName: "",
      qty: 0,
      rate: 0,
      amount: 0,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Purchase Entry</h2>

      <input
        type="date"
        name="purchaseDate"
        value={purchase.purchaseDate}
        onChange={handleChange}
      />

      <input
        name="invoiceNo"
        placeholder="Invoice No"
        value={purchase.invoiceNo}
        onChange={handleChange}
      />

      <input
        name="supplierCode"
        placeholder="Supplier Code"
        value={purchase.supplierCode}
        onChange={handleChange}
      />

      <input
        name="supplierName"
        placeholder="Supplier Name"
        value={purchase.supplierName}
        onChange={handleChange}
      />

      <input
        name="productCode"
        placeholder="Product Code"
        value={purchase.productCode}
        onChange={handleChange}
      />

      <input
        name="productName"
        placeholder="Product Name"
        value={purchase.productName}
        onChange={handleChange}
      />

      <input
        type="number"
        name="qty"
        placeholder="Quantity"
        value={purchase.qty}
        onChange={handleChange}
      />

      <input
        type="number"
        name="rate"
        placeholder="Rate"
        value={purchase.rate}
        onChange={handleChange}
      />

      <input
        value={purchase.amount}
        readOnly
        placeholder="Amount"
      />

      <br />
      <br />

      <button type="submit">
        Save Purchase
      </button>
    </form>
  );
}