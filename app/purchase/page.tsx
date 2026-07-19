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

    setPurchaseNo(getNextPurchaseNo());
  }, []);

  useEffect(() => {
    savePurchases(purchases);

    setPurchaseNo(getNextPurchaseNo());
  }, [purchases]);

  function addPurchase(
    purchase: Purchase
  ) {
    setPurchases((prev) => {
      if (editingPurchase) {
        return prev.map((p) =>
          p.id === purchase.id ? purchase : p
        );
      }

      return [...prev, purchase];
    });

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
          .includes(text) ||
        purchase.productName
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