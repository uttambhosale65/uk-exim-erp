"use client";

import { useEffect, useState } from "react";

import SalesForm from "../components/customer/sales/SalesForm";
import { loadProducts } from "../product/components/ProductStorage";
import SalesTable from "../components/customer/sales/SalesTable";
import InvoicePrint from "../components/customer/sales/InvoicePrint";

import { Sales } from "../components/customer/sales/SalesTypes";

import {
  loadSales,
  saveSales,
  getNextSalesNo,
} from "../components/customer/sales/SalesStorage";

import {
  loadStock,
  getCurrentStock,
  convertToStockQty,
} from "../components/stock/StockStorage";
import {
  commitStockMovementTransaction,
  findInsufficientStock,
  getMovementRecord,
  getStockMovementRecords,
  isStockMovementLedgerHealthy,
  isPostCutoverTimestamp,
  isStockMovementCutoverActive,
  movementRecordForTransaction,
  saleMovementForLine,
  type StockMovementLine,
} from "../components/stock/StockMovementStorage";

import TransactionConfirmModal, {
  TransactionConfirmMode,
} from "../components/common/TransactionConfirmModal";

/* =====================================================
   GET STOCK IMPACT

   Packed product:
   Packet Qty → KG

   Loose product:
   KG → KG

   Packed products use their
   Stock Base Product.
===================================================== */

function getStockImpact(
  productCode: string,
  qty: number
): {
  stockProductCode: string;
  stockQty: number;
} {
  if (isStockMovementCutoverActive()) {
    const product = loadProducts().find((candidate) => candidate.code === productCode);
    const movement = saleMovementForLine({
      lineId: "validation",
      productCode,
      qty,
      unit: product?.unit || "KG",
    }, product);
    if (!movement) return { stockProductCode: productCode, stockQty: 0 };
    return {
      stockProductCode: movement.stockCode,
      stockQty: movement.quantityKg,
    };
  }

  const product =
    loadProducts().find(
      (p) =>
        p.code === productCode
    );

  if (!product) {
    return {
      stockProductCode: productCode,
      stockQty: Number(qty) || 0,
    };
  }

  const stockProductCode = product.stockBaseCode || (product.unit === "Pkt" ? "P0006" : product.code);

  const stockQty = convertToStockQty(qty, product.unit, product.netWeight);

  return {
    stockProductCode,
    stockQty,
  };
}

function createPostedSale(
  sale: Sales,
  previousSale: Sales | null
): { sale: Sales; movements: StockMovementLine[] } {
  const postedAt = previousSale?.postedAt || new Date().toISOString();
  const items = sale.items.map((item, index) => {
    let lineId = item.lineId || previousSale?.items?.[index]?.lineId || crypto.randomUUID();
    if (sale.items.slice(0, index).some((prior, priorIndex) =>
      (prior.lineId || previousSale?.items?.[priorIndex]?.lineId) === lineId
    )) lineId = crypto.randomUUID();
    const product = loadProducts().find((candidate) => candidate.code === item.productCode);
    const movement = sale.status === "Cancelled"
      ? null
      : saleMovementForLine({ ...item, lineId, unit: product?.unit || item.unit }, product);

    return {
      item: { ...item, lineId },
      movement,
    };
  });

  const movements = items
    .map((entry) => entry.movement)
    .filter((movement): movement is StockMovementLine => Boolean(
      movement && movement.quantityKg > 0 && Number.isFinite(movement.quantityKg)
    ));
  return {
    sale: { ...sale, postedAt, items: items.map((entry) => entry.item), stockMovements: movements },
    movements,
  };
}

/* =====================================================
   SALES PAGE
===================================================== */

