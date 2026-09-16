"use client";

import React, { useMemo, useState } from "react";
import { ExportProformaInvoice } from "./ExportProformaInvoiceTypes";

type ExportProformaInvoiceTableProps = {
  invoices: ExportProformaInvoice[];
  onEdit: (invoice: ExportProformaInvoice) => void;
  onDelete: (invoice: ExportProformaInvoice) => void;
  onPrint?: (invoice: ExportProformaInvoice) => void;
};

export default function ExportProformaInvoiceTable({
  invoices,
  onEdit,
  onDelete,
  onPrint,
}: ExportProformaInvoiceTableProps) {
  const [search, setSearch] = useState("");

  const filteredInvoices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const sorted = [...invoices].sort((a, b) => {
      const dateA = new Date(
        a.updatedAt || a.proformaInvoiceDate || ""
      ).getTime();

      const dateB = new Date(
        b.updatedAt || b.proformaInvoiceDate || ""
      ).getTime();

      return dateB - dateA;
    });

    if (!keyword) {
      return sorted;
    }

    return sorted.filter((invoice) => {
      const searchableText = [
        invoice.proformaInvoiceNo,
        invoice.proformaInvoiceDate,
        invoice.quotationNo,
        invoice.enquiryNo,
        invoice.exportOrderNo,
        invoice.customerCode,
        invoice.customerName,
        invoice.contactPerson,
        invoice.buyerCountry,
        invoice.currency,
        invoice.incoterm,
        invoice.status,
        ...invoice.items.flatMap((item) => [
          item.productCode,
          item.productName,
          item.hsCode,
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [invoices, search]);

  const formatDate = (value: string) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const formatNumber = (value: number) => {
    return Number(value || 0).toFixed(2);
  };

  const handleDelete = (
    invoice: ExportProformaInvoice
  ) => {
    const confirmed = window.confirm(
      `Delete Proforma Invoice ${invoice.proformaInvoiceNo}?`
    );

    if (!confirmed) {
      return;
    }

    onDelete(invoice);
  };

  return (
    <div
      style={{
        width: "100%",
        background: "#ffffff",
        border: "1px solid #dfe3e8",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <style>{`
        .pi-register-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-bottom: 1px solid #dfe3e8;
          background: #f7f8fa;
        }

        .pi-register-title {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
        }

        .pi-register-count {
          margin-top: 3px;
          font-size: 12px;
          color: #6b7280;
        }

        .pi-register-search {
          width: 320px;
          max-width: 100%;
          box-sizing: border-box;
          border: 1px solid #cfd5dc;
          border-radius: 5px;
          padding: 9px 10px;
          font-size: 13px;
          outline: none;
          background: #ffffff;
        }

        .pi-register-search:focus {
          border-color: #6b7280;
        }

        .pi-register-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .pi-register-table {
          width: 100%;
          min-width: 1450px;
          border-collapse: collapse;
          font-size: 12px;
        }

        .pi-register-table th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: #eef1f4;
          color: #374151;
          border-bottom: 1px solid #d8dde3;
          padding: 9px 8px;
          text-align: left;
          white-space: nowrap;
          font-weight: 700;
        }

        .pi-register-table td {
          border-bottom: 1px solid #edf0f2;
          padding: 9px 8px;
          vertical-align: top;
          color: #374151;
        }

        .pi-register-table tbody tr:hover {
          background: #fafafa;
        }

        .pi-document-no {
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
        }

        .pi-customer {
          font-weight: 600;
          color: #1f2937;
        }

        .pi-products {
          min-width: 230px;
        }

        .pi-product-line {
          padding: 2px 0;
          line-height: 1.35;
        }

        .pi-product-code {
          color: #6b7280;
          font-size: 11px;
        }

        .pi-product-qty {
          font-weight: 600;
        }

        .pi-status {
          display: inline-block;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 4px 9px;
          font-size: 11px;
          white-space: nowrap;
          background: #f9fafb;
          color: #374151;
        }

        .pi-action-cell {
          white-space: nowrap;
        }

        .pi-action-btn {
          border: 1px solid #cfd5dc;
          background: #ffffff;
          border-radius: 4px;
          padding: 6px 9px;
          margin-right: 5px;
          font-size: 11px;
          cursor: pointer;
        }

        .pi-action-btn:hover {
          background: #f3f4f6;
        }

        .pi-action-print {
          color: #1f2937;
        }

        .pi-action-delete {
          color: #b91c1c;
        }

        .pi-empty {
          text-align: center;
          padding: 30px 15px !important;
          color: #6b7280;
        }

        @media (max-width: 700px) {
          .pi-register-header {
            align-items: stretch;
            flex-direction: column;
          }

          .pi-register-search {
            width: 100%;
          }
        }
      `}</style>

      <div className="pi-register-header">
        <div>
          <div className="pi-register-title">
            Proforma Invoice Register
          </div>

          <div className="pi-register-count">
            Showing {filteredInvoices.length} of{" "}
            {invoices.length} record
            {invoices.length === 1 ? "" : "s"}
          </div>
        </div>

        <input
          className="pi-register-search"
          type="text"
          placeholder="Search Proforma Invoice..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />
      </div>

      <div className="pi-register-table-wrap">
        <table className="pi-register-table">
          <thead>
            <tr>
              <th>Proforma Invoice No.</th>
              <th>Date</th>
              <th>Quotation No.</th>
              <th>Enquiry No.</th>
              <th>Export Order No.</th>
              <th>Customer</th>
              <th>Contact Person</th>
              <th>Country</th>
              <th>Currency</th>
              <th>Products</th>
              <th>Goods Value</th>
              <th>Total Value</th>
              <th>Incoterm</th>
              <th>Valid Until</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td
                  colSpan={16}
                  className="pi-empty"
                >
                  {search.trim()
                    ? "No Proforma Invoice found for this search."
                    : "No Proforma Invoice records available."}
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <div className="pi-document-no">
                      {invoice.proformaInvoiceNo}
                    </div>
                  </td>

                  <td>
                    {formatDate(
                      invoice.proformaInvoiceDate
                    )}
                  </td>

                  <td>
                    {invoice.quotationNo || "-"}
                  </td>

                  <td>
                    {invoice.enquiryNo || "-"}
                  </td>

                  <td>
                    {invoice.exportOrderNo || "-"}
                  </td>

                  <td>
                    <div className="pi-customer">
                      {invoice.customerName || "-"}
                    </div>

                    {invoice.customerCode && (
                      <div className="pi-product-code">
                        {invoice.customerCode}
                      </div>
                    )}
                  </td>

                  <td>
                    {invoice.contactPerson || "-"}
                  </td>

                  <td>
                    {invoice.buyerCountry || "-"}
                  </td>

                  <td>
                    {invoice.currency || "-"}
                  </td>

                  <td className="pi-products">
                    {invoice.items.length === 0 ? (
                      "-"
                    ) : (
                      invoice.items.map(
                        (item, index) => (
                          <div
                            className="pi-product-line"
                            key={`${invoice.id}-${index}`}
                          >
                            <div>
                              <strong>
                                {item.productName ||
                                  "-"}
                              </strong>
                            </div>

                            {item.productCode && (
                              <div className="pi-product-code">
                                Code:{" "}
                                {item.productCode}
                              </div>
                            )}

                            <div>
                              <span className="pi-product-qty">
                                Qty:{" "}
                                {Number(
                                  item.qty || 0
                                ).toFixed(3)}{" "}
                                {item.unit || ""}
                              </span>

                              {" | "}

                              Unit Price:{" "}
                              {invoice.currency}{" "}
                              {Number(
                                item.unitPrice || 0
                              ).toFixed(2)}
                            </div>
                          </div>
                        )
                      )
                    )}
                  </td>

                  <td>
                    {invoice.currency}{" "}
                    {formatNumber(
                      invoice.totalGoodsValue
                    )}
                  </td>

                  <td>
                    <strong>
                      {invoice.currency}{" "}
                      {formatNumber(
                        invoice.totalProformaValue
                      )}
                    </strong>
                  </td>

                  <td>
                    {invoice.incoterm || "-"}
                    {invoice.incotermPlace
                      ? ` - ${invoice.incotermPlace}`
                      : ""}
                  </td>

                  <td>
                    {formatDate(
                      invoice.validityDate
                    )}
                  </td>

                  <td>
                    <span className="pi-status">
                      {invoice.status}
                    </span>
                  </td>

                  <td className="pi-action-cell">
                    <button
                      type="button"
                      className="pi-action-btn"
                      onClick={() =>
                        onEdit(invoice)
                      }
                    >
                      Edit
                    </button>

                    {onPrint && (
                      <button
                        type="button"
                        className="pi-action-btn pi-action-print"
                        onClick={() =>
                          onPrint(invoice)
                        }
                      >
                        Print
                      </button>
                    )}

                    <button
                      type="button"
                      className="pi-action-btn pi-action-delete"
                      onClick={() =>
                        handleDelete(invoice)
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}