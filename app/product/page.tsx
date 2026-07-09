"use client";

import { useEffect, useState } from "react";
import ProductForm from "./components/ProductForm";
import ProductTable from "./components/ProductTable";
import { Product } from "./components/ProductTypes";
import {
  loadProducts,
  saveProducts,
} from "./components/ProductStorage";
export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([ 
    { 
      
      
      id: "1",
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
      id: "2",
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
useEffect(() => {
  const data = loadProducts();

  if (data.length > 0) {
    setProducts(data);
  }
}, []);

useEffect(() => {
  saveProducts(products);
}, [products]);
 const addProduct = (product: Product) => {
  if (editingProduct) {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? product : p))
    );

    setEditingProduct(null);
  } else {
    setProducts((prev) => [...prev, product]);
  }
};

  const editProduct = (product: Product) => {
  setEditingProduct(product);
};

  const deleteProduct = (id: string) => {
    const ok = confirm("Are you sure you want to delete this product?");
    if (!ok) return;

    setProducts((prev) => prev.filter((p) => p.id !== id));
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
  editingProduct={editingProduct}
/>

      <ProductTable
        products={products}
        onEdit={editProduct}
        onDelete={deleteProduct}
      />
    </div>
  );
}