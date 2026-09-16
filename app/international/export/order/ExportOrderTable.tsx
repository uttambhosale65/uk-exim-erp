"use client";

import React, { useMemo, useState } from "react";
import { ExportOrder } from "./ExportOrderTypes";

type ExportOrderTableProps = {
  orders: ExportOrder[];
  onEdit: (order: ExportOrder) => void;
  onDelete: (order: ExportOrder) => void;
  onPrint?: (order: ExportOrder) => void;
};

function formatDate(dateString: string): string {
  if (!dateString) return "-";

  const parts = dateString.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return dateString;
}

function formatNumber(value: number): string {
  return Number(value || 0).toFixed(2);
}

export default function ExportOrderTable({
  orders,
  onEdit,
  onDelete,
  onPrint,
}: ExportOrderTableProps) {
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    const sorted = [...orders].sort((a, b) => {
      const dateCompare =
        new Date(b.createdAt || b.exportOrderDate).getTime() -
        new Date(a.createdAt || a.exportOrderDate).getTime();

      if (dateCompare !== 0) return dateCompare;

      return b.exportOrderNo.localeCompare(a.exportOrderNo);
    });

    if (!term) return sorted;

    return sorted.filter((order) => {
      const searchableText = [
        order.exportOrderNo,
        order.exportOrderDate,
        order.proformaInvoiceNo,
        order.quotationNo,
        order.enquiryNo,
        order.customerCode,
        order.customerName,
        order.contactPerson,
        order.buyerCountry,
        order.currency,
        order.incoterm,
        order.shipmentMode,
        order.status,
        ...order.items.map((item) => item.productCode),
        ...order.items.map((item) => item.productName),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(term);
    });
  }, [orders, search]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Export Order Register</h2>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Order No., Customer, Proforma, Country..."
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Order No.</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Proforma No.</th>
              <th style={styles.th}>Quotation No.</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Contact Person</th>
              <th style={styles.th}>Country</th>
              <th style={styles.th}>Products</th>
              <th style={styles.th}>Currency</th>
              <th style={styles.th}>Order Value</th>
              <th style={styles.th}>Incoterm</th>
              <th style={styles.th}>Shipment Mode</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={14} style={styles.emptyCell}>
                  {search
                    ? "No export orders found for this search."
                    : "No export orders found."}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} style={styles.tr}>
                  <td style={styles.td}>
                    <strong>{order.exportOrderNo}</strong>
                  </td>

                  <td style={styles.td}>
                    {formatDate(order.exportOrderDate)}
                  </td>

                  <td style={styles.td}>
                    <strong>{order.proformaInvoiceNo || "-"}</strong>
                  </td>

                  <td style={styles.td}>
                    {order.quotationNo || "-"}
                  </td>

                  <td style={styles.td}>
                    <div style={styles.customerName}>
                      {order.customerName || "-"}
                    </div>

                    {order.customerCode && (
                      <div style={styles.secondaryText}>
                        {order.customerCode}
                      </div>
                    )}
                  </td>

                  <td style={styles.td}>
                    {order.contactPerson || "-"}
                  </td>

                  <td style={styles.td}>
                    {order.buyerCountry || "-"}
                  </td>

                  <td style={styles.td}>
                    {order.items && order.items.length > 0 ? (
                      <div style={styles.productsCell}>
                        {order.items.map((item, index) => (
                          <div key={`${item.productCode}-${index}`}>
                            <strong>{item.productName}</strong>
                            {" — "}
                            {formatNumber(item.qty)} {item.unit}
                          </div>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td style={styles.td}>
                    {order.currency || "-"}
                  </td>

                  <td style={styles.td}>
                    {formatNumber(order.totalOrderValue)}
                  </td>

                  <td style={styles.td}>
                    {order.incoterm || "-"}
                  </td>

                  <td style={styles.td}>
                    {order.shipmentMode || "-"}
                  </td>

                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...(order.status === "Confirmed"
                          ? styles.statusConfirmed
                          : order.status === "Processing"
                          ? styles.statusProcessing
                          : order.status === "Partially Shipped"
                          ? styles.statusPartial
                          : order.status === "Shipped"
                          ? styles.statusShipped
                          : order.status === "Completed"
                          ? styles.statusCompleted
                          : order.status === "Cancelled"
                          ? styles.statusCancelled
                          : styles.statusDraft),
                      }}
                    >
                      {order.status}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <div style={styles.actionGroup}>
                      <button
                        type="button"
                        onClick={() => onEdit(order)}
                        style={styles.editButton}
                      >
                        Edit
                      </button>

                      {onPrint && (
                        <button
                          type="button"
                          onClick={() => onPrint(order)}
                          style={styles.printButton}
                        >
                          Print
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDelete(order)}
                        style={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {search && (
        <div style={styles.resultInfo}>
          Showing {filteredOrders.length} of {orders.length} export orders
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: "100%",
    background: "#ffffff",
    border: "1px solid #d9dee7",
    borderRadius: "8px",
    overflow: "hidden",
  },

  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "12px 14px",
    background: "#f8fafc",
    borderBottom: "1px solid #d9dee7",
  },

  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
    color: "#123b63",
  },

  searchInput: {
    width: "450px",
    maxWidth: "100%",
    height: "38px",
    padding: "0 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    background: "#ffffff",
  },

  tableContainer: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    minWidth: "1450px",
  },

  th: {
    padding: "10px 8px",
    textAlign: "left",
    whiteSpace: "nowrap",
    background: "#f1f5f9",
    color: "#163b63",
    fontWeight: 700,
    borderBottom: "1px solid #cbd5e1",
  },

  tr: {
    borderBottom: "1px solid #e2e8f0",
  },

  td: {
    padding: "10px 8px",
    verticalAlign: "top",
    color: "#1e293b",
    whiteSpace: "nowrap",
  },

  customerName: {
    fontWeight: 600,
    whiteSpace: "normal",
    minWidth: "170px",
  },

  secondaryText: {
    marginTop: "3px",
    fontSize: "12px",
    color: "#64748b",
  },

  productsCell: {
    minWidth: "190px",
    whiteSpace: "normal",
    lineHeight: 1.5,
  },

  statusBadge: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  statusDraft: {
    background: "#e2e8f0",
    color: "#334155",
  },

  statusConfirmed: {
    background: "#dcfce7",
    color: "#166534",
  },

  statusProcessing: {
    background: "#dbeafe",
    color: "#1d4ed8",
  },

  statusPartial: {
    background: "#fef3c7",
    color: "#92400e",
  },

  statusShipped: {
    background: "#e0e7ff",
    color: "#3730a3",
  },

  statusCompleted: {
    background: "#d1fae5",
    color: "#065f46",
  },

  statusCancelled: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  actionGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  editButton: {
    padding: "6px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: "5px",
    background: "#ffffff",
    color: "#163b63",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
  },

  printButton: {
    padding: "6px 10px",
    border: "1px solid #2563eb",
    borderRadius: "5px",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
  },

  deleteButton: {
    padding: "6px 10px",
    border: "1px solid #dc2626",
    borderRadius: "5px",
    background: "#ffffff",
    color: "#dc2626",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
  },

  emptyCell: {
    padding: "30px 15px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "14px",
  },

  resultInfo: {
    padding: "8px 14px",
    fontSize: "12px",
    color: "#64748b",
    borderTop: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
};