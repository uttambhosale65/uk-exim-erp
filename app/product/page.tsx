"use client";

import { useMemo, useState } from "react";

import ProductForm from "./components/ProductForm";
import ProductTable from "./components/ProductTable";

import { Product } from "./components/ProductTypes";

import {
  loadProducts,
  saveProducts,
  getNextProductCode,
} from "./components/ProductStorage";

export default function ProductPage() {
  const [products, setProducts] =
    useState<Product[]>(() =>
      loadProducts()
    );

  const [
    editingProduct,
    setEditingProduct,
  ] =
    useState<Product | null>(null);

  /* =====================================================
     PRODUCT CODE
  ===================================================== */

  const productCode = useMemo(() => {
    if (editingProduct) {
      return editingProduct.code;
    }

    return getNextProductCode(products);
  }, [products, editingProduct]);

  /* =====================================================
     SAVE PRODUCT

     IMPORTANT:

     Product Master is responsible ONLY for
     Product Master data.

     It does NOT create, update or delete
     Stock records.

     Stock is controlled separately through:

     1. Opening Stock
     2. Purchase / GRN
     3. Sales / Issue
  ===================================================== */

  const handleSave = (
    product: Product
  ) => {
    const finalProduct: Product = {
      ...product,

      baseCost:
        Number(
          product.baseCost || 0
        ),

      packingCost:
        Number(
          product.packingCost || 0
        ),

      otherCharges:
        Number(
          product.otherCharges || 0
        ),

      totalCost:
        Number(
          product.baseCost || 0
        ) +
        Number(
          product.packingCost || 0
        ) +
        Number(
          product.otherCharges || 0
        ),

      /*
        Packed products are linked to
        the loose/base stock product.

        This is PRODUCT information only.
        It does NOT create stock.
      */

      stockBaseCode:
        product.unit === "Pkt"
          ? "P0006"
          : product.code,
    };

    let updatedProducts: Product[];

    /* ===================================================
       EDIT PRODUCT
    =================================================== */

    if (editingProduct) {
      updatedProducts =
        products.map(
          (item) =>
            item.id ===
            finalProduct.id
              ? finalProduct
              : item
        );
    }

    /* ===================================================
       NEW PRODUCT
    =================================================== */

    else {
      updatedProducts = [
        ...products,
        finalProduct,
      ];
    }

    /* ===================================================
       SAVE PRODUCT MASTER ONLY
    =================================================== */

    setProducts(
      updatedProducts
    );

    saveProducts(
      updatedProducts
    );

    /*
      IMPORTANT:
      No Product → Stock synchronization here.
    */

    setEditingProduct(
      null
    );
  };

  /* =====================================================
     EDIT PRODUCT
  ===================================================== */

  const handleEdit = (
    product: Product
  ) => {
    setEditingProduct(
      product
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================================
     DELETE PRODUCT

     Product Master deletion only.

     Existing Stock / Purchase / Sales
     history is NOT touched here.

     Product is marked INACTIVE instead
     of physically deleting it.
  ===================================================== */

  const handleDelete = (
    id: string
  ) => {
    const product =
      products.find(
        (item) =>
          item.id === id
      );

    if (!product) {
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to deactivate "${product.name}"?\n\n` +
        `The product will be marked INACTIVE.\n\n` +
        `Existing Purchase, Sales and Stock history will NOT be deleted.`
      );

    if (!confirmed) {
      return;
    }

    const updatedProducts =
      products.map(
        (item) =>
          item.id === id
            ? {
                ...item,
                active: false,
              }
            : item
      );

    setProducts(
      updatedProducts
    );

    saveProducts(
      updatedProducts
    );

    if (
      editingProduct?.id === id
    ) {
      setEditingProduct(
        null
      );
    }
  };

  /* =====================================================
     CANCEL EDIT
  ===================================================== */

  const handleCancelEdit = () => {
    setEditingProduct(
      null
    );
  };

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div
      style={{
        padding: "20px",
        width: "100%",
        minWidth: 0,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div
        style={{
          marginBottom:
            "18px",
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

      {/* =================================================
          PRODUCT ENTRY
      ================================================= */}

      <div
        style={{
          background:
            "#ffffff",
          borderRadius:
            "10px",
          padding: "15px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.12)",
          marginBottom:
            "20px",
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginBottom:
              "12px",
          }}
        >
          <h2
            style={{
              margin: 0,
              color:
                "#14532d",
              fontSize:
                "18px",
            }}
          >
            📝 Product Entry
          </h2>

          {editingProduct && (
            <span
              style={{
                background:
                  "#fef3c7",
                color:
                  "#92400e",
                padding:
                  "5px 10px",
                borderRadius:
                  "5px",
                fontSize:
                  "12px",
                fontWeight:
                  600,
              }}
            >
              ✏️ Editing Product
            </span>
          )}
        </div>

        <ProductForm
          productCode={
            productCode
          }
          editingProduct={
            editingProduct
          }
          onSave={
            handleSave
          }
          onCancelEdit={
            handleCancelEdit
          }
        />
      </div>

      {/* =================================================
          PRODUCT REGISTER
      ================================================= */}

      <ProductTable
        products={
          products
        }
        onEdit={
          handleEdit
        }
        onDelete={
          handleDelete
        }
      />
    </div>
  );
}