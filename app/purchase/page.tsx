"use client";

import { useEffect, useMemo, useState } from "react";

import Layout from "../components/ui/Layout";
import Card from "../components/ui/Card";
import PageTitle from "../components/ui/PageTitle";

import PurchaseForm from "../components/customer/purchase/PurchaseForm";
import PurchaseTable from "../components/customer/purchase/PurchaseTable";

import { Purchase } from "../components/customer/purchase/PurchaseTypes";

import {
  loadPurchases,
  savePurchases,
  getNextPurchaseNo,
} from "../components/customer/purchase/PurchaseStorage";
import {
  loadProducts,
} from "../product/components/ProductStorage";

import {
  convertToStockQty,
} from "../components/stock/StockStorage";
import {
  loadStock,
  saveStock,
  reversePurchaseStock,
} from "../components/stock/StockStorage";
export default function PurchasePage() {
  const [purchases, setPurchases] =
    useState<Purchase[]>([]);

  const [purchaseNo, setPurchaseNo] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [editingPurchase, setEditingPurchase] =
    useState<Purchase | null>(null);

  useEffect(() => {
    const data = loadPurchases();

    setPurchases(data);

   setPurchaseNo(getNextPurchaseNo(data));
  }, []);

  useEffect(() => {
    savePurchases(purchases);

   setPurchaseNo(getNextPurchaseNo(purchases));
  }, [purchases]);
/* =====================================================
   GET PURCHASE STOCK IMPACT

   Packed Product → Stock Base Product
   Packet Qty → KG
===================================================== */

function getPurchaseStockImpact(
  productCode: string,
  qty: number
) {
  const product =
    loadProducts().find(
      (p) =>
        p.code === productCode
    );

  if (!product) {
    return {
      stockProductCode:
        productCode,
      stockQty:
        Number(qty) || 0,
      productName: "",
      hsn: "",
    };
  }

  const stockProductCode =
    product.stockBaseCode ||
    product.code;

  const stockQty =
    convertToStockQty(
      Number(qty),
      product.unit,
      product.netWeight
    );

  return {
    stockProductCode,
    stockQty,
    productName:
      product.name,
    hsn:
      product.hsn,
  };
}
 function addPurchase(
  purchase: Purchase
) {
  /*
    EDIT PURCHASE

    जुना Purchase सध्या Stock ला
    लागू केलेला नसल्यामुळे येथे
    Stock calculation नंतर करू.
  */

if (editingPurchase) {
  /*
    OLD PURCHASE → STOCK REVERSE
  */

  editingPurchase.items.forEach(
    (item) => {
      if (
        !item.productCode ||
        Number(item.qty) <= 0
      ) {
        return;
      }

      const impact =
        getPurchaseStockImpact(
          item.productCode,
          Number(item.qty)
        );

      reversePurchaseStock(
        impact.stockProductCode,
        impact.stockQty
      );
    }
  );

  /*
    NEW PURCHASE → STOCK ADD
  */

  const stock =
    loadStock();

  const updatedStock = [
    ...stock,
  ];

  purchase.items.forEach(
    (item) => {
      if (
        !item.productCode ||
        Number(item.qty) <= 0
      ) {
        return;
      }

      const impact =
        getPurchaseStockImpact(
          item.productCode,
          Number(item.qty)
        );

      const index =
        updatedStock.findIndex(
          (stockItem) =>
            stockItem.productCode ===
            impact.stockProductCode
        );

      if (index === -1) {
        return;
      }

      updatedStock[index].purchaseQty =
        Number(
          updatedStock[index]
            .purchaseQty || 0
        ) + impact.stockQty;

      updatedStock[index].currentStock =
        Number(
          updatedStock[index]
            .openingStock || 0
        ) +
        Number(
          updatedStock[index]
            .purchaseQty || 0
        ) -
        Number(
          updatedStock[index]
            .salesQty || 0
        );
    }
  );

  saveStock(updatedStock);

  setPurchases((prev) =>
    prev.map((p) =>
      p.id === purchase.id
        ? purchase
        : p
    )
  );

  setEditingPurchase(null);

  return;
}

  /*
    NEW PURCHASE
  */

  const stock =
    loadStock();

  const updatedStock = [
    ...stock,
  ];

  purchase.items.forEach(
    (item) => {
      if (
        !item.productCode ||
        Number(item.qty) <= 0
      ) {
        return;
      }

      const product =
        loadProducts().find(
          (p) =>
            p.code ===
            item.productCode
        );

      if (!product) {
        return;
      }

      const stockProductCode =
        product.stockBaseCode ||
        product.code;

      const stockQty =
        convertToStockQty(
          Number(item.qty),
          product.unit,
          product.netWeight
        );

      const index =
        updatedStock.findIndex(
          (stockItem) =>
            stockItem.productCode ===
            stockProductCode
        );

      if (index === -1) {
        return;
      }

      updatedStock[index].purchaseQty =
        Number(
          updatedStock[index]
            .purchaseQty || 0
        ) + stockQty;

      updatedStock[index].currentStock =
        Number(
          updatedStock[index]
            .openingStock || 0
        ) +
        Number(
          updatedStock[index]
            .purchaseQty || 0
        ) -
        Number(
          updatedStock[index]
            .salesQty || 0
        );
    }
  );

  saveStock(updatedStock);

  setPurchases((prev) => [
    ...prev,
    purchase,
  ]);

  setEditingPurchase(null);
}
  function handleEditPurchase(
    purchase: Purchase
  ) {
    setEditingPurchase(purchase);
  }

  function handleDeletePurchase(
    id: string
  ) {
    if (!confirm("Delete this Purchase?")) return;
    const purchase =
  purchases.find(
    (item) =>
      item.id === id
  );

if (!purchase) {
  return;
}

purchase.items.forEach(
  (item) => {
    if (
      !item.productCode ||
      Number(item.qty) <= 0
    ) {
      return;
    }

    const impact =
      getPurchaseStockImpact(
        item.productCode,
        Number(item.qty)
      );

    reversePurchaseStock(
      impact.stockProductCode,
      impact.stockQty
    );
  }
);
    setPurchases((prev) =>
      prev.filter(
        (purchase) => purchase.id !== id
      )
    );
  }

  const filteredPurchases = useMemo(() => {
    const text = search.toLowerCase();

    return purchases.filter(
      (purchase) =>
        purchase.purchaseNo
          .toLowerCase()
          .includes(text) ||
        purchase.supplierName
          .toLowerCase()
          .includes(text) 
     );
  }, [purchases, search]);
  return (
    <Layout title="UK EXIM ERP">
      <PageTitle
        title="📦 Purchase Master"
        subtitle="Purchase Entry & Purchase Register"
      />

      <Card title="Purchase Entry">
        <PurchaseForm
          purchaseNo={purchaseNo}
          onSave={addPurchase}
          editingPurchase={editingPurchase}
        />
      </Card>

      <Card title="Purchase Register">
        <div
          style={{
            marginBottom: "12px",
          }}
        >
          <input
            type="text"
            placeholder="🔍 Search Purchase No / Supplier / Product"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            style={{
              width: "100%",
              height: "40px",
              padding: "0 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <PurchaseTable
          purchases={filteredPurchases}
          onEdit={handleEditPurchase}
          onDelete={handleDeletePurchase}
        />
      </Card>
    </Layout>
  );
}