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

  useEffect(() => {
    savePurchases(purchases);
    setPurchaseNo(getNextPurchaseNo(purchases));
  }, [purchases]);

  const addPurchase = (purchase: Purchase) => {
    setPurchases((prev) => [...prev, purchase]);
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1>📦 UK EXIM ERP - Purchase Master</h1>

      <PurchaseForm
        purchaseNo={purchaseNo}
        onSave={addPurchase}
      />

      <br />

      <PurchaseTable purchases={purchases} />
    </div>
  );
}