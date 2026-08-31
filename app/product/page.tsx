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
  loadStock,
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

  /*
    Used only to refresh the Product Register
    after Product → Stock synchronization.
  */
  const [stockRefreshKey, setStockRefreshKey] =
    useState(0);

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

    /*
      Refresh Product Register so that
      it reads the latest StockStorage values.
    */
    setStockRefreshKey(
      (value) => value + 1
    );
  }, [products]);

  /* =====================================================
     PRODUCT REGISTER DISPLAY STOCK

     IMPORTANT:

     Product Register must NOT use
     product.stock as the live stock value.

     StockStorage is the source of truth
     for Current Stock.

     We match by the EXACT product code.

     This is intentionally NOT getCurrentStock()
     because packet products may point to a
     loose/base stock product.
  ===================================================== */

  const stock =
    loadStock();

  const stockMap =
    new Map<
      string,
      number
    >();

  stock.forEach(
    (item) => {
      const code =
        String(
          item?.productCode || ""
        ).trim();

      if (!code) {
        return;
      }

      stockMap.set(
        code,
        Number(
          item?.currentStock || 0
        )
      );
    }
  );

  /*
    Create display products.

    All original Product Master data remains unchanged.

    Only the STOCK value shown in Product Register
    is replaced with the live StockStorage currentStock.
  */

  const displayProducts =
    products.map(
      (product) => ({
        ...product,

        stock:
          stockMap.has(
            product.code
          )
            ? Number(
                stockMap.get(
                  product.code
                ) || 0
              )
            : Number(
                product.stock || 0
              ),
      })
    );

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

      /*
        STOCK BASE

        Packed Uttam Haldi products
        are made from Loose Haldi P0006.

        Loose Haldi itself remains
        its own stock base.
      */

      stockBaseCode:
        product.unit === "Pkt"
          ? "P0006"
          : product.code,
    };

    let updatedProducts: Product[];

    /* ===================================================
       EDIT
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
       NEW
    =================================================== */

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

    /*
      Refresh Product Register
      from StockStorage.
    */

    setStockRefreshKey(
      (value) => value + 1
    );

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

    /* ===================================================
       REMOVE PRODUCT
    =================================================== */

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

    /* ===================================================
       REMOVE STOCK RECORD
    =================================================== */

    deleteStockByProductCode(
      product.code
    );

    /*
      Refresh Product Register.
    */

    setStockRefreshKey(
      (value) => value + 1
    );

    /* ===================================================
       CANCEL EDIT IF NEEDED
    =================================================== */

    if (
      editingProduct?.id === id
    ) {
      setEditingProduct(
        null
      );
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

      {/* =================================================
          PRODUCT REGISTER

          IMPORTANT:
          displayProducts contains the live
          StockStorage currentStock.
      ================================================= */}

      <ProductTable
        key={
          stockRefreshKey
        }
        products={
          displayProducts
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