export default function SalesPage() {

  const [sales, setSales] =
    useState<Sales[]>([]);

  const [salesNo, setSalesNo] =
    useState(
      "SAL-0001"
    );

  const [editingSale, setEditingSale] =
    useState<Sales | null>(
      null
    );

  const [selectedSale, setSelectedSale] =
    useState<Sales | null>(
      null
    );

  /* =====================================================
     CONFIRMATION
  ===================================================== */

  const [pendingSale, setPendingSale] =
    useState<Sales | null>(
      null
    );

  /* =====================================================
     LOAD SALES
  ===================================================== */

  useEffect(() => {

    const loadedSales =
      loadSales();

    const correctedSales = loadedSales;

    setSales(
      correctedSales
    );

    setSalesNo(
      getNextSalesNo(
        correctedSales
      )
    );

  }, []);

  /* =====================================================
     VALIDATE SALE STOCK

     येथे कोणताही stock बदल होत नाही.
  ===================================================== */

  const validateSaleStock = (
    sale: Sales
  ): boolean => {

    if (sale.status === "Cancelled") return true;

    const stockItems =
      Array.isArray(
        sale.items
      )
        ? sale.items
        : [];

    if (isStockMovementCutoverActive()) {
      getStockMovementRecords();
      if (!isStockMovementLedgerHealthy()) {
        alert("Stock movement ledger is unavailable. Sale posting is blocked to prevent an incorrect balance.");
        return false;
      }
      const requiredByStock = new Map<string, number>();
      stockItems.forEach((item) => {
        if (!item.productCode || Number(item.qty) <= 0) return;
        const impact = getStockImpact(item.productCode, Number(item.qty));
        requiredByStock.set(
          impact.stockProductCode,
          (requiredByStock.get(impact.stockProductCode) || 0) + impact.stockQty
        );
      });

      const oldMovements = editingSale?.postedAt && isPostCutoverTimestamp(editingSale.postedAt)
        ? getMovementRecord("sale", editingSale.id)?.movements || editingSale.stockMovements || []
        : [];
      const availableByStock = new Map<string, number>();
      requiredByStock.forEach((_required, stockCode) => {
        const available = getCurrentStock(stockCode) + oldMovements
          .filter((movement) => movement.stockCode === stockCode && movement.direction === "out")
          .reduce((sum, movement) => sum + movement.quantityKg, 0);
        availableByStock.set(stockCode, available);
      });
      const shortage = findInsufficientStock(requiredByStock, availableByStock);
      if (shortage) {
        alert(
          `❌ Insufficient Stock\n\nStock Product: ${shortage.stockCode}\n` +
          `Available Stock: ${shortage.available.toFixed(3)} KG\n` +
          `Required Quantity: ${shortage.required.toFixed(3)} KG\n\nSale cannot be saved.`
        );
        return false;
      }
      return true;
    }

    for (
      const item of stockItems
    ) {

      if (
        !item.productCode ||
        Number(item.qty) <= 0
      ) {
        continue;
      }

      const stockImpact =
        getStockImpact(
          item.productCode,
          Number(item.qty)
        );

      const currentStock =
        getCurrentStock(
          stockImpact.stockProductCode
        );

      let availableStock =
        currentStock;

      /* -----------------------------------------------
         EDIT SALE

         जुन्या sale ची quantity
         calculation मध्ये temporarily add back.
      ----------------------------------------------- */

      if (
        editingSale
      ) {

        const oldItem =
          editingSale.items?.find(
            (old) =>
              old.productCode ===
              item.productCode
          );

        if (
          oldItem
        ) {

          const oldStockImpact =
            getStockImpact(
              oldItem.productCode,
              Number(oldItem.qty)
            );

          if (
            oldStockImpact.stockProductCode ===
            stockImpact.stockProductCode
          ) {

            availableStock +=
              oldStockImpact.stockQty;
          }
        }
      }

      const requiredQty =
        stockImpact.stockQty;

      if (
        requiredQty >
        availableStock
      ) {

        alert(
          `❌ Insufficient Stock\n\n` +
            `${item.productName}\n` +
            `Stock Product: ${stockImpact.stockProductCode}\n` +
            `Available Stock: ${availableStock.toFixed(3)} KG\n` +
            `Required Quantity: ${requiredQty.toFixed(3)} KG\n\n` +
            `Sale cannot be saved.`
        );

        return false;
      }
    }

    return true;
  };

  /* =====================================================
     CONFIRMED SALE PROCESS

     IMPORTANT:
     येथेच actual Sales save होते.

     New Sale:
       1. Sales save
       2. Stock rebuild

     Edit:
       1. Sales register update
       2. Stock rebuild

     StockStorage transaction-based असल्यामुळे
     manual stock +/- करू नये.
  ===================================================== */

  const processConfirmedSale = async (
    sale: Sales
  ) => {

    if (isStockMovementCutoverActive()) {
      const previous = editingSale;
      if (!previous && loadSales().some((entry) => entry.id === sale.id)) {
        alert("This sale has already been posted.");
        return;
      }
      if (previous && !isPostCutoverTimestamp(previous.postedAt)) {
        alert("Historical sales are protected and cannot be edited after the stock cutover.");
        return;
      }

      const created = createPostedSale(sale, previous);
      const finalSale: Sales = {
        ...created.sale,
        id: previous?.id || sale.id || crypto.randomUUID(),
        salesNo: previous?.salesNo || sale.salesNo,
      };
      const record = movementRecordForTransaction(
        "sale", finalSale.id, finalSale.postedAt!, created.movements
      );
      if (finalSale.status === "Cancelled") {
        record.state = "voided";
        record.movements = [];
      }

      const committed = await commitStockMovementTransaction(
        "sale",
        finalSale.id,
        finalSale,
        record,
        () => {
          const latestSales = loadSales();
          if (previous) {
            if (!latestSales.some((item) => item.id === previous.id)) return false;
            return saveSales(latestSales.map((item) =>
              item.id === previous.id ? finalSale : item
            ));
          }
          if (latestSales.some((item) => item.id === finalSale.id)) return false;
          return saveSales([...latestSales, finalSale]);
        }
      );
      if (committed !== "committed" && committed !== "movement-pending") {
        alert(`Sale was not saved: ${committed}. No stock movement was posted.`);
        return;
      }
      const savedSales = loadSales();
      setSales(savedSales);
      setSalesNo(getNextSalesNo(savedSales));
      setEditingSale(null);
      setPendingSale(null);
      if (committed === "movement-pending") {
        alert("Sale was saved. Its stock movement remains in the recovery journal and is included in available stock; do not repost this sale.");
      }
      return;
    }

    /* =================================================
       EDIT EXISTING SALE
    ================================================= */

    if (
      editingSale
    ) {

      const finalEditedSale:
        Sales = {
          ...sale,
          salesNo:
            editingSale.salesNo,
        };

      const updatedSales =
        sales.map(
          (item) =>
            item.id ===
            editingSale.id
              ? finalEditedSale
              : item
        );

      /* -----------------------------------------------
         FIRST SAVE SALES TRANSACTION
      ------------------------------------------------ */

      saveSales(
        updatedSales
      );

      setSales(
        updatedSales
      );

      /* -----------------------------------------------
         THEN REBUILD STOCK

         StockStorage स्वतः saved Sales transaction
         वाचून correct stock calculate करेल.
      ------------------------------------------------ */

      try {

        loadStock();

      } catch (
        error
      ) {

        console.error(
          "Stock rebuild after Sale Update failed:",
          error
        );
      }

      /* -----------------------------------------------
         NEXT SALES NUMBER
      ------------------------------------------------ */

      setSalesNo(
        getNextSalesNo(
          updatedSales
        )
      );

      setEditingSale(
        null
      );

      setPendingSale(
        null
      );

      return;
    }

    /* =================================================
       NEW SALE
    ================================================= */

    const updatedSales = [
      ...sales,
      sale,
    ];

    /* -----------------------------------------------
       FIRST SAVE SALES TRANSACTION
    ------------------------------------------------ */

    saveSales(
      updatedSales
    );

    setSales(
      updatedSales
    );

    /* -----------------------------------------------
       THEN REBUILD STOCK
    ------------------------------------------------ */

    try {

      loadStock();

    } catch (
      error
    ) {

      console.error(
        "Stock rebuild after Sale failed:",
        error
      );
    }

    /* -----------------------------------------------
       NEXT SALES NUMBER
    ------------------------------------------------ */

    setSalesNo(
      getNextSalesNo(
        updatedSales
      )
    );

    setEditingSale(
      null
    );

    setPendingSale(
      null
    );
  };

  /* =====================================================
     SAVE / UPDATE SALE REQUEST

     येथे actual save नाही.
     फक्त confirmation window उघडते.
  ===================================================== */

  const handleSave = (
    sale: Sales
  ) => {

    /* -----------------------------------------------
       STOCK VALIDATION
    ------------------------------------------------ */

    if (
      !validateSaleStock(
        sale
      )
    ) {
      return;
    }

    /* -----------------------------------------------
       EDIT SALE
    ------------------------------------------------ */

    if (
      editingSale
    ) {

      const finalEditedSale:
        Sales = {
          ...sale,

          salesNo:
            editingSale.salesNo,
        };

      setPendingSale(
        finalEditedSale
      );

      return;
    }

    /* -----------------------------------------------
       NEW SALE
    ------------------------------------------------ */

    const newSalesNo =
      getNextSalesNo(
        sales
      );

    const finalSale:
      Sales = {
        ...sale,

        salesNo:
          newSalesNo,
      };

    setPendingSale(
      finalSale
    );
  };

  /* =====================================================
     CONFIRM SALE

     ONLY this button causes actual save.
  ===================================================== */
  const handleConfirmSale =
  async () => {

    console.log("CONFIRM SALE CLICKED", pendingSale);

    if (
      !pendingSale
    ) {
      return;
    }

    await processConfirmedSale(
      pendingSale
    );
  };

  /* =====================================================
     CANCEL CONFIRMATION

     No save.
     No stock change.
  ===================================================== */

  const handleCancelSale =
    () => {

      setPendingSale(
        null
      );
    };

  /* =====================================================
     EDIT SALE
  ===================================================== */

  const handleEdit = (
    sale: Sales
  ) => {

    if (isStockMovementCutoverActive() && !isPostCutoverTimestamp(sale.postedAt)) {
      alert("Historical sales are protected and cannot be edited after the stock cutover.");
      return;
    }

    setEditingSale(
      sale
    );

    setSelectedSale(
      null
    );

    setPendingSale(
      null
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================================
     DELETE SALE
  ===================================================== */

  const handleDelete = async (
    id: string
  ) => {

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this sales record?\n\nEligible post-cutover stock movement will be reversed."
      );

    if (
      !confirmed
    ) {
      return;
    }

    const saleToDelete =
      sales.find(
        (sale) =>
          sale.id === id
      );

    if (
      !saleToDelete
    ) {
      return;
    }

    const updatedSales = sales.filter((sale) => sale.id !== id);

    if (isStockMovementCutoverActive()) {
      if (!isPostCutoverTimestamp(saleToDelete.postedAt)) {
        alert("Historical sales are protected and cannot be deleted after the stock cutover.");
        return;
      }
      const tombstone = movementRecordForTransaction(
        "sale", saleToDelete.id, saleToDelete.postedAt!, []
      );
      const voided = { ...tombstone, state: "voided" as const, movements: [] };
      const committed = await commitStockMovementTransaction(
        "sale",
        saleToDelete.id,
        null,
        voided,
        () => {
          const latestSales = loadSales();
          if (!latestSales.some((item) => item.id === saleToDelete.id)) return false;
          return saveSales(latestSales.filter((item) => item.id !== saleToDelete.id));
        }
      );
      if (committed !== "committed" && committed !== "movement-pending") {
        alert(`Sale was not deleted: ${committed}. No stock movement changed.`);
        return;
      }
      const savedSales = loadSales();
      setSales(savedSales);
      setSalesNo(getNextSalesNo(savedSales));
      if (selectedSale?.id === id) setSelectedSale(null);
      if (pendingSale?.id === id) setPendingSale(null);
      if (editingSale?.id === id) setEditingSale(null);
      if (committed === "movement-pending") {
        alert("Sale deletion was saved. Its stock movement is pending recovery and is excluded from available stock.");
      }
      return;
    }

    /* -----------------------------------------------
       DELETE SALE FIRST
    ------------------------------------------------ */

    saveSales(
      updatedSales
    );

    setSales(
      updatedSales
    );

    /* -----------------------------------------------
       REBUILD STOCK
    ------------------------------------------------ */

    try {

      loadStock();

    } catch (
      error
    ) {

      console.error(
        "Stock rebuild after Sale Delete failed:",
        error
      );
    }

    /* -----------------------------------------------
       NEXT SALES NUMBER
    ------------------------------------------------ */

    setSalesNo(
      getNextSalesNo(
        updatedSales
      )
    );

    if (
      editingSale?.id === id
    ) {
      setEditingSale(
        null
      );
    }

    if (
      selectedSale?.id === id
    ) {
      setSelectedSale(
        null
      );
    }

    if (
      pendingSale?.id === id
    ) {
      setPendingSale(
        null
      );
    }
  };

  /* =====================================================
     CANCEL EDIT
  ===================================================== */

  const handleCancelEdit =
    () => {

      setEditingSale(
        null
      );

      setPendingSale(
        null
      );

      setSalesNo(
        getNextSalesNo(
          sales
        )
      );
    };

  /* =====================================================
     OPEN INVOICE
  ===================================================== */

  const handleInvoice = (
    sale: Sales
  ) => {

    setSelectedSale(
      sale
    );

    setEditingSale(
      null
    );

    setPendingSale(
      null
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================================
     CLOSE INVOICE
  ===================================================== */

  const handleCloseInvoice =
    () => {

      setSelectedSale(
        null
      );
    };

  /* =====================================================
     INVOICE VIEW
  ===================================================== */

  if (
    selectedSale
  ) {

    return (
      <div
        className="invoice-page-wrapper"
        style={{
          minHeight:
            "100vh",

          background:
            "#f3f4f6",

          padding:
            "20px",
        }}
      >

        <InvoicePrint
          sale={
            selectedSale
          }

          onClose={
            handleCloseInvoice
          }
        />

      </div>
    );
  }

  /* =====================================================
     CONFIRMATION MODE
  ===================================================== */

  const salesConfirmMode:
    TransactionConfirmMode =
      editingSale
        ? "UPDATE"
        : "CREATE";

  /* =====================================================
     SALES PAGE
  ===================================================== */

  return (
    <div
      style={{
        padding:
          "10px",
      }}
    >

      {/* =================================================
          PAGE TITLE
      ================================================== */}

      <h2
        style={{
          color:
            "#14532d",

          marginBottom:
            "15px",

          fontSize:
            "20px",

          fontWeight:
            700,
        }}
      >
        📤 Sales / Issue Master
      </h2>

      {/* =================================================
          SALES FORM
      ================================================== */}

      <SalesForm
        key={
          `${salesNo}-${
            editingSale?.id ||
            "new"
          }`
        }

        salesNo={
          salesNo
        }

        editingSale={
          editingSale
        }

        onSave={
          handleSave
        }

        onCancelEdit={
          handleCancelEdit
        }
      />

      {/* =================================================
          SALES REGISTER
      ================================================== */}

      <SalesTable
        sales={
          sales
        }

        onEdit={
          handleEdit
        }

        onDelete={
          handleDelete
        }

        onInvoice={
          handleInvoice
        }
      />

      {/* =================================================
          SALES CONFIRMATION MODAL
      ================================================== */}

      <TransactionConfirmModal
        open={
          !!pendingSale
        }

        type="SALES"

        mode={
          salesConfirmMode
        }

        transaction={
          pendingSale || {}
        }

        onConfirm={
          handleConfirmSale
        }

        onCancel={
          handleCancelSale
        }
      />

    </div>
  );
}
