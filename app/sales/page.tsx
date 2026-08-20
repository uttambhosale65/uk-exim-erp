"use client";

import { useEffect, useState } from "react";

import SalesForm from "../components/customer/sales/SalesForm";
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
} from "../components/stock/StockStorage";

/* =====================================================
   RESTORE SALE STOCK
   Sale Edit / Delete झाल्यावर Stock परत वाढवण्यासाठी
===================================================== */

function restoreSaleStock(sale: Sales) {
  const stock = loadStock();

  // Old sales records may not have items
  const items = Array.isArray(sale.items)
    ? sale.items
    : [];

  items.forEach((item) => {
    const index = stock.findIndex(
      (stockItem) =>
        stockItem.productCode ===
        item.productCode
    );

    if (index === -1) return;

    stock[index].salesQty = Math.max(
      0,
      Number(stock[index].salesQty || 0) -
        Number(item.qty || 0)
    );

    stock[index].currentStock =
      Math.max(
        0,
        Number(stock[index].openingStock || 0) +
          Number(stock[index].purchaseQty || 0) -
          Number(stock[index].salesQty || 0)
      );
  });

  saveStock(stock);
}

/* =====================================================
   APPLY SALE TO STOCK
===================================================== */

function applySaleStock(sale: Sales) {
  sale.items.forEach((item) => {
    reduceStock(
      item.productCode,
      Number(item.qty)
    );
  });
}

/* =====================================================
   SALES PAGE
===================================================== */

export default function SalesPage() {
  const [sales, setSales] = useState<Sales[]>([]);

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
    const data = loadSales();

    setSales(data);

    setSalesNo(
      getNextSalesNo(data)
    );
  }, []);

  /* =====================================================
     SAVE SALE
  ===================================================== */

  const handleSave = (sale: Sales) => {
    /* =================================================
       EDIT EXISTING SALE
    ================================================= */

    if (editingSale) {
      /*
        First restore the old sale quantity
        back into stock.
      */

      restoreSaleStock(editingSale);

      /*
        Then apply the new sale quantity.
      */

      applySaleStock(sale);

      const updatedSales =
        sales.map((item) =>
          item.id === sale.id
            ? sale
            : item
        );

      setSales(updatedSales);

      saveSales(updatedSales);

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

    const updatedSales = [
      ...sales,
      sale,
    ];

    /*
      Save Sales Register
    */

    setSales(updatedSales);

    saveSales(updatedSales);

    /*
      SALE → STOCK
    */

    applySaleStock(sale);

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
  ================================================= */

  const handleEdit = (sale: Sales) => {
    setEditingSale(sale);

    setSelectedSale(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================================
     DELETE SALE
  ================================================= */

  const handleDelete = (id: string) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this sales record?\n\nStock will be restored."
      );

    if (!confirmed) {
      return;
    }
console.log("DELETE ID:", id);
console.log("SALES IDs:", sales.map((sale) => sale.id));
console.log("DELETE CLICKED ID:", id);
console.log("SALE FOUND:", sales.find((sale) => sale.id === id));
    const saleToDelete =
      sales.find(
        (sale) =>
          sale.id === id
      );

    if (!saleToDelete) {
      return;
    }

    /*
      Restore stock first
    */

    restoreSaleStock(
      saleToDelete
    );

    /*
      Remove sale
    */

    const updatedSales =
      sales.filter(
        (sale) =>
          sale.id !== id
      );

    setSales(updatedSales);

    saveSales(updatedSales);

    setSalesNo(
      getNextSalesNo(
        updatedSales
      )
    );

    if (
      editingSale?.id === id
    ) {
      setEditingSale(null);
    }

    if (
      selectedSale?.id === id
    ) {
      setSelectedSale(null);
    }
  };

  /* =====================================================
     CANCEL EDIT
  ===================================================== */

  const handleCancelEdit = () => {
    setEditingSale(null);

    setSalesNo(
      getNextSalesNo(sales)
    );
  };

  /* =====================================================
     OPEN INVOICE
  ===================================================== */

  const handleInvoice = (
    sale: Sales
  ) => {
    setSelectedSale(sale);

    setEditingSale(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================================
     CLOSE INVOICE
  ===================================================== */

  const handleCloseInvoice = () => {
    setSelectedSale(null);
  };

  /* =====================================================
     INVOICE VIEW
  ===================================================== */

  if (selectedSale) {
    return (
      <div
  className="invoice-page-wrapper"
  style={{
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "20px",
  }}
>
        <InvoicePrint
          sale={selectedSale}
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
          marginBottom: "15px",
          fontSize: "20px",
          fontWeight: 700,
        }}
      >
        📤 Sales / Issue Master
      </h2>

      {/* SALES FORM */}

      <SalesForm
        salesNo={salesNo}
        editingSale={editingSale}
        onSave={handleSave}
        onCancelEdit={
          handleCancelEdit
        }
      />

      {/* SALES REGISTER */}

      <SalesTable
        sales={sales}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onInvoice={handleInvoice}
      />
    </div>
  );
}