"use client";

import {
  useMemo,
  useState,
} from "react";

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

  /* =========================================
     PRODUCT CODE
  ========================================= */

  const productCode = useMemo(() => {
    if (editingProduct) {
      return editingProduct.code;
    }

    return getNextProductCode(products);
  }, [products, editingProduct]);

  /* =========================================
     SAVE PRODUCT

     IMPORTANT:
     Product Master only manages
     Product Master data.

     It does NOT create or modify
     Stock records.

     Stock is managed separately through:
     1. Opening Stock
     2. Purchase / GRN
     3. Sales / Issue
  ========================================= */

  const handleSave = (product: Product) => {
    let updatedProducts: Product[];

    if (editingProduct) {
      updatedProducts = products.map((item) =>
        item.id === product.id
          ? product
          : item
      );
    } else {
      updatedProducts = [
        ...products,
        product,
      ];
    }

    /* SAVE PRODUCT */

    setProducts(updatedProducts);
    saveProducts(updatedProducts);

    /* EXIT EDIT MODE */

    setEditingProduct(null);
  };

  /* =========================================
     EDIT PRODUCT
  ========================================= */

  const handleEdit = (
    product: Product
  ) => {
    setEditingProduct(product);
  };

  /* =========================================
     DELETE PRODUCT

     Product is NOT hard-deleted.
     Product is marked INACTIVE so that
     existing Stock / Purchase / Sales
     history remains safe.
  ========================================= */

  const handleDelete = (
    id: string
  ) => {
    const productToDeactivate =
      products.find(
        (item) => item.id === id
      );

    if (!productToDeactivate) {
      return;
    }

    const confirmed = window.confirm(
      `Deactivate product "${productToDeactivate.name}"?`
    );

    if (!confirmed) {
      return;
    }

    const updatedProducts =
      products.map((item) =>
        item.id === id
          ? {
              ...item,
              active: false,
            }
          : item
      );

    setProducts(updatedProducts);
    saveProducts(updatedProducts);

    if (
      editingProduct?.id === id
    ) {
      setEditingProduct(null);
    }
  };

  /* =========================================
     CANCEL EDIT
  ========================================= */

  const handleCancelEdit = () => {
    setEditingProduct(null);
  };

  /* =========================================
     PAGE
  ========================================= */

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

      {/* =====================================
          PRODUCT ENTRY
      ===================================== */}

      <ProductForm
        productCode={productCode}
        editingProduct={editingProduct}
        onSave={handleSave}
        onCancelEdit={handleCancelEdit}
      />

      {/* =====================================
          PRODUCT REGISTER
      ===================================== */}

      <ProductTable
        products={products}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}