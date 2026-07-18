"use client";

import { useEffect, useState } from "react";

import SalesForm from "../components/customer/sales/SalesForm";
import SalesTable from "../components/customer/sales/SalesTable";

import { Sales } from "../components/customer/sales/SalesTypes";

import {
  loadSales,
  saveSales,
  getNextSalesNo,
} from "../components/customer/sales/SalesStorage";

export default function SalesPage() {
  const [sales, setSales] = useState<Sales[]>([]);
  const [salesNo, setSalesNo] = useState("");
  const [editingSale, setEditingSale] =
    useState<Sales | null>(null);

  useEffect(() => {
    const data = loadSales();
    setSales(data);
    setSalesNo(getNextSalesNo(data));
  }, []);

  useEffect(() => {
    saveSales(sales);
    setSalesNo(getNextSalesNo(sales));
  }, [sales]);

  function handleEditSale(sale: Sales) {
    setEditingSale(sale);
  }

  function handleDeleteSale(id: string) {
    if (!confirm("Delete this Sales Record?")) return;

    setSales((prev) =>
      prev.filter((sale) => sale.id !== id)
    );

    setEditingSale(null);
  }

  function addSales(sale: Sales) {
    setSales((prev) => {
      const exists = prev.some(
        (s) => s.id === sale.id
      );

      if (exists) {
        return prev.map((s) =>
          s.id === sale.id ? sale : s
        );
      }

      return [...prev, sale];
    });

    setEditingSale(null);
  }

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <h1>🛒 UK EXIM ERP - Sales Master</h1>

      <SalesForm
        salesNo={salesNo}
        onSave={addSales}
        editingSale={editingSale}
      />

      <br />

      <SalesTable
        sales={sales}
        onEdit={handleEditSale}
        onDelete={handleDeleteSale}
      />
    </div>
  );
}