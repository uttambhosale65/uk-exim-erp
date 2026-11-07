"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Layout from "../components/ui/Layout";
import Card from "../components/ui/Card";
import PageTitle from "../components/ui/PageTitle";

import PurchaseForm from "../components/customer/purchase/PurchaseForm";
import PurchaseTable from "../components/customer/purchase/PurchaseTable";
import GRNPrint from "../components/customer/purchase/GRNPrint";

import TransactionConfirmModal, {
  TransactionConfirmMode,
} from "../components/common/TransactionConfirmModal";

import { Purchase } from "../components/customer/purchase/PurchaseTypes";

import {
  loadPurchases,
  savePurchases,
  getNextPurchaseNo,
} from "../components/customer/purchase/PurchaseStorage";

import {
  loadProducts,
} from "../product/components/ProductStorage";

import {
  convertToStockQty,
  loadStock,
  saveStock,
  reversePurchaseStock,
} from "../components/stock/StockStorage";
import {
  commitStockMovementTransaction,
  isPostCutoverTimestamp,
  isStockMovementCutoverActive,
  movementRecordForTransaction,
  purchaseMovementForLine,
  type StockMovementLine,
} from "../components/stock/StockMovementStorage";

export default function PurchasePage() {

  /* =====================================================
     PURCHASE DATA
  ===================================================== */

  const [purchases, setPurchases] =
    useState<Purchase[]>([]);

  const [purchaseNo, setPurchaseNo] =
    useState("");

  const [search, setSearch] =
    useState("");

  /* =====================================================
     EDIT / PRINT
  ===================================================== */

  const [editingPurchase, setEditingPurchase] =
    useState<Purchase | null>(null);

  const [printPurchase, setPrintPurchase] =
    useState<Purchase | null>(null);

  /* =====================================================
     CONFIRMATION

     pendingPurchase = transaction waiting
     for user confirmation.
  ===================================================== */

  const [pendingPurchase, setPendingPurchase] =
    useState<Purchase | null>(null);

  /* =====================================================
     LOAD PURCHASES
  ===================================================== */

  useEffect(() => {

    const data =
      loadPurchases();

    setPurchases(
      data
    );

    setPurchaseNo(
      getNextPurchaseNo(
        data
      )
    );

  }, []);

  /* =====================================================
     GET PURCHASE STOCK IMPACT

     Packed Product → Stock Base Product
     Packet Qty → KG
  ===================================================== */

  function getPurchaseStockImpact(
    productCode: string,
    qty: number
  ) {

    const product =
      loadProducts().find(
        (p) =>
          p.code ===
          productCode
      );

    if (!product) {

      return {
        stockProductCode:
          productCode,

        stockQty:
          Number(qty) || 0,

        productName:
          "",

        hsn:
          "",
      };
    }

    const stockProductCode =
      product.stockBaseCode ||
      product.code;

    const stockQty =
      convertToStockQty(
        Number(qty),
        product.unit,
        product.netWeight
      );

    return {
      stockProductCode,

      stockQty,

      productName:
        product.name,

      hsn:
        product.hsn,
    };
  }

  function createPostedPurchase(
    purchase: Purchase,
    previous: Purchase | null
  ): { purchase: Purchase; movements: StockMovementLine[] } {
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
      return { item: { ...item, lineId } };
    });
    return {
      purchase: {
        ...purchase,
        postedAt,
        items: items.map((entry) => entry.item),
        stockMovements: movements,
      },
      movements,
    };
  }

  /* =====================================================
     ACTUAL SAVE / UPDATE PURCHASE

     IMPORTANT:
     This function is called ONLY after
     user clicks Confirm GRN / Update GRN.
  ===================================================== */

  async function processPurchase(
    purchase: Purchase
  ) {

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
      const created = createPostedPurchase(purchase, previous);
      const finalPurchase: Purchase = {
        ...created.purchase,
        id: previous?.id || purchase.id || crypto.randomUUID(),
      };
      const record = movementRecordForTransaction(
        "purchase", finalPurchase.id, finalPurchase.postedAt!, created.movements
      );
      const committed = await commitStockMovementTransaction(
        "purchase",
        finalPurchase.id,
        finalPurchase,
        record,
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
      if (committed !== "committed" && committed !== "movement-pending") {
        alert(`Purchase was not saved: ${committed}. No stock movement was posted.`);
        return;
      }
      const savedPurchases = loadPurchases();
      setPurchases(savedPurchases);
      setPurchaseNo(getNextPurchaseNo(savedPurchases));
      setEditingPurchase(null);
      setPendingPurchase(null);
      if (committed === "movement-pending") {
        alert("Purchase was saved. Its stock movement remains in the recovery journal and is included in available stock; do not repost this purchase.");
      }
      return;
    }

    /* ===================================================
       EDIT EXISTING PURCHASE
    =================================================== */

    if (
      editingPurchase
    ) {

      /* -----------------------------------------------
         REVERSE OLD PURCHASE STOCK
      ------------------------------------------------ */

      editingPurchase.items.forEach(
        (item) => {

          if (
            !item.productCode ||
            Number(item.qty) <= 0
          ) {
            return;
          }

          const impact =
            getPurchaseStockImpact(
              item.productCode,
              Number(item.qty)
            );

          reversePurchaseStock(
            impact.stockProductCode,
            impact.stockQty
          );
        }
      );

      /* -----------------------------------------------
         ADD NEW PURCHASE STOCK
      ------------------------------------------------ */

      const stock =
        loadStock();

      const updatedStock = [
        ...stock,
      ];

      purchase.items.forEach(
        (item) => {

          if (
            !item.productCode ||
            Number(item.qty) <= 0
          ) {
            return;
          }

          const impact =
            getPurchaseStockImpact(
              item.productCode,
              Number(item.qty)
            );

          const index =
            updatedStock.findIndex(
              (stockItem) =>
                stockItem.productCode ===
                impact.stockProductCode
            );

          if (
            index === -1
          ) {
            return;
          }

          updatedStock[index].purchaseQty =
            Number(
              updatedStock[index]
                .purchaseQty || 0
            ) +
            impact.stockQty;

          updatedStock[index].currentStock =
            Number(
              updatedStock[index]
                .openingStock || 0
            ) +
            Number(
              updatedStock[index]
                .purchaseQty || 0
            ) -
            Number(
              updatedStock[index]
                .salesQty || 0
            );
        }
      );

      saveStock(
        updatedStock
      );

      const updatedPurchases = purchases.map((p) => p.id === purchase.id ? purchase : p);
      if (!savePurchases(updatedPurchases)) {
        alert("Purchase could not be saved.");
        return;
      }

      setPurchases(updatedPurchases);
      setPurchaseNo(getNextPurchaseNo(updatedPurchases));

      setEditingPurchase(
        null
      );

      setPendingPurchase(
        null
      );

      return;
    }

    /* ===================================================
       NEW PURCHASE
    =================================================== */

    const stock =
      loadStock();

    const updatedStock = [
      ...stock,
    ];

    purchase.items.forEach(
      (item) => {

        if (
          !item.productCode ||
          Number(item.qty) <= 0
        ) {
          return;
        }

        const product =
          loadProducts().find(
            (p) =>
              p.code ===
              item.productCode
          );

        if (!product) {
          return;
        }

        const stockProductCode =
          product.stockBaseCode ||
          product.code;

        const stockQty =
          convertToStockQty(
            Number(item.qty),
            product.unit,
            product.netWeight
          );

        const index =
          updatedStock.findIndex(
            (stockItem) =>
              stockItem.productCode ===
              stockProductCode
          );

        if (
          index === -1
        ) {
          return;
        }

        updatedStock[index].purchaseQty =
          Number(
            updatedStock[index]
              .purchaseQty || 0
          ) +
          stockQty;

        updatedStock[index].currentStock =
          Number(
            updatedStock[index]
              .openingStock || 0
          ) +
          Number(
            updatedStock[index]
              .purchaseQty || 0
          ) -
          Number(
            updatedStock[index]
              .salesQty || 0
          );
      }
    );

    saveStock(
      updatedStock
    );

    const updatedPurchases = [...purchases, purchase];
    if (!savePurchases(updatedPurchases)) {
      alert("Purchase could not be saved.");
      return;
    }

    setPurchases(updatedPurchases);
    setPurchaseNo(getNextPurchaseNo(updatedPurchases));

    setEditingPurchase(
      null
    );

    setPendingPurchase(
      null
    );
  }

  /* =====================================================
     SAVE BUTTON FROM PURCHASE FORM

     IMPORTANT:
     NO actual save here.

     Only open confirmation window.
  ===================================================== */

