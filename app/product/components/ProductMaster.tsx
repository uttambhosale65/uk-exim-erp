"use client";

import {
  useState,
  useMemo,
} from "react";

import ProductForm from "./ProductForm";
import ProductTable from "./ProductTable";
import { Product } from "./ProductTypes";

import {
  getNextProductCode,
} from "./ProductStorage";
import { useProductCatalog } from "../useProductCatalog";

export default function ProductMaster() {
  const { products, loading, error, saveProduct, deactivateProduct } = useProductCatalog();

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

  const handleSave = async (product: Product) => {
    const saved = await saveProduct(product, Boolean(editingProduct));
    setEditingProduct(null);
    return saved;
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

  const handleDelete = async (
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

    await deactivateProduct(id);

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
        availableProducts={products}
        editingProduct={editingProduct}
        onSave={handleSave}
        onCancelEdit={handleCancelEdit}
      />

      {loading && <p role="status">Loading products…</p>}
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}

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
