"use client";

import { useEffect, useState } from "react";

import PurchaseForm from "../components/customer/purchase/PurchaseForm";
import PurchaseTable from "../components/customer/purchase/PurchaseTable";

import { Purchase } from "../components/customer/purchase/PurchaseTypes";

import {
  loadPurchases,
  savePurchases,
  getNextPurchaseNo,
} from "../components/customer/purchase/PurchaseStorage";

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

  function addPurchase(purchase: Purchase) {
    setPurchases((prev) => [...prev, purchase]);
  }

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 1200,
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