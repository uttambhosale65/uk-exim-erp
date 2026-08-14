"use client";

import { useEffect, useState } from "react";

import PurchaseForm from "./PurchaseForm";
import PurchaseTable from "./PurchaseTable";
import { Purchase } from "./PurchaseTypes";

import {
  loadPurchases,
  savePurchases,
  getNextPurchaseNo,
} from "./PurchaseStorage";

import {
  updateStock,
  reversePurchaseStock,
} from "../../stock/StockStorage";

export default function PurchaseMaster() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [purchaseNo, setPurchaseNo] =
    useState("PUR-0001");

  const [editingPurchase, setEditingPurchase] =
    useState<Purchase | null>(null);

  /* ==========================================
     LOAD PURCHASES
  ========================================== */

  useEffect(() => {
    const data = loadPurchases();

    setPurchases(data);

    setPurchaseNo(
      getNextPurchaseNo(data)
    );
  }, []);

  /* ==========================================
     SAVE / UPDATE PURCHASE
  ========================================== */

  const handleSave = (purchase: Purchase) => {
    /* ========================================
       EDIT EXISTING PURCHASE
    ======================================== */

    if (editingPurchase) {
      // First remove old purchase quantity
      reversePurchaseStock(
        editingPurchase.productCode,
        editingPurchase.qty
      );

      // Then add new purchase quantity
      updateStock(
        purchase.productCode,
        purchase.productName,
        purchase.hsn,
        purchase.unit,
        purchase.qty
      );

      const updatedPurchases =
        purchases.map((p) =>
          p.id === purchase.id
            ? purchase
            : p
        );

      setPurchases(updatedPurchases);

      savePurchases(updatedPurchases);

      setPurchaseNo(
        getNextPurchaseNo(
          updatedPurchases
        )
      );

      setEditingPurchase(null);

      return;
    }

    /* ========================================
       NEW PURCHASE
    ======================================== */

    const updatedPurchases = [
      ...purchases,
      purchase,
    ];

    setPurchases(updatedPurchases);

    savePurchases(updatedPurchases);

    /* ========================================
       PURCHASE → STOCK
    ======================================== */

    updateStock(
      purchase.productCode,
      purchase.productName,
      purchase.hsn,
      purchase.unit,
      purchase.qty
    );

    setPurchaseNo(
      getNextPurchaseNo(
        updatedPurchases
      )
    );

    setEditingPurchase(null);
  };

  /* ==========================================
     EDIT
  ========================================== */

  const handleEdit = (
    purchase: Purchase
  ) => {
    setEditingPurchase(purchase);
  };

  /* ==========================================
     DELETE PURCHASE
  ========================================== */

  const handleDelete = (id: string) => {
    const purchaseToDelete =
      purchases.find(
        (purchase) =>
          purchase.id === id
      );

    if (!purchaseToDelete) return;

    const confirmed = confirm(
      `Delete Purchase ${purchaseToDelete.purchaseNo}?\n\nStock will also be reduced by ${purchaseToDelete.qty} ${purchaseToDelete.unit}.`
    );

    if (!confirmed) return;

    /* ========================================
       PURCHASE → REVERSE STOCK
    ======================================== */

    reversePurchaseStock(
      purchaseToDelete.productCode,
      purchaseToDelete.qty
    );

    /* ========================================
       DELETE PURCHASE
    ======================================== */

    const updatedPurchases =
      purchases.filter(
        (purchase) =>
          purchase.id !== id
      );

    setPurchases(updatedPurchases);

    savePurchases(updatedPurchases);

    setPurchaseNo(
      getNextPurchaseNo(
        updatedPurchases
      )
    );
  };

  /* ==========================================
     UI
  ========================================== */

  return (
    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: "20px",
        }}
      >
        📥 Purchase Master
      </h2>

      <PurchaseForm
        purchaseNo={purchaseNo}
        editingPurchase={
          editingPurchase
        }
        onSave={handleSave}
      />

      <hr
        style={{
          margin: "25px 0",
          border: "none",
          borderTop:
            "1px solid #e5e7eb",
        }}
      />

      <PurchaseTable
        purchases={purchases}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}