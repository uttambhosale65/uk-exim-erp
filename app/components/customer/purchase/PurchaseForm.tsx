"use client";

import { useEffect, useState } from "react";

import { Purchase } from "./PurchaseTypes";
import { Supplier } from "../../supplier/SupplierTypes";
import { Product } from "../../../product/components/ProductTypes";

import { loadSuppliers } from "../../supplier/SupplierStorage";
import { loadProducts } from "../../../product/components/ProductStorage";
import { updateStock } from "../../stock/StockStorage";

import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Button from "../../ui/Button";

type PurchaseFormProps = {
  purchaseNo: string;
  onSave: (purchase: Purchase) => void;
  editingPurchase: Purchase | null;
};

export default function PurchaseForm({
  purchaseNo,
  onSave,
  editingPurchase,
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
useEffect(() => {
  if (editingPurchase) {
    setPurchase(editingPurchase);
  }
}, [editingPurchase]);
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
  id: editingPurchase ? editingPurchase.id : Date.now().toString(),
  purchaseNo: editingPurchase
    ? editingPurchase.purchaseNo
    : purchaseNo,
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
        gridTemplateColumns:
          "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
      }}
    >
      <Input
        label="Purchase Date"
        type="date"
        name="purchaseDate"
        value={purchase.purchaseDate}
        onChange={handleChange}
      />

      <Input
        label="Invoice No"
        name="invoiceNo"
        value={purchase.invoiceNo}
        onChange={handleChange}
        placeholder="Invoice Number"
      />

      <Select
        label="Supplier"
        name="supplierCode"
        value={purchase.supplierCode}
        onChange={handleChange}
      >
        <option value="">
          Select Supplier
        </option>

        {suppliers.map((supplier) => (
          <option
            key={supplier.id}
            value={supplier.code}
          >
            {supplier.name}
          </option>
        ))}
      </Select>

      <Select
        label="Product"
        name="productCode"
        value={purchase.productCode}
        onChange={handleChange}
      >
        <option value="">
          Select Product
        </option>

        {products.map((product) => (
          <option
            key={product.id}
            value={product.code}
          >
            {product.name}
          </option>
        ))}
      </Select>

      <Input
        label="HSN"
        value={purchase.hsn}
        readOnly
      />

      <Input
        label="Unit"
        value={purchase.unit}
        readOnly
      />
      <Input
        label="Quantity"
        type="number"
        name="qty"
        value={purchase.qty}
        onChange={handleChange}
      />

      <Input
        label="Purchase Rate"
        type="number"
        name="rate"
        value={purchase.rate}
        onChange={handleChange}
      />

      <Input
        label="Amount"
        value={purchase.amount}
        readOnly
      />

      <div
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "10px",
        }}
      >
       <Button
  type="submit"
  title={
    editingPurchase
      ? "✏️ Update Purchase"
      : "💾 Save Purchase"
  }
/>
      </div>
    </form>
  );
}