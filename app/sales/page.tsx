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

  useEffect(() => {
    const data = loadSales();
    setSales(data);
    setSalesNo(getNextSalesNo(data));
  }, []);

  useEffect(() => {
    saveSales(sales);
    setSalesNo(getNextSalesNo(sales));
  }, [sales]);

  function addSales(sale: Sales) {
    setSales((prev) => [...prev, sale]);
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
      />

      <br />

      <SalesTable sales={sales} />
    </div>
  );
}