"use client";

import { useEffect, useState } from "react";

import PurchaseForm from "../components/purchase/PurchaseForm";
import PurchaseTable from "../components/purchase/PurchaseTable";

import { Purchase } from "../components/purchase/PurchaseTypes";

import {
  loadPurchases,
  savePurchases,
  getNextPurchaseNo,
} from "../components/purchase/PurchaseStorage";

export default function PurchasePage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseNo, setPurchaseNo] = useState("");

  useEffect(() => {
    const data = loadPurchases();
    setPurchases(data);
    setPurchaseNo(getNextPurchaseNo(data));
  }, []);

  const handleSave = (purchase: Purchase) => {
    const updated = [...purchases, purchase];
    setPurchases(updated);
    savePurchases(updated);
    setPurchaseNo(getNextPurchaseNo(updated));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📦 UK EXIM ERP - Purchase Master</h2>

      <PurchaseForm
        purchaseNo={purchaseNo}
        onSave={handleSave}
      />

      <hr style={{ margin: "20px 0" }} />

      <PurchaseTable purchases={purchases} />
    </div>
  );
}