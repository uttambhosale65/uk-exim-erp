"use client";

import { useState } from "react";
import ProductForm from "./components/ProductForm";
import ProductTable from "./components/ProductTable";
import { Product } from "./components/ProductTypes";

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([
    {
      code: "P0001",
      name: "Turmeric Powder 100g",
      hsn: "09103030",
      gst: "5%",
      unit: "Packet",
      purchase: 40,
      sale: 50,
      mrp: 60,
      stock: 100,
    },
    {
      code: "P0002",
      name: "Turmeric Powder 200g",
      hsn: "09103030",
      gst: "5%",
      unit: "Packet",
      purchase: 75,
      sale: 90,
      mrp: 100,
      stock: 80,
    },
  ]);

  const addProduct = (product: Product) => {
    setProducts((prev) => [...prev, product]);
  };

  return (
    <div
      style={{
        padding: "30px",
        background: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          color: "#14532d",
          marginBottom: "20px",
        }}
      >
        📦 UK EXIM ERP - Product Master
      </h1>

      <ProductForm
        products={products}
        onSave={addProduct}
      />

      <ProductTable
        products={products}
      />
    </div>
  );
}