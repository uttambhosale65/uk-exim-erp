"use client";

import { useEffect, useState } from "react";

import Layout from "../components/ui/Layout";
import Card from "../components/ui/Card";
import PageTitle from "../components/ui/PageTitle";

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
  const [search, setSearch] = useState("");

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

  const filteredSuppliers = suppliers.filter((s) =>
    `${s.name} ${s.contactPerson} ${s.mobile} ${s.city} ${s.gst}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Layout title="UK EXIM ERP">
      <PageTitle
        title="🚚 Supplier Master"
        subtitle="Supplier Entry & Supplier Register"
      />

      <Card title="Supplier Entry">
        <SupplierForm
          supplierCode={supplierCode}
          onSave={addSupplier}
        />
      </Card>

      <Card title="Supplier Register">
        <input
          type="text"
          placeholder="🔍 Search Supplier Name / Contact / Mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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

        <SupplierTable suppliers={filteredSuppliers} />
      </Card>
    </Layout>
  );
}