"use client";

import { useEffect, useState } from "react";

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
    <Layout title="UK EXIM ERP">

      <PageTitle
        title="📦 Purchase Master"
        subtitle="Manage Purchase Entries"
      />

      <Card title="Purchase Entry">
        <PurchaseForm
          purchaseNo={purchaseNo}
          onSave={addPurchase}
        />
      </Card>

      <Card title="Purchase List">
        <PurchaseTable
          purchases={purchases}
        />
      </Card>

    </Layout>
  );
}