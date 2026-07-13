"use client";

import { useEffect, useState } from "react";

import SupplierForm from "../components/supplier/SupplierForm";
import SupplierTable from "../components/supplier/SupplierTable";

import { Supplier } from "../components/supplier/SupplierTypes";

import {
  loadSuppliers,
  saveSuppliers,
  getNextSupplierCode,
} from "../components/supplier/SupplierStorage";

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierCode, setSupplierCode] = useState("");

  useEffect(() => {
    const data = loadSuppliers();
    setSuppliers(data);
    setSupplierCode(getNextSupplierCode(data));
  }, []);

  useEffect(() => {
    saveSuppliers(suppliers);
    setSupplierCode(getNextSupplierCode(suppliers));
  }, [suppliers]);

  const addSupplier = (supplier: Supplier) => {
    setSuppliers((prev) => [...prev, supplier]);
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          color: "#14532d",
          marginBottom: "20px",
        }}
      >
        🚚 UK EXIM ERP - Supplier Master
      </h1>

      <SupplierForm
        supplierCode={supplierCode}
        onSave={addSupplier}
      />

      <SupplierTable suppliers={suppliers} />
    </div>
  );
}