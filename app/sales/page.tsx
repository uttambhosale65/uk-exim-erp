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

import TransactionConfirmModal, {
  TransactionConfirmMode,
} from "../components/common/TransactionConfirmModal";

/* =====================================================
   SALES NUMBER MIGRATION
===================================================== */

const SALES_NUMBER_VERSION =
  "uk-exim-sales-numbering-v2";

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

  const stockProductCode =
    product.stockBaseCode ||
    (
      product.unit === "Pkt"
        ? "P0006"
        : product.code
    );

  const stockQty =
    convertToStockQty(
      qty,
      product.unit,
      product.netWeight
    );

  return {
    stockProductCode,
    stockQty,
  };
}

/* =====================================================
   REPAIR OLD SALES NUMBERS
===================================================== */

function migrateSalesNumbers(
  sales: Sales[]
): Sales[] {
  if (
    typeof window === "undefined" ||
    sales.length === 0
  ) {
    return sales;
  }

  const alreadyMigrated =
    localStorage.getItem(
      SALES_NUMBER_VERSION
    );

  if (
    alreadyMigrated === "done"
  ) {
    return sales;
  }

  const correctedSales =
    sales.map(
      (sale, index) => ({
        ...sale,
        salesNo:
          `SAL-${String(
            index + 1
          ).padStart(4, "0")}`,
      })
    );

  saveSales(
    correctedSales
  );

  localStorage.setItem(
    SALES_NUMBER_VERSION,
    "done"
  );

  return correctedSales;
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

    const correctedSales =
      migrateSalesNumbers(
        loadedSales
      );

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

    const stockItems =
      Array.isArray(
        sale.items
      )
        ? sale.items
        : [];

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

  const processConfirmedSale = (
    sale: Sales
  ) => {

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
  () => {

    console.log("CONFIRM SALE CLICKED", pendingSale);

    if (
      !pendingSale
    ) {
      return;
    }

    processConfirmedSale(
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

  const handleDelete = (
    id: string
  ) => {

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this sales record?\n\nStock will be recalculated."
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

    /* -----------------------------------------------
       DELETE SALE FIRST
    ------------------------------------------------ */

    const updatedSales =
      sales.filter(
        (sale) =>
          sale.id !== id
      );

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