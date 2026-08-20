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
    useState("GRN-0001");

  const [editingPurchase, setEditingPurchase] =
    useState<Purchase | null>(null);

  /* =================================================
     LOAD PURCHASES
  ================================================== */

  useEffect(() => {
    const data = loadPurchases();

    setPurchases(data);

    setPurchaseNo(
      getNextPurchaseNo(data)
    );
  }, []);

  /* =================================================
     SAVE / UPDATE PURCHASE
  ================================================== */

  const handleSave = (purchase: Purchase) => {
    /* =================================================
       EDIT EXISTING GRN
    ================================================== */

    if (editingPurchase) {
      /* -----------------------------------------------
         1. REVERSE OLD GRN STOCK
      ------------------------------------------------ */

      const oldItems =
        editingPurchase.items ?? [];

      oldItems.forEach((item) => {
        reversePurchaseStock(
          item.productCode,
          Number(item.qty)
        );
      });

      /* -----------------------------------------------
         2. ADD NEW GRN STOCK
      ------------------------------------------------ */

      const newItems =
        purchase.items ?? [];

      newItems.forEach((item) => {
        updateStock(
          item.productCode,
          item.productName,
          item.hsn,
          item.unit,
          Number(item.qty)
        );
      });

      /* -----------------------------------------------
         3. UPDATE GRN
      ------------------------------------------------ */

      const updatedPurchases =
        purchases.map((p) =>
          p.id === purchase.id
            ? purchase
            : p
        );

      setPurchases(
        updatedPurchases
      );

      savePurchases(
        updatedPurchases
      );

      /* -----------------------------------------------
         4. NEXT GRN NUMBER
      ------------------------------------------------ */

      setPurchaseNo(
        getNextPurchaseNo(
          updatedPurchases
        )
      );

      setEditingPurchase(null);

      return;
    }

    /* =================================================
       NEW GRN
    ================================================== */

    const updatedPurchases = [
      ...purchases,
      purchase,
    ];

    setPurchases(
      updatedPurchases
    );

    savePurchases(
      updatedPurchases
    );

    /* -----------------------------------------------
       PURCHASE → STOCK
    ------------------------------------------------ */

    const items =
      purchase.items ?? [];

    items.forEach((item) => {
      updateStock(
        item.productCode,
        item.productName,
        item.hsn,
        item.unit,
        Number(item.qty)
      );
    });

    /* -----------------------------------------------
       NEXT GRN NUMBER
    ------------------------------------------------ */

    setPurchaseNo(
      getNextPurchaseNo(
        updatedPurchases
      )
    );

    setEditingPurchase(null);
  };

  /* =================================================
     EDIT GRN
  ================================================== */

  const handleEdit = (
    purchase: Purchase
  ) => {
    setEditingPurchase(
      purchase
    );
  };

  /* =================================================
     DELETE GRN
  ================================================== */

  const handleDelete = (
    id: string
  ) => {
    const purchaseToDelete =
      purchases.find(
        (purchase) =>
          purchase.id === id
      );

    if (!purchaseToDelete) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete GRN ${purchaseToDelete.purchaseNo}?\n\nAll product quantities from this GRN will also be removed from stock.`
      );

    if (!confirmed) {
      return;
    }

    /* -----------------------------------------------
       REVERSE ALL PRODUCTS FROM STOCK
    ------------------------------------------------ */

    const items =
      purchaseToDelete.items ?? [];

    items.forEach((item) => {
      reversePurchaseStock(
        item.productCode,
        Number(item.qty)
      );
    });

    /* -----------------------------------------------
       DELETE GRN
    ------------------------------------------------ */

    const updatedPurchases =
      purchases.filter(
        (purchase) =>
          purchase.id !== id
      );

    setPurchases(
      updatedPurchases
    );

    savePurchases(
      updatedPurchases
    );

    /* -----------------------------------------------
       NEXT GRN NUMBER
    ------------------------------------------------ */

    setPurchaseNo(
      getNextPurchaseNo(
        updatedPurchases
      )
    );

    /* -----------------------------------------------
       CLOSE EDIT MODE IF REQUIRED
    ------------------------------------------------ */

    if (
      editingPurchase?.id === id
    ) {
      setEditingPurchase(null);
    }
  };

  /* =================================================
     CANCEL EDIT
  ================================================== */

  const handleCancelEdit = () => {
    setEditingPurchase(null);

    const data =
      loadPurchases();

    setPurchaseNo(
      getNextPurchaseNo(data)
    );
  };

  /* =================================================
     UI
  ================================================== */

  return (
    <div
      style={{
        background: "#ffffff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* =================================================
          PAGE TITLE
      ================================================== */}

      <h2
        style={{
          marginTop: 0,
          marginBottom: "20px",
          color: "#14532d",
          fontSize: "20px",
          fontWeight: 700,
        }}
      >
        📥 Purchase Master
      </h2>

      {/* =================================================
          PURCHASE FORM
      ================================================== */}

      <PurchaseForm
        purchaseNo={purchaseNo}
        editingPurchase={
          editingPurchase
        }
        onSave={handleSave}
      />

      {/* =================================================
          EDIT MODE MESSAGE
      ================================================== */}

      {editingPurchase && (
        <div
          style={{
            marginTop: "12px",
            padding: "9px 12px",
            background: "#fef3c7",
            border:
              "1px solid #fcd34d",
            borderRadius: "6px",
            color: "#92400e",
            fontSize: "12px",
            fontWeight: 600,
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>
            ✏️ Editing GRN:{" "}
            {editingPurchase.purchaseNo}
          </span>

          <button
            type="button"
            onClick={
              handleCancelEdit
            }
            style={{
              border: "none",
              background:
                "#92400e",
              color: "#ffffff",
              padding:
                "5px 10px",
              borderRadius:
                "4px",
              cursor:
                "pointer",
              fontSize:
                "11px",
              fontWeight: 700,
            }}
          >
            Cancel Edit
          </button>
        </div>
      )}

      {/* =================================================
          SEPARATOR
      ================================================== */}

      <hr
        style={{
          margin: "25px 0",
          border: "none",
          borderTop:
            "1px solid #e5e7eb",
        }}
      />

      {/* =================================================
          PURCHASE REGISTER
      ================================================== */}

      <PurchaseTable
        purchases={purchases}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}