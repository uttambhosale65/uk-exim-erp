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

export default function PurchasePage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseNo, setPurchaseNo] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const data = loadPurchases();
    setPurchases(data);
    setPurchaseNo(getNextPurchaseNo());
  }, []);

  useEffect(() => {
    savePurchases(purchases);
    setPurchaseNo(getNextPurchaseNo());
  }, [purchases]);

  function addPurchase(purchase: Purchase) {
    setPurchases((prev) => [...prev, purchase]);
  }

  const filteredPurchases = useMemo(() => {
    const text = search.toLowerCase();

    return purchases.filter((purchase) =>
      purchase.purchaseNo.toLowerCase().includes(text) ||
      purchase.supplierName.toLowerCase().includes(text) ||
      purchase.productName.toLowerCase().includes(text)
    );
  }, [purchases, search]);

  const totalPurchases = purchases.length;

  const totalAmount = purchases.reduce(
    (sum, purchase) => sum + purchase.amount,
    0
  );

  const totalQty = purchases.reduce(
    (sum, purchase) => sum + purchase.qty,
    0
  );

  const totalSuppliers = new Set(
    purchases.map((purchase) => purchase.supplierCode)
  ).size;

  return (
    <Layout title="UK EXIM ERP">

      <PageTitle
        title="📦 Purchase Master"
        subtitle="Manage Purchase Entries"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginBottom: "25px",
        }}
      >
        <Card title="📦 Total Purchases">
          <h2>{totalPurchases}</h2>
        </Card>

        <Card title="💰 Total Amount">
          <h2>₹ {totalAmount}</h2>
        </Card>

        <Card title="📦 Total Quantity">
          <h2>{totalQty}</h2>
        </Card>

        <Card title="🏭 Suppliers">
          <h2>{totalSuppliers}</h2>
        </Card>
      </div>

      <Card title="Purchase Entry">
        <PurchaseForm
          purchaseNo={purchaseNo}
          onSave={addPurchase}
        />
      </Card>

      <Card title="Purchase List">

        <input
          type="text"
          placeholder="🔍 Search Purchase No / Supplier / Product"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "15px",
          }}
        />

        <PurchaseTable
          purchases={filteredPurchases}
        />

      </Card>

    </Layout>
  );
}