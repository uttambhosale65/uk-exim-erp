"use client";

import React, { useEffect, useState } from "react";
import ExportProformaInvoiceForm from "./ExportProformaInvoiceForm";
import ExportProformaInvoiceTable from "./ExportProformaInvoiceTable";
import ExportProformaInvoicePrint from "./ExportProformaInvoicePrint";
import {
  ExportProformaInvoice,
} from "./ExportProformaInvoiceTypes";
import {
  getNextExportProformaInvoiceNo,
  loadExportProformaInvoices,
  saveExportProformaInvoices,
} from "./ExportProformaInvoiceStorage";

export default function ExportProformaInvoiceMaster() {
  const [invoices, setInvoices] = useState<
    ExportProformaInvoice[]
  >([]);

  const [editingInvoice, setEditingInvoice] =
    useState<ExportProformaInvoice | null>(null);

  const [printingInvoice, setPrintingInvoice] =
    useState<ExportProformaInvoice | null>(null);

  const [formKey, setFormKey] = useState(0);

  const [nextInvoiceNo, setNextInvoiceNo] =
    useState("EXP-PI-0001");

  useEffect(() => {
    const storedInvoices =
      loadExportProformaInvoices();

    setInvoices(storedInvoices);

    setNextInvoiceNo(
      getNextExportProformaInvoiceNo(
        storedInvoices
      )
    );
  }, []);

  const refreshData = (
    updatedInvoices: ExportProformaInvoice[]
  ) => {
    const sortedInvoices = [...updatedInvoices].sort(
      (a, b) => {
        const dateA = new Date(
          a.updatedAt ||
            a.proformaInvoiceDate ||
            ""
        ).getTime();

        const dateB = new Date(
          b.updatedAt ||
            b.proformaInvoiceDate ||
            ""
        ).getTime();

        return dateB - dateA;
      }
    );

    setInvoices(sortedInvoices);

    saveExportProformaInvoices(
      sortedInvoices
    );

    setNextInvoiceNo(
      getNextExportProformaInvoiceNo(
        sortedInvoices
      )
    );
  };

  const handleSave = (
    invoice: ExportProformaInvoice
  ) => {
    const existingIndex =
      invoices.findIndex(
        (item) =>
          item.id === invoice.id
      );

    let updatedInvoices:
      ExportProformaInvoice[];

    if (existingIndex >= 0) {
      updatedInvoices =
        invoices.map(
          (item, index) =>
            index === existingIndex
              ? invoice
              : item
        );
    } else {
      updatedInvoices = [
        ...invoices,
        invoice,
      ];
    }

    refreshData(updatedInvoices);

    setEditingInvoice(null);

    setFormKey(
      (previous) =>
        previous + 1
    );
  };

  const handleEdit = (
    invoice: ExportProformaInvoice
  ) => {
    setEditingInvoice(invoice);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = (
    invoice: ExportProformaInvoice
  ) => {
    const updatedInvoices =
      invoices.filter(
        (item) =>
          item.id !== invoice.id
      );

    refreshData(updatedInvoices);

    if (
      editingInvoice &&
      editingInvoice.id ===
        invoice.id
    ) {
      setEditingInvoice(null);

      setFormKey(
        (previous) =>
          previous + 1
      );
    }

    if (
      printingInvoice &&
      printingInvoice.id ===
        invoice.id
    ) {
      setPrintingInvoice(null);
    }
  };

  const handlePrint = (
    invoice: ExportProformaInvoice
  ) => {
    setPrintingInvoice(invoice);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleClosePrint = () => {
    setPrintingInvoice(null);
  };

  const handleCancelEdit = () => {
    setEditingInvoice(null);

    setFormKey(
      (previous) =>
        previous + 1
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /*
   * ---------------------------------------------------------
   * PRINT PREVIEW MODE
   * ---------------------------------------------------------
   *
   * The existing A4 Proforma Invoice print component
   * already contains the actual Print button and
   * @media print styling.
   *
   * Here we simply display that component when the user
   * clicks Print from the Register.
   */

  if (printingInvoice) {
    return (
      <ExportProformaInvoicePrint
        invoice={printingInvoice}
        onClose={handleClosePrint}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#f5f6f8",
        padding: "20px",
        boxSizing: "border-box",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <style>{`
        .pi-master-container {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
        }

        .pi-master-header {
          margin-bottom: 16px;
        }

        .pi-master-title {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          color: #1f2937;
        }

        .pi-master-subtitle {
          margin-top: 5px;
          font-size: 12px;
          color: #6b7280;
        }

        .pi-mode-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          padding: 10px 14px;
          background: #ffffff;
          border: 1px solid #dfe3e8;
          border-radius: 7px;
        }

        .pi-mode-label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .pi-mode-value {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
        }

        .pi-master-divider {
          height: 1px;
          background: #dfe3e8;
          margin: 22px 0;
        }

        @media (max-width: 700px) {
          .pi-mode-bar {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="pi-master-container">
        <div className="pi-master-header">
          <h1 className="pi-master-title">
            Export Proforma Invoice
          </h1>

          <div className="pi-master-subtitle">
            International Export · Proforma Invoice
            Management
          </div>
        </div>

        <div className="pi-mode-bar">
          <div>
            <span className="pi-mode-label">
              {editingInvoice
                ? "Editing Proforma Invoice"
                : "New Proforma Invoice"}
            </span>
          </div>

          <div>
            <span className="pi-mode-label">
              Document No.:{" "}
            </span>

            <span className="pi-mode-value">
              {editingInvoice
                ? editingInvoice.proformaInvoiceNo
                : nextInvoiceNo}
            </span>
          </div>
        </div>

        <ExportProformaInvoiceForm
          key={formKey}
          invoiceNo={
            editingInvoice
              ? editingInvoice.proformaInvoiceNo
              : nextInvoiceNo
          }
          initialData={
            editingInvoice
          }
          onSave={handleSave}
          onCancel={
            editingInvoice
              ? handleCancelEdit
              : undefined
          }
        />

        <div className="pi-master-divider" />

        <ExportProformaInvoiceTable
          invoices={invoices}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPrint={handlePrint}
        />
      </div>
    </div>
  );
}