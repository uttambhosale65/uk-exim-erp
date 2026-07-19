"use client";

import { useEffect, useState } from "react";

import Layout from "../components/ui/Layout";
import Card from "../components/ui/Card";
import PageTitle from "../components/ui/PageTitle";

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

  const [search, setSearch] = useState("");

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

  const filteredSales = sales.filter((s) =>
    `${s.salesNo} ${s.customerName} ${s.productName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Layout title="UK EXIM ERP">
      <PageTitle
        title="🛒 Sales Master"
        subtitle="Sales Entry & Sales Register"
      />

      <Card title="Sales Entry">
        <SalesForm
          salesNo={salesNo}
          onSave={addSales}
          editingSale={editingSale}
        />
      </Card>

      <Card title="Sales Register">
        <input
          type="text"
          placeholder="🔍 Search Sales No / Customer / Product"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            width: "100%",
            height: "40px",
            padding: "0 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            marginBottom: "12px",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <SalesTable
          sales={filteredSales}
          onEdit={handleEditSale}
          onDelete={handleDeleteSale}
        />
      </Card>
    </Layout>
  );
}