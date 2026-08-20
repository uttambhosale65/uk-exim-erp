"use client";

import {
  useEffect,
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

import {
  syncProductToStock,
} from "../../components/stock/StockStorage";

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
     PRODUCT → STOCK SYNC
     Existing Products
  ========================================= */

  useEffect(() => {
    products.forEach((product) => {
      syncProductToStock(product);
    });
  }, [products]);

  /* =========================================
     SAVE PRODUCT
     PRODUCT → STOCK
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

    /* PRODUCT → STOCK */

    syncProductToStock(product);

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
  ========================================= */

  const handleDelete = (
    id: string
  ) => {
    const updatedProducts =
      products.filter(
        (item) => item.id !== id
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