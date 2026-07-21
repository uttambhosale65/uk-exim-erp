"use client";

import { useState } from "react";
import ProductForm from "./components/ProductForm";
import ProductTable from "./components/ProductTable";
import { Product } from "./components/ProductTypes";
import {
  loadProducts,
  saveProducts,
} from "./components/ProductStorage";

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>(loadProducts());

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const handleSave = (product: Product) => {
    let updatedProducts: Product[];

    if (editingProduct) {
      updatedProducts = products.map((item) =>
        item.id === product.id ? product : item
      );
    } else {
      updatedProducts = [...products, product];
    }

    setProducts(updatedProducts);
    saveProducts(updatedProducts);

    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
  };

  const handleDelete = (id: string) => {
    const updatedProducts = products.filter(
      (item) => item.id !== id
    );

    setProducts(updatedProducts);
    saveProducts(updatedProducts);

    if (editingProduct?.id === id) {
      setEditingProduct(null);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          color: "#14532d",
          marginBottom: "20px",
        }}
      >
        📦 Product Master
      </h1>

      <ProductForm
        products={products}
        onSave={handleSave}
        editingProduct={editingProduct}
      />

      <ProductTable
        products={products}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}