function addPurchase(
  purchase: Purchase
) {

  alert("CONFIRM TEST");

  setPendingPurchase(
    purchase
  );
}
  /* =====================================================
     CONFIRM GRN
  ===================================================== */

  async function handleConfirmPurchase() {

    if (
      !pendingPurchase
    ) {
      return;
    }

    await processPurchase(
      pendingPurchase
    );
  }

  /* =====================================================
     CANCEL CONFIRMATION
  ===================================================== */

  function handleCancelPurchase() {

    setPendingPurchase(
      null
    );
  }

  /* =====================================================
     EDIT PURCHASE
  ===================================================== */

  function handleEditPurchase(
    purchase: Purchase
  ) {

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
  }

  /* =====================================================
     DELETE PURCHASE
  ===================================================== */

  async function handleDeletePurchase(
    id: string
  ) {

    if (
      !confirm(
        "Delete this Purchase?"
      )
    ) {
      return;
    }

    const purchase =
      purchases.find(
        (item) =>
          item.id === id
      );

    if (!purchase) {
      return;
    }

    if (isStockMovementCutoverActive()) {
      if (!isPostCutoverTimestamp(purchase.postedAt)) {
        alert("Historical purchases are protected and cannot be deleted after the stock cutover.");
        return;
      }
      const voided = {
        ...movementRecordForTransaction("purchase", purchase.id, purchase.postedAt!, []),
        state: "voided" as const,
      };
      const committed = await commitStockMovementTransaction(
        "purchase", purchase.id, null, voided,
        () => {
          const latestPurchases = loadPurchases();
          if (!latestPurchases.some((item) => item.id === id)) return false;
          return savePurchases(latestPurchases.filter((item) => item.id !== id));
        }
      );
      if (committed !== "committed" && committed !== "movement-pending") {
        alert(`Purchase was not deleted: ${committed}. No stock movement changed.`);
        return;
      }
      const savedPurchases = loadPurchases();
      setPurchases(savedPurchases);
      setPurchaseNo(getNextPurchaseNo(savedPurchases));
      if (committed === "movement-pending") {
        alert("Purchase deletion was saved. Its stock movement is pending recovery and is excluded from available stock.");
      }
      return;
    }

    const updatedPurchases = purchases.filter((item) => item.id !== id);

    purchase.items.forEach(
      (item) => {

        if (
          !item.productCode ||
          Number(item.qty) <= 0
        ) {
          return;
        }

        const impact =
          getPurchaseStockImpact(
            item.productCode,
            Number(item.qty)
          );

        reversePurchaseStock(
          impact.stockProductCode,
          impact.stockQty
        );
      }
    );

    if (!savePurchases(updatedPurchases)) {
      alert("Purchase deletion could not be saved.");
      return;
    }
    setPurchases(updatedPurchases);
    setPurchaseNo(getNextPurchaseNo(updatedPurchases));

    if (
      editingPurchase?.id ===
      id
    ) {

      setEditingPurchase(
        null
      );
    }

    if (
      printPurchase?.id ===
      id
    ) {

      setPrintPurchase(
        null
      );
    }

    if (
      pendingPurchase?.id ===
      id
    ) {

      setPendingPurchase(
        null
      );
    }
  }

  /* =====================================================
     PRINT GRN
  ===================================================== */

  function handlePrintPurchase(
    purchase: Purchase
  ) {

    setEditingPurchase(
      null
    );

    setPendingPurchase(
      null
    );

    setPrintPurchase(
      purchase
    );
  }

  /* =====================================================
     CLOSE PRINT VIEW
  ===================================================== */

  function handleClosePrint() {

    setPrintPurchase(
      null
    );
  }

  /* =====================================================
     CANCEL EDIT
  ===================================================== */

  function handleCancelEdit() {

    setEditingPurchase(
      null
    );

    setPendingPurchase(
      null
    );

    const data =
      loadPurchases();

    setPurchaseNo(
      getNextPurchaseNo(
        data
      )
    );
  }

  /* =====================================================
     FILTER PURCHASES
  ===================================================== */

  const filteredPurchases =
    useMemo(() => {

      const text =
        search
          .toLowerCase()
          .trim();

      return purchases.filter(
        (purchase) =>
          purchase.purchaseNo
            .toLowerCase()
            .includes(text) ||

          purchase.supplierName
            .toLowerCase()
            .includes(text) ||

          purchase.invoiceNo
            .toLowerCase()
            .includes(text) ||

          purchase.purchaseDate
            .toLowerCase()
            .includes(text) ||

          purchase.items?.some(
            (item) =>
              item.productCode
                .toLowerCase()
                .includes(text) ||

              item.productName
                .toLowerCase()
                .includes(text)
          )
      );

    }, [
      purchases,
      search,
    ]);

  /* =====================================================
     CONFIRMATION MODE
  ===================================================== */

  const purchaseConfirmMode:
    TransactionConfirmMode =
      editingPurchase
        ? "UPDATE"
        : "CREATE";

  /* =====================================================
     PRINT PREVIEW
  ===================================================== */

  if (
    printPurchase
  ) {

    return (
      <div
        style={{
          background:
            "#f3f4f6",

          padding:
            "20px",

          boxSizing:
            "border-box",

          minHeight:
            "100vh",
        }}
      >

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

        <div id="grn-print-root">

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

  /* =====================================================
     MAIN UI
  ===================================================== */

  return (
    <Layout title="UK EXIM ERP">

      <PageTitle
        title="📦 Purchase Master"
        subtitle="Purchase Entry & Purchase Register"
      />

      {/* =================================================
          PURCHASE ENTRY
      ================================================== */}

      <Card title="Purchase Entry">

        <PurchaseForm
          purchaseNo={
            purchaseNo
          }

          onSave={
            addPurchase
          }

          editingPurchase={
            editingPurchase
          }
        />

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

      </Card>

      {/* =================================================
          PURCHASE REGISTER
      ================================================== */}

      <Card title="Purchase Register">

        <div
          style={{
            marginBottom:
              "12px",
          }}
        >

          <input
            type="text"

            placeholder=
              "🔍 Search Purchase No / Supplier / Product"

            value={
              search
            }

            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }

            style={{
              width:
                "100%",

              height:
                "40px",

              padding:
                "0 12px",

              border:
                "1px solid #cbd5e1",

              borderRadius:
                "6px",

              fontSize:
                "14px",

              outline:
                "none",

              boxSizing:
                "border-box",
            }}
          />

        </div>

        <PurchaseTable
          purchases={
            filteredPurchases
          }

          onEdit={
            handleEditPurchase
          }

          onDelete={
            handleDeletePurchase
          }

          onPrint={
            handlePrintPurchase
          }
        />

      </Card>

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

    </Layout>
  );
}
