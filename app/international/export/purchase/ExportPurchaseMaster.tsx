"use client";

import { useEffect, useMemo, useState } from "react";
import ExportPurchaseForm from "./ExportPurchaseForm";
import ExportPurchaseTable from "./ExportPurchaseTable";
import {
  loadExportPurchases,
  saveExportPurchases,
  getNextExportPurchaseNo,
} from "./ExportPurchaseStorage";
import { ExportPurchase } from "./ExportPurchaseTypes";
import { rebuildInternationalExportStockFromPurchases } from "../stock/InternationalExportStockStorage";

export default function ExportPurchaseMaster() {
  const [purchases, setPurchases] = useState<ExportPurchase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPurchase, setEditingPurchase] =
    useState<ExportPurchase | null>(null);

  const loadData = () => {
    setPurchases(loadExportPurchases());
  };

  useEffect(() => {
    loadData();
  }, []);

  const nextPurchaseNo = useMemo(
    () => getNextExportPurchaseNo(purchases),
    [purchases]
  );

  const handleSave = (purchase: ExportPurchase) => {
    const current = loadExportPurchases();
    const exists = current.some((item) => item.id === purchase.id);

    const updated = exists
      ? current.map((item) =>
          item.id === purchase.id ? purchase : item
        )
      : [...current, purchase];

    saveExportPurchases(updated);
    rebuildInternationalExportStockFromPurchases(updated);

    setPurchases(updated);
    setEditingPurchase(null);
    setShowForm(false);
  };

  const handleEdit = (purchase: ExportPurchase) => {
    setEditingPurchase(purchase);
    setShowForm(true);
  };

  const handleDelete = (purchase: ExportPurchase) => {
    const confirmed = window.confirm(
      `Delete Export Purchase ${purchase.purchaseNo}?\n\nThis will also rebuild International Export Stock from the remaining Purchase transactions.`
    );

    if (!confirmed) return;

    const updated = loadExportPurchases().filter(
      (item) => item.id !== purchase.id
    );

    saveExportPurchases(updated);
    rebuildInternationalExportStockFromPurchases(updated);

    setPurchases(updated);

    if (editingPurchase?.id === purchase.id) {
      setEditingPurchase(null);
      setShowForm(false);
    }
  };

  const handleAdd = () => {
    setEditingPurchase(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingPurchase(null);
    setShowForm(false);
  };

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          marginBottom: "9px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 900,
              color: "#14532d",
            }}
          >
            📥 International Export Purchase
          </div>
          <div
            style={{
              marginTop: "2px",
              fontSize: "10px",
              color: "#6b7280",
            }}
          >
            Purchase goods specifically for export operations. This transaction is separate from Domestic Purchase / GRN.
          </div>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={handleAdd}
            style={{
              border: "none",
              borderRadius: "6px",
              padding: "8px 11px",
              background: "#14532d",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: 900,
            }}
          >
            + New Export Purchase
          </button>
        )}
      </div>

      {showForm ? (
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "10px",
          }}
        >
          <ExportPurchaseForm
            purchaseNo={
              editingPurchase?.purchaseNo || nextPurchaseNo
            }
            initialData={editingPurchase}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: "7px",
              marginBottom: "9px",
            }}
          >
            <SummaryCard
              title="Purchases"
              value={purchases.length}
            />
            <SummaryCard
              title="Goods Value"
              value={purchases
                .reduce(
                  (total, item) =>
                    total + Number(item.totalGoodsValue || 0),
                  0
                )
                .toFixed(2)}
            />
            <SummaryCard
              title="Purchase Value"
              value={purchases
                .reduce(
                  (total, item) =>
                    total + Number(item.totalPurchaseValue || 0),
                  0
                )
                .toFixed(2)}
            />
            <SummaryCard
              title="Packages"
              value={purchases
                .reduce(
                  (total, item) =>
                    total + Number(item.totalPackages || 0),
                  0
                )
                .toFixed(0)}
            />
            <SummaryCard
              title="Net Weight KG"
              value={purchases
                .reduce(
                  (total, item) =>
                    total + Number(item.totalNetWeight || 0),
                  0
                )
                .toFixed(3)}
            />
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "10px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 900,
                color: "#14532d",
                marginBottom: "8px",
              }}
            >
              📋 Export Purchase Register
            </div>

            <ExportPurchaseTable
              purchases={purchases}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          <div
            style={{
              marginTop: "8px",
              padding: "8px 10px",
              borderRadius: "6px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              fontSize: "9px",
              lineHeight: 1.5,
            }}
          >
            <strong>Stock Safety:</strong> Saving, editing or deleting an Export Purchase rebuilds only <code>uk-exim-international-export-stock</code>. Domestic Stock <code>uk-exim-stock</code> is not touched.
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "7px",
        padding: "8px 9px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: "9px", color: "#6b7280", fontWeight: 700 }}>
        {title}
      </div>
      <div
        style={{
          marginTop: "3px",
          fontSize: "15px",
          color: "#14532d",
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}
