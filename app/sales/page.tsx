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
  saveStock,
  reduceStock,
  getCurrentStock,
  convertToStockQty,
} from "../components/stock/StockStorage";

/* =====================================================
   SALES NUMBER MIGRATION
   Existing old Sales records ला एकदाच
   SAL-0001, SAL-0002, SAL-0003...
   unique numbering देण्यासाठी
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
      stockProductCode:
        productCode,
      stockQty:
        Number(qty) || 0,
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
   RESTORE SALE STOCK

   Sale Edit / Delete झाल्यावर
   Stock Base Product मध्ये quantity परत वाढवणे.
===================================================== */

function restoreSaleStock(sale: Sales) {
  const stock = loadStock();

  const items = Array.isArray(sale.items)
    ? sale.items
    : [];

  items.forEach((item) => {
    if (
      !item.productCode ||
      Number(item.qty) <= 0
    ) {
      return;
    }

    const stockImpact =
      getStockImpact(
        item.productCode,
        Number(item.qty)
      );

    const index = stock.findIndex(
      (stockItem) =>
        stockItem.productCode ===
        stockImpact.stockProductCode
    );

    if (index === -1) {
      return;
    }

    stock[index].salesQty = Math.max(
      0,
      Number(stock[index].salesQty || 0) -
        stockImpact.stockQty
    );

    stock[index].currentStock =
      Number(stock[index].openingStock || 0) +
      Number(stock[index].purchaseQty || 0) -
      Number(stock[index].salesQty || 0);
  });

  saveStock(stock);
}
/* =====================================================
   APPLY SALE TO STOCK

   Packed Product → Stock Base Product
   Packet Qty → KG
===================================================== */

function applySaleStock(sale: Sales) {
  const items = Array.isArray(sale.items)
    ? sale.items
    : [];

  items.forEach((item) => {
    if (
      !item.productCode ||
      Number(item.qty) <= 0
    ) {
      return;
    }

    const stockImpact =
      getStockImpact(
        item.productCode,
        Number(item.qty)
      );

    reduceStock(
      stockImpact.stockProductCode,
      stockImpact.stockQty
    );
  });
}

/* =====================================================
   REPAIR OLD SALES NUMBERS
   हे फक्त एकदाच चालेल.
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

  /*
    Migration आधीच झाली असेल तर
    पुन्हा numbering करू नका.
  */

  if (alreadyMigrated === "done") {
    return sales;
  }

  /*
    Existing records ज्या क्रमाने आहेत
    त्याच क्रमाने SAL-0001 पासून numbering.
  */

  const correctedSales = sales.map(
    (sale, index) => ({
      ...sale,
      salesNo: `SAL-${String(
        index + 1
      ).padStart(4, "0")}`,
    })
  );

  /*
    Corrected data save करा.
  */

  saveSales(correctedSales);

  /*
    Migration complete mark करा.
  */

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
    useState("SAL-0001");

  const [editingSale, setEditingSale] =
    useState<Sales | null>(null);

  const [selectedSale, setSelectedSale] =
    useState<Sales | null>(null);

  /* =====================================================
     LOAD SALES
===================================================== */

  useEffect(() => {
    const loadedSales = loadSales();

    /*
      जुने duplicate / wrong Sales No.
      एकदाच correct करा.
    */

    const correctedSales =
      migrateSalesNumbers(
        loadedSales
      );

    setSales(correctedSales);

    /*
      पुढचा Sales No.
    */

    setSalesNo(
      getNextSalesNo(
        correctedSales
      )
    );
  }, []);

  /* =====================================================
     SAVE SALE
===================================================== */

  const handleSave = (sale: Sales) => {
    /* =================================================
       STOCK VALIDATION
       New Sale / Edit Sale
    ================================================= */

    const stockItems =
      Array.isArray(sale.items)
        ? sale.items
        : [];

    for (const item of stockItems) {
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

      /*
        EDIT SALE:
        जुन्या invoice ची quantity
        temporarily add back करा.
      */

      if (editingSale) {
        const oldItem =
          editingSale.items?.find(
            (old) =>
              old.productCode ===
              item.productCode
          );

        if (oldItem) {
          const oldStockImpact =
            getStockImpact(
              oldItem.productCode,
              Number(oldItem.qty)
            );

          /*
            Old sale quantity is restored in
            the same stock UOM used by StockStorage.
          */
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

        return;
      }
    }

    /* =================================================
       EDIT EXISTING SALE
    ================================================= */

    if (editingSale) {
      /*
        Old quantity restore करा.
      */

      restoreSaleStock(
        editingSale
      );

      /*
        New quantity apply करा.
      */

      applySaleStock(sale);

      /*
        IMPORTANT:
        Edit करताना जुना Sales No.
        कायम ठेवायचा.
      */

      const finalEditedSale: Sales = {
        ...sale,
        salesNo:
          editingSale.salesNo,
      };

      const updatedSales =
        sales.map((item) =>
          item.id === sale.id
            ? finalEditedSale
            : item
        );

      setSales(
        updatedSales
      );

      saveSales(
        updatedSales
      );

      /*
        पुढचा Sales No.
      */

      setSalesNo(
        getNextSalesNo(
          updatedSales
        )
      );

      setEditingSale(null);

      return;
    }

    /* =================================================
       NEW SALE
    ================================================= */

    /*
      नवीन Sales No. फक्त
      नवीन record साठी.
    */

    const newSalesNo =
      getNextSalesNo(
        sales
      );

    const finalSale: Sales = {
      ...sale,
      salesNo:
        newSalesNo,
    };

    /*
      New sale array च्या शेवटी save.
      SalesTable मध्ये reverse करून
      नवीन entry वर दाखवू.
    */

    const updatedSales = [
      ...sales,
      finalSale,
    ];

    /*
      Sales Register save
    */

    setSales(
      updatedSales
    );

    saveSales(
      updatedSales
    );

    /*
      Sale → Stock
    */

    applySaleStock(
      finalSale
    );

    /*
      Next Sales Number
    */

    setSalesNo(
      getNextSalesNo(
        updatedSales
      )
    );

    setEditingSale(null);
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
        "Are you sure you want to delete this sales record?\n\nStock will be restored."
      );

    if (!confirmed) {
      return;
    }

    const saleToDelete =
      sales.find(
        (sale) =>
          sale.id === id
      );

    if (!saleToDelete) {
      return;
    }

    /*
      Restore stock first.
    */

    restoreSaleStock(
      saleToDelete
    );

    /*
      Sale remove करा.
    */

    const updatedSales =
      sales.filter(
        (sale) =>
          sale.id !== id
      );

    setSales(
      updatedSales
    );

    saveSales(
      updatedSales
    );

    /*
      IMPORTANT:
      Delete झाल्यानंतर existing
      Sales Numbers बदलायचे नाहीत.
    */

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
  };

  /* =====================================================
     CANCEL EDIT
===================================================== */

  const handleCancelEdit = () => {
    setEditingSale(
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

  if (selectedSale) {
    return (
      <div
        className="invoice-page-wrapper"
        style={{
          minHeight:
            "100vh",
          background:
            "#f3f4f6",
          padding: "20px",
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
     SALES PAGE
===================================================== */

  return (
    <div
      style={{
        padding: "10px",
      }}
    >
      {/* PAGE TITLE */}

      <h2
        style={{
          color: "#14532d",
          marginBottom:
            "15px",
          fontSize:
            "20px",
          fontWeight: 700,
        }}
      >
        📤 Sales / Issue Master
      </h2>

      {/* SALES FORM */}

      <SalesForm
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

      {/* SALES REGISTER */}

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
    </div>
  );
}