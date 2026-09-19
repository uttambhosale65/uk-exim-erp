"use client";

import { useEffect, useState } from "react";
import ExportCommercialInvoiceForm from "./ExportCommercialInvoiceForm";
import ExportCommercialInvoiceTable from "./ExportCommercialInvoiceTable";
import ExportCommercialInvoicePrint from "./ExportCommercialInvoicePrint";
import {
  ExportCommercialInvoice,
} from "./ExportCommercialInvoiceTypes";
import {
  getNextExportCommercialInvoiceNo,
  loadExportCommercialInvoices,
  saveExportCommercialInvoices,
} from "./ExportCommercialInvoiceStorage";

export default function ExportCommercialInvoiceMaster() {
  const [invoices, setInvoices] = useState<
    ExportCommercialInvoice[]
  >([]);

  const [showForm, setShowForm] =
    useState(false);

  const [editingInvoice, setEditingInvoice] =
    useState<ExportCommercialInvoice | null>(
      null
    );

  const [invoiceNo, setInvoiceNo] =
    useState("");

  const [printInvoice, setPrintInvoice] =
    useState<ExportCommercialInvoice | null>(
      null
    );

  useEffect(() => {
    loadInvoices();
  }, []);

  function loadInvoices() {
    setInvoices(
      loadExportCommercialInvoices()
    );
  }

  function handleAdd() {
    setEditingInvoice(null);
    setInvoiceNo(
      getNextExportCommercialInvoiceNo()
    );
    setShowForm(true);
  }

  function handleEdit(
    invoice: ExportCommercialInvoice
  ) {
    setEditingInvoice(invoice);
    setInvoiceNo(invoice.invoiceNo);
    setShowForm(true);
  }

  function handleDelete(
    invoice: ExportCommercialInvoice
  ) {
    const confirmed = window.confirm(
      `Delete Commercial Invoice ${invoice.invoiceNo}?`
    );

    if (!confirmed) {
      return;
    }

    const updatedInvoices = invoices.filter(
      (item) => item.id !== invoice.id
    );

    saveExportCommercialInvoices(
      updatedInvoices
    );

    setInvoices(updatedInvoices);

    if (
      editingInvoice?.id === invoice.id
    ) {
      setEditingInvoice(null);
      setShowForm(false);
    }
  }

  function handleSave(
    invoice: ExportCommercialInvoice
  ) {
    const existingIndex = invoices.findIndex(
      (item) => item.id === invoice.id
    );

    let updatedInvoices: ExportCommercialInvoice[];

    if (existingIndex >= 0) {
      updatedInvoices = [...invoices];

      updatedInvoices[existingIndex] =
        invoice;
    } else {
      updatedInvoices = [
        ...invoices,
        invoice,
      ];
    }

    saveExportCommercialInvoices(
      updatedInvoices
    );

    setInvoices(updatedInvoices);

    setEditingInvoice(null);
    setShowForm(false);
    setInvoiceNo("");
  }

  function handleCancel() {
    setEditingInvoice(null);
    setShowForm(false);
    setInvoiceNo("");
  }

  function handlePrint(
    invoice: ExportCommercialInvoice
  ) {
    setPrintInvoice(invoice);
  }

  function handleClosePrint() {
    setPrintInvoice(null);
  }

  const totalGoodsValue = invoices.reduce(
    (sum, invoice) =>
      sum +
      Number(invoice.totalGoodsValue || 0),
    0
  );

  const totalInvoiceValue =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        Number(
          invoice.totalInvoiceValue || 0
        ),
      0
    );

  const paidCount = invoices.filter(
    (invoice) =>
      invoice.status === "Paid"
  ).length;

  const pendingCount = invoices.filter(
    (invoice) =>
      invoice.status !== "Paid" &&
      invoice.status !== "Cancelled" &&
      invoice.status !== "Completed"
  ).length;

  if (printInvoice) {
    return (
      <ExportCommercialInvoicePrint
        invoice={printInvoice}
        onClose={handleClosePrint}
      />
    );
  }

  return (
    <div className="commercial-invoice-master">
      <div className="page-header">
        <div>
          <h2>
            🌍 Export Commercial Invoice
          </h2>

          <p>
            Final export invoice generated
            from Proforma Invoice.
          </p>
        </div>

        <div className="header-actions">
          {!showForm && (
            <button
              type="button"
              className="primary-btn"
              onClick={handleAdd}
            >
              + New Commercial Invoice
            </button>
          )}
        </div>
      </div>

      {!showForm && (
        <>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">
                Commercial Invoices
              </div>

              <div className="summary-value">
                {invoices.length}
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-label">
                Goods Value
              </div>

              <div className="summary-value">
                {formatSummaryValue(
                  totalGoodsValue
                )}
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-label">
                Invoice Value
              </div>

              <div className="summary-value">
                {formatSummaryValue(
                  totalInvoiceValue
                )}
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-label">
                Paid
              </div>

              <div className="summary-value">
                {paidCount}
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-label">
                Pending
              </div>

              <div className="summary-value">
                {pendingCount}
              </div>
            </div>
          </div>

          <div className="workflow-note">
            <strong>
              Invoice Flow:
            </strong>{" "}
            Proforma Invoice → Export Order →
            Shipment → Commercial Invoice →
            Payment
          </div>

          <ExportCommercialInvoiceTable
            invoices={invoices}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPrint={handlePrint}
          />
        </>
      )}

      {showForm && (
        <div className="form-section">
          <div className="form-header">
            <div>
              <h3>
                {editingInvoice
                  ? "Edit Commercial Invoice"
                  : "New Commercial Invoice"}
              </h3>

              <div className="form-subtitle">
                Invoice No.:{" "}
                <strong>{invoiceNo}</strong>
              </div>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={handleCancel}
            >
              ← Back to Register
            </button>
          </div>

          <ExportCommercialInvoiceForm
            invoiceNo={invoiceNo}
            initialData={editingInvoice}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      <div className="safety-note">
        <strong>🔒 Stock Safety:</strong>{" "}
        Commercial Invoice does not directly
        change Domestic Stock or
        International Export Stock.
        Stock movement will be controlled
        through the Shipment / Loading
        workflow.
      </div>

      <style jsx>{`
        .commercial-invoice-master {
          width: 100%;
          min-width: 0;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .page-header h2 {
          margin: 0;
          font-size: 21px;
          font-weight: 700;
          color: #0f172a;
        }

        .page-header p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #64748b;
        }

        .header-actions {
          flex-shrink: 0;
        }

        .primary-btn {
          height: 38px;
          padding: 0 15px;
          border: none;
          border-radius: 7px;
          background: #0f766e;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .primary-btn:hover {
          background: #115e59;
        }

        .secondary-btn {
          height: 34px;
          padding: 0 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          color: #334155;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .secondary-btn:hover {
          background: #f8fafc;
        }

        .summary-grid {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }

        .summary-card {
          padding: 12px 13px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
        }

        .summary-label {
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .summary-value {
          margin-top: 5px;
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }

        .workflow-note {
          margin-bottom: 12px;
          padding: 9px 12px;
          border: 1px solid #dbeafe;
          border-radius: 7px;
          background: #eff6ff;
          color: #1e3a8a;
          font-size: 11px;
        }

        .form-section {
          padding: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #ffffff;
        }

        .form-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e2e8f0;
        }

        .form-header h3 {
          margin: 0;
          font-size: 16px;
          color: #0f172a;
        }

        .form-subtitle {
          margin-top: 3px;
          font-size: 11px;
          color: #64748b;
        }

        .safety-note {
          margin-top: 12px;
          padding: 9px 12px;
          border: 1px solid #fde68a;
          border-radius: 7px;
          background: #fffbeb;
          color: #854d0e;
          font-size: 11px;
        }

        @media (max-width: 1100px) {
          .summary-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .page-header {
            align-items: stretch;
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
          }

          .primary-btn {
            width: 100%;
          }

          .summary-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .form-header {
            align-items: stretch;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

function formatSummaryValue(
  value: number
): string {
  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}