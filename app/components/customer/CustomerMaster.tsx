"use client";

import { useEffect, useState } from "react";
import CustomerForm from "./CustomerForm";
import CustomerTable from "./CustomerTable";
import { Customer } from "./CustomerTypes";
import {
  loadCustomers,
  saveCustomers,
  getNextCustomerCode,
} from "./CustomerStorage";

export default function CustomerMaster() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerCode, setCustomerCode] =
    useState("C0001");

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  useEffect(() => {
    const data = loadCustomers();
    setCustomers(data);
    setCustomerCode(getNextCustomerCode(data));
  }, []);

  const handleSave = (customer: Customer) => {
    let updatedCustomers: Customer[];

    if (editingCustomer) {
      updatedCustomers = customers.map((c) =>
        c.id === customer.id ? customer : c
      );
    } else {
      updatedCustomers = [...customers, customer];
    }

    setCustomers(updatedCustomers);
    saveCustomers(updatedCustomers);

    setCustomerCode(
      getNextCustomerCode(updatedCustomers)
    );

    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this customer?")) return;

    const updatedCustomers = customers.filter(
      (customer) => customer.id !== id
    );

    setCustomers(updatedCustomers);
    saveCustomers(updatedCustomers);

    setCustomerCode(
      getNextCustomerCode(updatedCustomers)
    );
  };

  return (
    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: "20px",
        }}
      >
        👥 Customer Master
      </h2>

      <CustomerForm
        customerCode={customerCode}
        editingCustomer={editingCustomer}
        onSave={handleSave}
        onCancelEdit={() =>
          setEditingCustomer(null)
        }
      />

      <hr
        style={{
          margin: "25px 0",
          border: "none",
          borderTop: "1px solid #e5e7eb",
        }}
      />
      <CustomerTable
        customers={customers}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}