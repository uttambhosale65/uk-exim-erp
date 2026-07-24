"use client";

import { useMemo, useState } from "react";
import ProductForm from "./ProductForm";
import ProductTable from "./ProductTable";
import { Product } from "./ProductTypes";
import {
  loadProducts,
  saveProducts,
  getNextProductCode,
} from "./ProductStorage";

export default function ProductMaster() {
  const [products, setProducts] =
    useState<Product[]>(loadProducts());

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const productCode = useMemo(() => {
    if (editingProduct) {
      return editingProduct.code;
    }

    return getNextProductCode(products);
  }, [products, editingProduct]);
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

  const handleCancelEdit = () => {
    setEditingProduct(null);
  };
  return (
    <div
      style={{
        padding: "10px",
      }}
    >
      <h2
        style={{
          color: "#14532d",
          marginBottom: "15px",
        }}
      >
        📦 Product Master
      </h2>

      <ProductForm
        productCode={productCode}
        editingProduct={editingProduct}
        onSave={handleSave}
        onCancelEdit={handleCancelEdit}
      />

      <ProductTable
        products={products}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}