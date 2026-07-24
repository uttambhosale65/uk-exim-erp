"use client";

import { useMemo, useState } from "react";

import SupplierForm from "./SupplierForm";
import SupplierTable from "./SupplierTable";

import { Supplier } from "./SupplierTypes";

import {
  loadSuppliers,
  saveSuppliers,
  getNextSupplierCode,
} from "./SupplierStorage";

export default function SupplierMaster() {
  const [suppliers, setSuppliers] =
    useState<Supplier[]>(loadSuppliers());

  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);

  const supplierCode = useMemo(() => {
    if (editingSupplier) {
      return editingSupplier.code;
    }

    return getNextSupplierCode(suppliers);
  }, [suppliers, editingSupplier]);
  const handleSave = (supplier: Supplier) => {
    let updatedSuppliers: Supplier[];

    if (editingSupplier) {
      updatedSuppliers = suppliers.map((item) =>
        item.id === supplier.id ? supplier : item
      );
    } else {
      updatedSuppliers = [...suppliers, supplier];
    }

    setSuppliers(updatedSuppliers);
    saveSuppliers(updatedSuppliers);

    setEditingSupplier(null);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
  };

  const handleDelete = (id: string) => {
    const updatedSuppliers = suppliers.filter(
      (item) => item.id !== id
    );

    setSuppliers(updatedSuppliers);
    saveSuppliers(updatedSuppliers);

    if (editingSupplier?.id === id) {
      setEditingSupplier(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingSupplier(null);
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
        }}
      >
        🚚 Supplier Master
      </h2>

      <SupplierForm
        supplierCode={supplierCode}
        editingSupplier={editingSupplier}
        onSave={handleSave}
        onCancelEdit={handleCancelEdit}
      />

      <SupplierTable
        suppliers={suppliers}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
</div>
);
}