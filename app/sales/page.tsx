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

  const [salesNo, setSalesNo] =
    useState("SAL-0001");

  const [editingSale, setEditingSale] =
    useState<Sales | null>(null);

  useEffect(() => {
    const data = loadSales();

    setSales(data);

    setSalesNo(getNextSalesNo(data));
  }, []);

  const handleSave = (sale: Sales) => {
    let updatedSales: Sales[];

    if (editingSale) {
      updatedSales = sales.map((item) =>
        item.id === sale.id ? sale : item
      );
    } else {
      updatedSales = [
        ...sales,
        sale,
      ];
    }

    setSales(updatedSales);

    saveSales(updatedSales);

    setSalesNo(
      getNextSalesNo(updatedSales)
    );

    setEditingSale(null);
  };

  const handleEdit = (sale: Sales) => {
    setEditingSale(sale);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this sales record?"
    );

    if (!confirmed) {
      return;
    }

    const updatedSales = sales.filter(
      (sale) => sale.id !== id
    );

    setSales(updatedSales);

    saveSales(updatedSales);

    setSalesNo(
      getNextSalesNo(updatedSales)
    );

    if (editingSale?.id === id) {
      setEditingSale(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingSale(null);

    setSalesNo(
      getNextSalesNo(sales)
    );
  };

  return (
    <div
      style={{
        padding: "10px",
      }}
    >
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

      <SalesForm
        salesNo={salesNo}
        editingSale={editingSale}
        onSave={handleSave}
        onCancelEdit={handleCancelEdit}
      />

      <SalesTable
        sales={sales}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}