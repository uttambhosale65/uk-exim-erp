"use client";

import { useEffect, useState } from "react";

import PurchaseForm from "./PurchaseForm";
import PurchaseTable from "./PurchaseTable";
import GRNPrint from "./GRNPrint";

import { Purchase } from "./PurchaseTypes";

import {
  loadPurchases,
  savePurchases,
  getNextPurchaseNo,
} from "./PurchaseStorage";

import {
  loadStock,
} from "../../stock/StockStorage";
import { loadProducts } from "../../../product/components/ProductStorage";
import {
  commitStockMovementTransaction,
  isPostCutoverTimestamp,
  isStockMovementCutoverActive,
  movementRecordForTransaction,
  purchaseMovementForLine,
  type StockMovementLine,
} from "../../stock/StockMovementStorage";

import TransactionConfirmModal, {
  TransactionConfirmMode,
} from "../../common/TransactionConfirmModal";

export default function PurchaseMaster() {
  const [purchases, setPurchases] =
    useState<Purchase[]>([]);

  const [purchaseNo, setPurchaseNo] =
    useState("GRN-0001");

  const [editingPurchase, setEditingPurchase] =
    useState<Purchase | null>(null);

  /* =================================================
     SELECTED GRN FOR PRINT
  ================================================== */

  const [printPurchase, setPrintPurchase] =
    useState<Purchase | null>(null);

  /* =================================================
     PURCHASE CONFIRMATION
  ================================================== */

  const [pendingPurchase, setPendingPurchase] =
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
     ACTUAL CONFIRMED SAVE / UPDATE
     
     IMPORTANT:
     This function runs ONLY after the user
     confirms the GRN in the confirmation window.
  ================================================== */

  const processConfirmedPurchase = async (
    purchase: Purchase
  ) => {

    if (isStockMovementCutoverActive()) {
      const previous = editingPurchase;
      if (!previous && loadPurchases().some((entry) => entry.id === purchase.id)) {
        alert("This purchase has already been posted.");
        return;
      }
      if (previous && !isPostCutoverTimestamp(previous.postedAt)) {
        alert("Historical purchases are protected and cannot be edited after the stock cutover.");
        return;
      }
      const postedAt = previous?.postedAt || new Date().toISOString();
      const movements: StockMovementLine[] = [];
      const items = purchase.items.map((item, index) => {
        let lineId = item.lineId || previous?.items?.[index]?.lineId || crypto.randomUUID();
        if (purchase.items.slice(0, index).some((prior, priorIndex) =>
          (prior.lineId || previous?.items?.[priorIndex]?.lineId) === lineId
        )) lineId = crypto.randomUUID();
        const product = loadProducts().find((candidate) => candidate.code === item.productCode);
        const movement = purchaseMovementForLine({ ...item, lineId, unit: product?.unit || item.unit }, product);
        if (movement && movement.quantityKg > 0 && Number.isFinite(movement.quantityKg)) {
          movements.push(movement);
        }
        return { ...item, lineId };
      });
      const finalPurchase: Purchase = {
        ...purchase,
        id: previous?.id || purchase.id || crypto.randomUUID(),
        postedAt,
        items,
        stockMovements: movements,
      };
      const record = movementRecordForTransaction(
        "purchase", finalPurchase.id, postedAt, movements
      );
      const result = await commitStockMovementTransaction(
        "purchase", finalPurchase.id, finalPurchase, record,
        () => {
          const latestPurchases = loadPurchases();
          if (previous) {
            if (!latestPurchases.some((item) => item.id === previous.id)) return false;
            return savePurchases(latestPurchases.map((item) =>
              item.id === previous.id ? finalPurchase : item
            ));
          }
          if (latestPurchases.some((item) => item.id === finalPurchase.id)) return false;
          return savePurchases([...latestPurchases, finalPurchase]);
        }
      );
      if (result !== "committed" && result !== "movement-pending") {
        alert(`Purchase was not saved: ${result}. No stock movement was posted.`);
        return;
      }
      const savedPurchases = loadPurchases();
      setPurchases(savedPurchases);
      setPurchaseNo(getNextPurchaseNo(savedPurchases));
      setEditingPurchase(null);
      setPendingPurchase(null);
      if (result === "movement-pending") {
        alert("Purchase was saved. Its stock movement remains in the recovery journal and is included in available stock; do not repost this purchase.");
      }
      return;
    }

    /* =================================================
       EDIT EXISTING GRN
    ================================================== */

    if (editingPurchase) {

      const updatedPurchases =
        purchases.map((p) =>
          p.id === purchase.id
            ? purchase
            : p
        );

      /* -----------------------------------------------
         SAVE UPDATED GRN FIRST
         
         StockStorage rebuilds stock from the
         current Purchase transactions.
      ------------------------------------------------ */

      setPurchases(
        updatedPurchases
      );

      savePurchases(
        updatedPurchases
      );

      /* -----------------------------------------------
         REBUILD STOCK FROM UPDATED TRANSACTIONS
      ------------------------------------------------ */

      loadStock();

      /* -----------------------------------------------
         NEXT GRN NUMBER
      ------------------------------------------------ */

      setPurchaseNo(
        getNextPurchaseNo(
          updatedPurchases
        )
      );

      setEditingPurchase(
        null
      );

      setPendingPurchase(
        null
      );

      return;
    }

    /* =================================================
       NEW GRN
    ================================================== */

    const updatedPurchases = [
      ...purchases,
      purchase,
    ];

    /* -----------------------------------------------
       SAVE PURCHASE
    ------------------------------------------------ */

    setPurchases(
      updatedPurchases
    );

    savePurchases(
      updatedPurchases
    );

    /* -----------------------------------------------
       REBUILD STOCK FROM ALL PURCHASE TRANSACTIONS
    ------------------------------------------------ */

    loadStock();

    /* -----------------------------------------------
       NEXT GRN NUMBER
    ------------------------------------------------ */

    setPurchaseNo(
      getNextPurchaseNo(
        updatedPurchases
      )
    );

    setEditingPurchase(
      null
    );

    setPendingPurchase(
      null
    );
  };

  /* =================================================
     SAVE BUTTON FROM PURCHASE FORM
     
     IMPORTANT:
     NO actual save here.
     
     Only open confirmation window.
  ================================================== */

  const handleRequestSave = (
    purchase: Purchase
  ) => {

    setPendingPurchase(
      purchase
    );
  };

  /* =================================================
     CONFIRM GRN
  ================================================== */

  const handleConfirmPurchase = async () => {

    if (!pendingPurchase) {
      return;
    }

    await processConfirmedPurchase(
      pendingPurchase
    );
  };

  /* =================================================
     CANCEL CONFIRMATION
  ================================================== */

  const handleCancelPurchase = () => {

    setPendingPurchase(
      null
    );
  };

  /* =================================================
     EDIT GRN
  ================================================== */

  const handleEdit = (
    purchase: Purchase
  ) => {

    if (isStockMovementCutoverActive() && !isPostCutoverTimestamp(purchase.postedAt)) {
      alert("Historical purchases are protected and cannot be edited after the stock cutover.");
      return;
    }

    setEditingPurchase(
      purchase
    );

    setPendingPurchase(
      null
    );

    setPrintPurchase(
      null
    );
  };

  /* =================================================
     DELETE GRN
  ================================================== */

  const handleDelete = async (
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

    if (isStockMovementCutoverActive()) {
      if (!isPostCutoverTimestamp(purchaseToDelete.postedAt)) {
        alert("Historical purchases are protected and cannot be deleted after the stock cutover.");
        return;
      }
      const voided = {
        ...movementRecordForTransaction("purchase", purchaseToDelete.id, purchaseToDelete.postedAt!, []),
        state: "voided" as const,
      };
      const result = await commitStockMovementTransaction(
        "purchase", purchaseToDelete.id, null, voided,
        () => {
          const latestPurchases = loadPurchases();
          if (!latestPurchases.some((purchase) => purchase.id === id)) return false;
          return savePurchases(latestPurchases.filter((purchase) => purchase.id !== id));
        }
      );
      if (result !== "committed" && result !== "movement-pending") {
        alert(`Purchase was not deleted: ${result}. No stock movement changed.`);
        return;
      }
      const savedPurchases = loadPurchases();
      setPurchases(savedPurchases);
      setPurchaseNo(getNextPurchaseNo(savedPurchases));
      if (editingPurchase?.id === id) setEditingPurchase(null);
      if (printPurchase?.id === id) setPrintPurchase(null);
      if (pendingPurchase?.id === id) setPendingPurchase(null);
      if (result === "movement-pending") {
        alert("Purchase deletion was saved. Its stock movement is pending recovery and is excluded from available stock.");
      }
      return;
    }

    const updatedPurchases = purchases.filter((purchase) => purchase.id !== id);

    /* -----------------------------------------------
       DELETE GRN FIRST
    ------------------------------------------------ */

    setPurchases(
      updatedPurchases
    );

    savePurchases(
      updatedPurchases
    );

    /* -----------------------------------------------
       REBUILD STOCK FROM REMAINING PURCHASES
    ------------------------------------------------ */

    loadStock();

    /* -----------------------------------------------
       NEXT GRN NUMBER
    ------------------------------------------------ */

    setPurchaseNo(
      getNextPurchaseNo(
        updatedPurchases
      )
    );

    /* -----------------------------------------------
       CLOSE EDIT MODE
    ------------------------------------------------ */

    if (
      editingPurchase?.id === id
    ) {
      setEditingPurchase(
        null
      );
    }

    /* -----------------------------------------------
       CLOSE PRINT VIEW
    ------------------------------------------------ */

    if (
      printPurchase?.id === id
    ) {
      setPrintPurchase(
        null
      );
    }

    /* -----------------------------------------------
       CLOSE CONFIRMATION
    ------------------------------------------------ */

    if (
      pendingPurchase?.id === id
    ) {
      setPendingPurchase(
        null
      );
    }
  };

  /* =================================================
     PRINT GRN
  ================================================== */

  const handlePrint = (
    purchase: Purchase
  ) => {

    setEditingPurchase(
      null
    );

    setPendingPurchase(
      null
    );

    setPrintPurchase(
      purchase
    );
  };

  /* =================================================
     CLOSE PRINT VIEW
  ================================================== */

  const handleClosePrint = () => {

    setPrintPurchase(
      null
    );
  };

  /* =================================================
     CANCEL EDIT
  ================================================== */

  const handleCancelEdit = () => {

    setEditingPurchase(
      null
    );

    setPendingPurchase(
      null
    );

    const data =
      loadPurchases();

    setPurchaseNo(
      getNextPurchaseNo(data)
    );
  };

  /* =================================================
     CONFIRMATION MODE
  ================================================== */

  const purchaseConfirmMode:
    TransactionConfirmMode =
      editingPurchase
        ? "UPDATE"
        : "CREATE";

  /* =================================================
     PRINT VIEW
  ================================================== */

  if (printPurchase) {

    return (
      <div
        style={{
          background:
            "#f3f4f6",

          padding:
            "20px",

          boxSizing:
            "border-box",
        }}
      >

        {/* =============================================
            BACK TO PURCHASE REGISTER
        ============================================== */}

        <div
          className="screen-only"
          style={{
            width:
              "100%",

            maxWidth:
              "1120px",

            margin:
              "0 auto 12px auto",

            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap:
              "10px",
          }}
        >

          <button
            type="button"
            onClick={
              handleClosePrint
            }
            style={{
              background:
                "#374151",

              color:
                "#ffffff",

              border:
                "none",

              borderRadius:
                "6px",

              padding:
                "9px 16px",

              fontSize:
                "12px",

              fontWeight:
                700,

              cursor:
                "pointer",
            }}
          >
            ← Back to Purchase Register
          </button>

          <div
            style={{
              color:
                "#14532d",

              fontSize:
                "13px",

              fontWeight:
                700,
            }}
          >
            GRN Print Preview
          </div>

        </div>

        {/* =============================================
            GRN PRINT COMPONENT
        ============================================== */}

        <div
          id="grn-print-root"
        >
          <GRNPrint
            purchase={
              printPurchase
            }
          />
        </div>

        <style jsx>{`
          @media print {
            @page {
              size: A4;
              margin: 0;
            }

            :global(body *) {
              visibility: hidden !important;
            }

            :global(#grn-print-root),
            :global(#grn-print-root *) {
              visibility: visible !important;
            }

            :global(#grn-print-root) {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
            }
          }
        `}</style>

      </div>
    );
  }

  /* =================================================
     MAIN UI
  ================================================== */

  return (
    <div
      style={{
        background:
          "#ffffff",

        padding:
          "20px",

        borderRadius:
          "10px",

        boxShadow:
          "0 2px 8px rgba(0,0,0,0.08)",

        overflowX:
          "hidden",
      }}
    >

      {/* =================================================
          PAGE TITLE
      ================================================== */}

      <h2
        style={{
          marginTop:
            0,

          marginBottom:
            "20px",

          color:
            "#14532d",

          fontSize:
            "20px",

          fontWeight:
            700,
        }}
      >
        📥 Purchase Master
      </h2>

      {/* =================================================
          PURCHASE FORM
      ================================================== */}

      <PurchaseForm
        purchaseNo={
          purchaseNo
        }

        editingPurchase={
          editingPurchase
        }

        onSave={
          handleRequestSave
        }
      />

      {/* =================================================
          EDIT MODE MESSAGE
      ================================================== */}

      {editingPurchase && (

        <div
          style={{
            marginTop:
              "12px",

            padding:
              "9px 12px",

            background:
              "#fef3c7",

            border:
              "1px solid #fcd34d",

            borderRadius:
              "6px",

            color:
              "#92400e",

            fontSize:
              "12px",

            fontWeight:
              600,

            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap:
              "10px",
          }}
        >

          <span>
            ✏️ Editing GRN:{" "}
            {
              editingPurchase.purchaseNo
            }
          </span>

          <button
            type="button"
            onClick={
              handleCancelEdit
            }
            style={{
              border:
                "none",

              background:
                "#92400e",

              color:
                "#ffffff",

              padding:
                "5px 10px",

              borderRadius:
                "4px",

              cursor:
                "pointer",

              fontSize:
                "11px",

              fontWeight:
                700,
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
          margin:
            "25px 0",

          border:
            "none",

          borderTop:
            "1px solid #e5e7eb",
        }}
      />

      {/* =================================================
          PURCHASE REGISTER
      ================================================== */}

      <PurchaseTable
        purchases={
          purchases
        }

        onEdit={
          handleEdit
        }

        onDelete={
          handleDelete
        }

        onPrint={
          handlePrint
        }
      />

      {/* =================================================
          PURCHASE / GRN CONFIRMATION MODAL
      ================================================== */}

      <TransactionConfirmModal
        open={
          !!pendingPurchase
        }

        type="PURCHASE"

        mode={
          purchaseConfirmMode
        }

        transaction={
          pendingPurchase || {}
        }

        onConfirm={
          handleConfirmPurchase
        }

        onCancel={
          handleCancelPurchase
        }
      />

    </div>
  );
}
