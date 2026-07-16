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
        backgroundColor: "#f4f6f9",
        minHeight: "100vh",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.10)",
            marginBottom: "20px",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "#0f766e",
            }}
          >
            📦 UK EXIM ERP
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#666",
            }}
          >
            Purchase Master
          </p>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.10)",
            marginBottom: "20px",
          }}
        >
          <PurchaseForm
            purchaseNo={purchaseNo}
            onSave={addPurchase}
          />
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.10)",
          }}
        >
          <PurchaseTable purchases={purchases} />
        </div>
      </div>
    </div>
  );
}