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

export default function PurchaseMaster() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseNo, setPurchaseNo] =
    useState("PUR-0001");

  const [editingPurchase, setEditingPurchase] =
    useState<Purchase | null>(null);

  useEffect(() => {
    const data = loadPurchases();
    console.log(data);
    setPurchases(data);
    setPurchaseNo(getNextPurchaseNo(data));
  }, []);

  const handleSave = (purchase: Purchase) => {
    let updatedPurchases: Purchase[];

    if (editingPurchase) {
      updatedPurchases = purchases.map((p) =>
        p.id === purchase.id ? purchase : p
      );
    } else {
      updatedPurchases = [
        ...purchases,
        purchase,
      ];
    }

    setPurchases(updatedPurchases);

    savePurchases(updatedPurchases);

    setPurchaseNo(
      getNextPurchaseNo(updatedPurchases)
    );

    setEditingPurchase(null);
  };

  const handleEdit = (
    purchase: Purchase
  ) => {
    setEditingPurchase(purchase);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this purchase?"))
      return;

    const updatedPurchases =
      purchases.filter(
        (purchase) =>
          purchase.id !== id
      );

    setPurchases(updatedPurchases);

    savePurchases(updatedPurchases);

    setPurchaseNo(
      getNextPurchaseNo(updatedPurchases)
    );
  };

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