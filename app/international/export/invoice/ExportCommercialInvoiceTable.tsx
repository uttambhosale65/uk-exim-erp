"use client";

import { useMemo, useState } from "react";
import {
  ExportCommercialInvoice,
} from "./ExportCommercialInvoiceTypes";

type ExportCommercialInvoiceTableProps = {
  invoices: ExportCommercialInvoice[];
  onEdit: (invoice: ExportCommercialInvoice) => void;
  onDelete: (invoice: ExportCommercialInvoice) => void;
  onPrint?: (invoice: ExportCommercialInvoice) => void;
};

function displayDate(value: string): string {
  if (!value) return "-";

  const parts = value.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatusClass(
  status: ExportCommercialInvoice["status"]
): string {
  switch (status) {
    case "Paid":
      return "status paid";

    case "Partially Paid":
      return "status partial";

    case "Issued":
      return "status issued";

    case "Sent":
      return "status sent";

    case "Completed":
      return "status completed";

    case "Cancelled":
      return "status cancelled";

    default:
      return "status draft";
  }
}

export default function ExportCommercialInvoiceTable({
  invoices,
  onEdit,
  onDelete,
  onPrint,
}: ExportCommercialInvoiceTableProps) {
  const [search, setSearch] = useState("");

  const filteredInvoices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const sorted = [...invoices].sort((a, b) => {
      const dateA = new Date(
        a.updatedAt || a.createdAt || a.invoiceDate || ""
      ).getTime();

      const dateB = new Date(
        b.updatedAt || b.createdAt || b.invoiceDate || ""
      ).getTime();

      return dateB - dateA;
    });

    if (!keyword) {
      return sorted;
    }

    return sorted.filter((invoice) => {
      const productText = (invoice.items || [])
        .map(
          (item) =>
            `${item.productCode} ${item.productName}`
        )
        .join(" ");

      const searchableText = [
        invoice.invoiceNo,
        invoice.invoiceDate,
        invoice.orderNo,
        invoice.proformaInvoiceNo,
        invoice.quotationNo,
        invoice.customerCode,
        invoice.customerName,
        invoice.contactPerson,
        invoice.buyerCountry,
        invoice.currency,
        invoice.status,
        productText,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [invoices, search]);

  return (
    <div className="invoice-table-wrapper">
      <div className="table-toolbar">
        <div>
          <h3>Commercial Invoice Register</h3>
          <div className="record-count">
            {filteredInvoices.length} record
            {filteredInvoices.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="search-box">
          <span>🔎</span>

          <input
            type="text"
            placeholder="Search invoice, customer, order, PI..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearch("")}
              title="Clear Search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="table-scroll">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Invoice No.</th>
              <th>Date</th>
              <th>Order No.</th>
              <th>PI No.</th>
              <th>Customer</th>
              <th>Country</th>
              <th>Currency</th>
              <th>Products</th>
              <th>Goods Value</th>
              <th>Total Value</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="empty-row"
                >
                  {search
                    ? "No commercial invoice found for this search."
                    : "No commercial invoice available."}
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => {
                const productCount =
                  invoice.items?.length || 0;

                const productNames =
                  (invoice.items || [])
                    .map((item) => {
                      const name =
                        item.productName ||
                        item.productCode ||
                        "Product";

                      const qty = Number(
                        item.qty || 0
                      );

                      const unit =
                        item.unit || "";

                      return `${name} (${qty} ${unit})`;
                    })
                    .join(", ");

                return (
                  <tr key={invoice.id}>
                    <td className="invoice-no-cell">
                      <strong>
                        {invoice.invoiceNo}
                      </strong>
                    </td>

                    <td>
                      {displayDate(
                        invoice.invoiceDate
                      )}
                    </td>

                    <td>
                      {invoice.orderNo || "-"}
                    </td>

                    <td>
                      {invoice.proformaInvoiceNo ||
                        "-"}
                    </td>

                    <td>
                      <div className="customer-name">
                        {invoice.customerName ||
                          "-"}
                      </div>

                      {invoice.contactPerson && (
                        <div className="secondary-text">
                          {invoice.contactPerson}
                        </div>
                      )}
                    </td>

                    <td>
                      {invoice.buyerCountry || "-"}
                    </td>

                    <td className="currency-cell">
                      {invoice.currency || "-"}
                    </td>

                    <td className="products-cell">
                      <div className="product-count">
                        {productCount} product
                        {productCount !== 1
                          ? "s"
                          : ""}
                      </div>

                      <div
                        className="product-list"
                        title={productNames}
                      >
                        {productNames || "-"}
                      </div>
                    </td>

                    <td className="amount-cell">
                      {formatNumber(
                        invoice.totalGoodsValue
                      )}
                    </td>

                    <td className="amount-cell total-value">
                      {formatNumber(
                        invoice.totalInvoiceValue
                      )}
                    </td>

                    <td>
                      <span
                        className={getStatusClass(
                          invoice.status
                        )}
                      >
                        {invoice.status}
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons">
                        {onPrint && (
                          <button
                            type="button"
                            className="action-btn print-btn"
                            onClick={() =>
                              onPrint(invoice)
                            }
                            title="Print Commercial Invoice"
                          >
                            🖨️
                          </button>
                        )}

                        <button
                          type="button"
                          className="action-btn edit-btn"
                          onClick={() =>
                            onEdit(invoice)
                          }
                          title="Edit Commercial Invoice"
                        >
                          ✏️
                        </button>

                        <button
                          type="button"
                          className="action-btn delete-btn"
                          onClick={() =>
                            onDelete(invoice)
                          }
                          title="Delete Commercial Invoice"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .invoice-table-wrapper {
          width: 100%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }

        .table-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .table-toolbar h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }

        .record-count {
          margin-top: 3px;
          font-size: 11px;
          color: #64748b;
        }

        .search-box {
          min-width: 320px;
          max-width: 420px;
          height: 36px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 7px;
        }

        .search-box span {
          font-size: 14px;
        }

        .search-box input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          font-size: 12px;
          color: #0f172a;
        }

        .search-box input::placeholder {
          color: #94a3b8;
        }

        .clear-search {
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
          padding: 0 2px;
        }

        .table-scroll {
          width: 100%;
          overflow-x: auto;
        }

        .invoice-table {
          width: 100%;
          min-width: 1250px;
          border-collapse: collapse;
          font-size: 11px;
        }

        .invoice-table th {
          padding: 9px 8px;
          text-align: left;
          white-space: nowrap;
          background: #f1f5f9;
          color: #334155;
          font-size: 10px;
          font-weight: 700;
          border-bottom: 1px solid #cbd5e1;
        }

        .invoice-table td {
          padding: 9px 8px;
          vertical-align: middle;
          color: #334155;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }

        .invoice-table tbody tr:hover {
          background: #f8fafc;
        }

        .invoice-no-cell {
          color: #0f172a;
        }

        .customer-name {
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 600;
          color: #0f172a;
        }

        .secondary-text {
          margin-top: 2px;
          font-size: 10px;
          color: #64748b;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .currency-cell {
          font-weight: 600;
        }

        .products-cell {
          min-width: 210px;
          max-width: 250px;
          white-space: normal !important;
        }

        .product-count {
          margin-bottom: 2px;
          font-size: 10px;
          font-weight: 600;
          color: #475569;
        }

        .product-list {
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #64748b;
        }

        .amount-cell {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .total-value {
          font-weight: 700;
          color: #0f172a;
        }

        .status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status.draft {
          background: #f1f5f9;
          color: #475569;
        }

        .status.issued {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .status.sent {
          background: #e0e7ff;
          color: #4338ca;
        }

        .status.partial {
          background: #fef3c7;
          color: #92400e;
        }

        .status.paid {
          background: #dcfce7;
          color: #166534;
        }

        .status.completed {
          background: #d1fae5;
          color: #065f46;
        }

        .status.cancelled {
          background: #fee2e2;
          color: #991b1b;
        }

        .action-buttons {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .action-btn {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          cursor: pointer;
          font-size: 13px;
          transition: 0.15s ease;
        }

        .action-btn:hover {
          background: #f8fafc;
          transform: translateY(-1px);
        }

        .print-btn:hover {
          border-color: #94a3b8;
        }

        .edit-btn:hover {
          border-color: #60a5fa;
          background: #eff6ff;
        }

        .delete-btn:hover {
          border-color: #fca5a5;
          background: #fef2f2;
        }

        .empty-row {
          height: 100px;
          text-align: center !important;
          color: #64748b !important;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .table-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .search-box {
            min-width: 0;
            max-width: none;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}