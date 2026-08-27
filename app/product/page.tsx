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
  deleteStockByProductCode,
} from "../components/stock/StockStorage";

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
     PRODUCT → STOCK SYNC

     Product Master changes are reflected
     in Stock Master.

     Existing purchase/sales quantities
     remain preserved by StockStorage.
  ===================================================== */

  useEffect(() => {
    if (!products.length) {
      return;
    }

    products.forEach(
      (product) => {
        syncProductToStock(
          product
        );
      }
    );
  }, [products]);

  /* =====================================================
     SAVE PRODUCT
  ===================================================== */

  const handleSave = (
    product: Product
  ) => {
    /*
      Final Total Cost
    */

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
    };

    let updatedProducts: Product[];

    /* EDIT */

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

    /* NEW */

    else {
      updatedProducts = [
        ...products,
        finalProduct,
      ];
    }

    setProducts(
      updatedProducts
    );

    saveProducts(
      updatedProducts
    );

    /*
      Product → Stock
    */

    syncProductToStock(
      finalProduct
    );

    setEditingProduct(null);
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

     Product Master delete
     → Stock Master delete

     Historical Purchase/Sales records
     are NOT deleted.
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
        `Are you sure you want to delete "${product.name}"?\n\n` +
        `This will remove the product from Product Master and Stock Master.\n\n` +
        `Existing Purchase and Sales records will NOT be deleted.`
      );

    if (!confirmed) {
      return;
    }

    /*
      Remove Product
    */

    const updatedProducts =
      products.filter(
        (item) =>
          item.id !== id
      );

    setProducts(
      updatedProducts
    );

    saveProducts(
      updatedProducts
    );

    /*
      Remove Stock record
    */

    deleteStockByProductCode(
      product.code
    );

    /*
      Cancel edit if needed
    */

    if (
      editingProduct?.id === id
    ) {
      setEditingProduct(null);
    }
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
      {/* PAGE HEADER */}

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

      {/* PRODUCT ENTRY */}

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
          productCode={getNextProductCode(
            products
          )}
          editingProduct={
            editingProduct
          }
          onSave={
            handleSave
          }
          onCancelEdit={() =>
            setEditingProduct(
              null
            )
          }
        />
      </div>

      {/* PRODUCT REGISTER */}

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