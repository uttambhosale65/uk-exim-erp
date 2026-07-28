"use client";

import { useEffect, useMemo, useState } from "react";

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
  getNextInvoiceNo,
} from "../components/customer/sales/SalesStorage";

export default function SalesPage() {
  const [sales, setSales] = useState<Sales[]>([]);

  const [salesNo, setSalesNo] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");

  const [editingSale, setEditingSale] =
    useState<Sales | null>(null);

  const [search, setSearch] = useState("");

  useEffect(() => {
    const data = loadSales();

    setSales(data);

    setSalesNo(
      getNextSalesNo(data)
    );

    setInvoiceNo(
      getNextInvoiceNo(data)
    );
  }, []);

  useEffect(() => {
    saveSales(sales);

    setSalesNo(
      getNextSalesNo(sales)
    );

    setInvoiceNo(
      getNextInvoiceNo(sales)
    );
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) =>
      `
      ${sale.salesNo}
      ${sale.invoiceNo}
      ${sale.customerName}
      ${sale.productName}
      `
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [sales, search]);
  function handleEditSale(sale: Sales) {
    setEditingSale(sale);
  }

  function handleDeleteSale(id: string) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this Sales Entry?"
    );

    if (!confirmDelete) return;

    setSales((prev) =>
      prev.filter((sale) => sale.id !== id)
    );

    setEditingSale(null);
  }

  function addSales(sale: Sales) {
    setSales((prev) => {
      const exists = prev.some(
        (item) => item.id === sale.id
      );

      if (exists) {
        return prev.map((item) =>
          item.id === sale.id ? sale : item
        );
      }

      return [
        ...prev,
        {
          ...sale,
          id: crypto.randomUUID(),
          salesNo,
          invoiceNo,
        },
      ];
    });

    setEditingSale(null);
  }
  return (
    <Layout title="UK EXIM ERP">

      <PageTitle
        title="🛒 Sales Master"
        subtitle="Sales Entry & Sales Register"
      />

      <Card title="Sales Entry">

      <SalesForm
  salesNo={salesNo}
  invoiceNo={invoiceNo}
  editData={editingSale}
  onSave={addSales}
/>

</Card>

      <Card title="Sales Register">

        <input
          type="text"
          placeholder="🔍 Search Sales No / Invoice No / Customer / Product"
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
      <div className="mt-4 text-sm text-gray-600">
        Total Sales Records :{" "}
        <strong>{filteredSales.length}</strong>
      </div>

    </Layout>
  );
}