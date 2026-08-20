"use client";

import { useEffect, useState } from "react";
import ProductForm from "./components/ProductForm";
import ProductTable from "./components/ProductTable";
import { Product } from "./components/ProductTypes";
import {
  loadProducts,
  saveProducts,
  getNextProductCode,
} from "./components/ProductStorage";
import {
  syncProductToStock,
} from "../components/stock/StockStorage";

export default function ProductPage() {
  const [products, setProducts] =
    useState<Product[]>(loadProducts());

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);
useEffect(() => {
  products.forEach((product) => {
    syncProductToStock(product);
  });
}, [products]);
  /* =========================
     SAVE PRODUCT
     PRODUCT → STOCK SYNC
  ========================= */

  const handleSave = (product: Product) => {
    console.log(
      "🔥 HANDLE SAVE CALLED:",
      product
    );

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

    setProducts(updatedProducts);
    saveProducts(updatedProducts);

    console.log(
      "🔥 CALLING STOCK SYNC:",
      product
    );

    syncProductToStock(product);

    setEditingProduct(null);
  };

  /* =========================
     EDIT PRODUCT
  ========================= */

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
  };

  /* =========================
     DELETE PRODUCT
  ========================= */

  const handleDelete = (id: string) => {
    const updatedProducts =
      products.filter(
        (item) => item.id !== id
      );

    setProducts(updatedProducts);
    saveProducts(updatedProducts);

    if (editingProduct?.id === id) {
      setEditingProduct(null);
    }
  };

  /* =========================
     PAGE
  ========================= */

  return (
    <div
      style={{
        padding: "20px",
        width: "100%",
        maxWidth: "1600px",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* ============================
          PAGE HEADER
      ============================= */}

      <div
        style={{
          marginBottom: "18px",
        }}
      >
        <h1
          style={{
            color: "#14532d",
            margin: 0,
            fontSize: "28px",
            fontWeight: 700,
          }}
        >
          📦 Product Master
        </h1>

        <div
          style={{
            marginTop: "5px",
            color: "#6b7280",
            fontSize: "14px",
          }}
        >
          Product Entry & Product Register
        </div>
      </div>

      {/* ============================
          PRODUCT ENTRY
      ============================= */}

      <div
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          padding: "15px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.12)",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#14532d",
              fontSize: "18px",
            }}
          >
            📝 Product Entry
          </h2>

          {editingProduct && (
            <span
              style={{
                background: "#fef3c7",
                color: "#92400e",
                padding: "5px 10px",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              ✏️ Editing Product
            </span>
          )}
        </div>

        <ProductForm
          productCode={getNextProductCode(
            products
          )}
          editingProduct={editingProduct}
          onSave={handleSave}
          onCancelEdit={() =>
            setEditingProduct(null)
          }
        />
      </div>

      {/* ============================
          PRODUCT REGISTER
      ============================= */}

      <ProductTable
        products={products}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}