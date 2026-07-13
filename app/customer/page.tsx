"use client";

import { useEffect, useState } from "react";

import CustomerForm from "../components/customer/CustomerForm";
import CustomerTable from "../components/customer/CustomerTable";

import { Customer } from "../components/customer/CustomerTypes";
import {
  loadCustomers,
  saveCustomers,
  getNextCustomerCode,
} from "../components/customer/CustomerStorage";

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerCode, setCustomerCode] = useState("");

  useEffect(() => {
    const data = loadCustomers();
    setCustomers(data);
    setCustomerCode(getNextCustomerCode(data));
  }, []);

  useEffect(() => {
    saveCustomers(customers);
    setCustomerCode(getNextCustomerCode(customers));
  }, [customers]);

  const addCustomer = (customer: Customer) => {
    setCustomers((prev) => [...prev, customer]);
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
        👥 UK EXIM ERP - Customer Master
      </h1>

      <CustomerForm
        customerCode={customerCode}
        onSave={addCustomer}
      />

      <CustomerTable customers={customers} />
    </div>
  );
}