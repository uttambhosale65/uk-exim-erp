"use client";

import { useEffect, useState } from "react";
import ExportCustomerForm from "./ExportCustomerForm";
import ExportCustomerTable from "./ExportCustomerTable";
import { ExportCustomer } from "./ExportCustomerTypes";
import {
  loadExportCustomers,
  saveExportCustomers,
  getNextExportCustomerCode,
} from "./ExportCustomerStorage";

export default function ExportCustomerMaster() {
  const [customers, setCustomers] = useState<
    ExportCustomer[]
  >([]);

  const [customerCode, setCustomerCode] =
    useState("EXP-CUST-0001");

  const [editingCustomer, setEditingCustomer] =
    useState<ExportCustomer | null>(null);

  useEffect(() => {
    const data = loadExportCustomers();

    setCustomers(data);

    setCustomerCode(
      getNextExportCustomerCode(data)
    );
  }, []);

  const handleSave = (
    customer: ExportCustomer
  ) => {
    let updatedCustomers: ExportCustomer[];

    if (editingCustomer) {
      updatedCustomers = customers.map(
        (existingCustomer) =>
          existingCustomer.id === customer.id
            ? customer
            : existingCustomer
      );
    } else {
      updatedCustomers = [
        ...customers,
        customer,
      ];
    }

    setCustomers(updatedCustomers);

    saveExportCustomers(
      updatedCustomers
    );

    setCustomerCode(
      getNextExportCustomerCode(
        updatedCustomers
      )
    );

    setEditingCustomer(null);
  };

  const handleEdit = (
    customer: ExportCustomer
  ) => {
    setEditingCustomer(customer);
  };

  const handleDelete = (id: string) => {
    const customer = customers.find(
      (item) => item.id === id
    );

    if (!customer) return;

    if (
      !window.confirm(
        `Delete Export Customer "${customer.name}"?`
      )
    ) {
      return;
    }

    const updatedCustomers =
      customers.filter(
        (item) => item.id !== id
      );

    setCustomers(updatedCustomers);

    saveExportCustomers(
      updatedCustomers
    );

    setCustomerCode(
      getNextExportCustomerCode(
        updatedCustomers
      )
    );

    if (
      editingCustomer?.id === id
    ) {
      setEditingCustomer(null);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ==========================================
          PAGE HEADER
      =========================================== */}

      <div
        style={{
          background: "#ffffff",
          padding: "18px 20px",
          borderRadius: "10px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.08)",
          marginBottom: "18px",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#0F4C81",
            fontSize: "22px",
            fontWeight: 700,
          }}
        >
          🌍 Export Customer Master
        </h1>

        <p
          style={{
            margin:
              "6px 0 0",
            color: "#6b7280",
            fontSize: "13px",
          }}
        >
          Manage international export
          customers independently from
          Domestic Customer Master.
        </p>
      </div>

      {/* ==========================================
          EXPORT CUSTOMER FORM
      =========================================== */}

      <ExportCustomerForm
        customerCode={customerCode}
        editingCustomer={editingCustomer}
        onSave={handleSave}
        onCancelEdit={() =>
          setEditingCustomer(null)
        }
      />

      {/* ==========================================
          SEPARATOR
      =========================================== */}

      <div
        style={{
          margin:
            "20px 0",
          borderTop:
            "1px solid #e5e7eb",
        }}
      />

      {/* ==========================================
          EXPORT CUSTOMER REGISTER
      =========================================== */}

      <ExportCustomerTable
        customers={customers}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}