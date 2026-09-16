"use client";

import React, { useEffect, useMemo, useState } from "react";
import ExportOrderForm from "./ExportOrderForm";
import ExportOrderPrint from "./ExportOrderPrint";
import {
  ExportOrder,
  ExportOrderStatus,
} from "./ExportOrderTypes";
import {
  loadExportOrders,
  saveExportOrders,
  getNextExportOrderNo,
} from "./ExportOrderStorage";

function formatDate(value: string): string {
  if (!value) return "";

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function statusClass(
  status: ExportOrderStatus
): string {
  switch (status) {
    case "Confirmed":
      return "status-confirmed";

    case "Processing":
      return "status-processing";

    case "Partially Shipped":
      return "status-partial";

    case "Shipped":
      return "status-shipped";

    case "Completed":
      return "status-completed";

    case "Cancelled":
      return "status-cancelled";

    default:
      return "status-draft";
  }
}

export default function ExportOrderMaster() {
  const [orders, setOrders] = useState<
    ExportOrder[]
  >([]);

  const [editingOrder, setEditingOrder] =
    useState<ExportOrder | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [printingOrder, setPrintingOrder] =
    useState<ExportOrder | null>(null);

  useEffect(() => {
    setOrders(loadExportOrders());
  }, [refreshKey]);

  const nextOrderNo = useMemo(() => {
    return getNextExportOrderNo(orders);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    const sorted = [...orders].sort(
      (a, b) => {
        const aTime =
          new Date(
            a.createdAt ||
              a.exportOrderDate ||
              0
          ).getTime();

        const bTime =
          new Date(
            b.createdAt ||
              b.exportOrderDate ||
              0
          ).getTime();

        return bTime - aTime;
      }
    );

    if (!keyword) {
      return sorted;
    }

    return sorted.filter((order) => {
      const searchableText = [
        order.exportOrderNo,
        order.proformaInvoiceNo,
        order.quotationNo,
        order.enquiryNo,
        order.customerCode,
        order.customerName,
        order.contactPerson,
        order.buyerCountry,
        order.currency,
        order.incoterm,
        order.status,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        keyword
      );
    });
  }, [orders, search]);

  const handleNewOrder = () => {
    setEditingOrder(null);
    setShowForm(true);
  };

  const handleEditOrder = (
    order: ExportOrder
  ) => {
    setEditingOrder(order);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handlePrintOrder = (
    order: ExportOrder
  ) => {
    setPrintingOrder(order);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDeleteOrder = (
    order: ExportOrder
  ) => {
    const confirmed = window.confirm(
      `Delete Export Order ${order.exportOrderNo}?\n\nCustomer: ${order.customerName}\nProforma: ${order.proformaInvoiceNo}`
    );

    if (!confirmed) {
      return;
    }

    const updatedOrders =
      orders.filter(
        (item) =>
          item.id !== order.id
      );

    saveExportOrders(
      updatedOrders
    );

    setOrders(updatedOrders);

    if (
      editingOrder?.id === order.id
    ) {
      setEditingOrder(null);
      setShowForm(false);
    }
  };

  const handleSaveOrder = (
    order: ExportOrder
  ) => {
    const existingIndex =
      orders.findIndex(
        (item) =>
          item.id === order.id
      );

    let updatedOrders: ExportOrder[];

    if (existingIndex >= 0) {
      updatedOrders = [...orders];

      updatedOrders[
        existingIndex
      ] = {
        ...order,
        updatedAt:
          new Date().toISOString(),
      };
    } else {
      updatedOrders = [
        ...orders,
        {
          ...order,
          createdAt:
            order.createdAt ||
            new Date().toISOString(),
          updatedAt:
            new Date().toISOString(),
        },
      ];
    }

    saveExportOrders(
      updatedOrders
    );

    setOrders(updatedOrders);

    setEditingOrder(null);
    setShowForm(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCancelForm = () => {
    setEditingOrder(null);
    setShowForm(false);
  };

  const handleRefresh = () => {
    setRefreshKey(
      (previous) =>
        previous + 1
    );
  };

  const totalOrderValue = useMemo(() => {
    return orders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.totalOrderValue || 0
        ),
      0
    );
  }, [orders]);

  const totalOrders = orders.length;

  const activeOrders =
    orders.filter(
      (order) =>
        order.status !==
          "Cancelled" &&
        order.status !==
          "Completed"
    ).length;

  if (printingOrder) {
    return (
      <ExportOrderPrint
        order={printingOrder}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6f8",
        color: "#1f2937",
        fontFamily:
          "Arial, Helvetica, sans-serif",
        padding: "14px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .eo-master-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .eo-master-title {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .eo-master-subtitle {
          margin-top: 3px;
          font-size: 11px;
          color: #6b7280;
        }

        .eo-master-actions {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }

        .eo-master-btn {
          border: 1px solid #cbd1d8;
          border-radius: 5px;
          background: #ffffff;
          color: #1f2937;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .eo-master-btn:hover {
          background: #f3f4f6;
        }

        .eo-master-btn-primary {
          background: #1f2937;
          color: #ffffff;
          border-color: #1f2937;
        }

        .eo-master-btn-primary:hover {
          background: #111827;
        }

        .eo-summary-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 10px;
        }

        .eo-summary-card {
          background: #ffffff;
          border: 1px solid #dfe3e8;
          border-radius: 6px;
          padding: 9px 11px;
        }

        .eo-summary-label {
          font-size: 10px;
          color: #6b7280;
          margin-bottom: 3px;
        }

        .eo-summary-value {
          font-size: 17px;
          font-weight: 700;
          color: #111827;
        }

        .eo-form-wrapper {
          background: #ffffff;
          border: 1px solid #dfe3e8;
          border-radius: 6px;
          margin-bottom: 10px;
          overflow: hidden;
        }

        .eo-form-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 10px;
          background: #eef0f2;
          border-bottom: 1px solid #dfe3e8;
        }

        .eo-form-header-title {
          font-size: 13px;
          font-weight: 700;
        }

        .eo-form-header-mode {
          font-size: 10px;
          color: #6b7280;
          font-weight: 600;
        }

        .eo-register {
          background: #ffffff;
          border: 1px solid #dfe3e8;
          border-radius: 6px;
          overflow: hidden;
        }

        .eo-register-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 10px;
          background: #eef0f2;
          border-bottom: 1px solid #dfe3e8;
          flex-wrap: wrap;
        }

        .eo-register-title {
          font-size: 13px;
          font-weight: 700;
        }

        .eo-search {
          width: 300px;
          max-width: 100%;
          box-sizing: border-box;
          border: 1px solid #cfd5dc;
          border-radius: 4px;
          padding: 6px 8px;
          font-size: 12px;
          outline: none;
          background: #ffffff;
        }

        .eo-search:focus {
          border-color: #6b7280;
        }

        .eo-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .eo-register-table {
          width: 100%;
          min-width: 1250px;
          border-collapse: collapse;
          font-size: 11px;
        }

        .eo-register-table th {
          padding: 6px 5px;
          text-align: left;
          white-space: nowrap;
          background: #f5f6f7;
          border-bottom: 1px solid #dfe3e8;
          color: #374151;
          font-weight: 700;
        }

        .eo-register-table td {
          padding: 6px 5px;
          border-bottom: 1px solid #edf0f2;
          vertical-align: top;
        }

        .eo-register-table tbody tr:hover {
          background: #fafafa;
        }

        .eo-number {
          font-weight: 700;
          color: #111827;
        }

        .eo-muted {
          color: #6b7280;
        }

        .eo-products {
          min-width: 180px;
          line-height: 1.4;
        }

        .eo-product-line {
          margin-bottom: 2px;
        }

        .eo-product-line:last-child {
          margin-bottom: 0;
        }

        .eo-status {
          display: inline-block;
          padding: 3px 7px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status-draft {
          background: #f3f4f6;
          color: #4b5563;
        }

        .status-confirmed {
          background: #e5e7eb;
          color: #1f2937;
        }

        .status-processing {
          background: #e0e7ff;
          color: #3730a3;
        }

        .status-partial {
          background: #fef3c7;
          color: #92400e;
        }

        .status-shipped {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-completed {
          background: #dcfce7;
          color: #166534;
        }

        .status-cancelled {
          background: #fee2e2;
          color: #991b1b;
        }

        .eo-row-actions {
          display: flex;
          gap: 5px;
          white-space: nowrap;
        }

        .eo-row-btn {
          border: 1px solid #cbd1d8;
          background: #ffffff;
          border-radius: 4px;
          padding: 4px 7px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .eo-row-btn:hover {
          background: #f3f4f6;
        }

        .eo-row-delete {
          color: #b91c1c;
        }

        .eo-empty {
          text-align: center;
          padding: 28px 10px;
          color: #6b7280;
          font-size: 12px;
        }

        .eo-info {
          margin-top: 8px;
          padding: 7px 9px;
          border: 1px solid #e5e7eb;
          border-radius: 5px;
          background: #fafafa;
          color: #6b7280;
          font-size: 10px;
          line-height: 1.4;
        }

        @media (max-width: 800px) {
          .eo-summary-grid {
            grid-template-columns: 1fr;
          }

          .eo-search {
            width: 100%;
          }

          .eo-register-header {
            align-items: stretch;
          }
        }
      `}</style>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="eo-master-header">
        <div>
          <h1 className="eo-master-title">
            Export Order
          </h1>

          <div className="eo-master-subtitle">
            Proforma Invoice → Export Order
            workflow
          </div>
        </div>

        <div className="eo-master-actions">
          <button
            type="button"
            className="eo-master-btn"
            onClick={handleRefresh}
          >
            Refresh
          </button>

          <button
            type="button"
            className="eo-master-btn eo-master-btn-primary"
            onClick={handleNewOrder}
          >
            + New Export Order
          </button>
        </div>
      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="eo-summary-grid">
        <div className="eo-summary-card">
          <div className="eo-summary-label">
            Total Export Orders
          </div>

          <div className="eo-summary-value">
            {totalOrders}
          </div>
        </div>

        <div className="eo-summary-card">
          <div className="eo-summary-label">
            Active Orders
          </div>

          <div className="eo-summary-value">
            {activeOrders}
          </div>
        </div>

        <div className="eo-summary-card">
          <div className="eo-summary-label">
            Total Order Value
          </div>

          <div className="eo-summary-value">
            {totalOrderValue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* =====================================================
          FORM
      ===================================================== */}

      {showForm && (
        <div className="eo-form-wrapper">
          <div className="eo-form-header">
            <div className="eo-form-header-title">
              {editingOrder
                ? `Edit Export Order — ${editingOrder.exportOrderNo}`
                : `New Export Order — ${nextOrderNo}`}
            </div>

            <div className="eo-form-header-mode">
              {editingOrder
                ? "UPDATE MODE"
                : "CREATE MODE"}
            </div>
          </div>

          <ExportOrderForm
            orderNo={
              editingOrder?.exportOrderNo ||
              nextOrderNo
            }
            initialData={
              editingOrder
            }
            onSave={
              handleSaveOrder
            }
            onCancel={
              handleCancelForm
            }
          />
        </div>
      )}

      {/* =====================================================
          REGISTER
      ===================================================== */}

      <div className="eo-register">
        <div className="eo-register-header">
          <div className="eo-register-title">
            Export Order Register
          </div>

          <input
            className="eo-search"
            type="text"
            placeholder="Search Order No., Customer, Proforma, Country..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />
        </div>

        <div className="eo-table-wrap">
          <table className="eo-register-table">
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Date</th>
                <th>Proforma No.</th>
                <th>Quotation No.</th>
                <th>Customer</th>
                <th>Contact Person</th>
                <th>Country</th>
                <th>Products</th>
                <th>Currency</th>
                <th>Order Value</th>
                <th>Incoterm</th>
                <th>Shipment Mode</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="eo-empty"
                  >
                    {search.trim()
                      ? "No Export Order found for this search."
                      : "No Export Order found. Click + New Export Order to create one."}
                  </td>
                </tr>
              ) : (
                filteredOrders.map(
                  (order) => (
                    <tr
                      key={order.id}
                    >
                      <td>
                        <div className="eo-number">
                          {
                            order.exportOrderNo
                          }
                        </div>
                      </td>

                      <td>
                        {formatDate(
                          order.exportOrderDate
                        )}
                      </td>

                      <td>
                        <strong>
                          {
                            order.proformaInvoiceNo
                          }
                        </strong>
                      </td>

                      <td>
                        {
                          order.quotationNo ||
                          "-"
                        }
                      </td>

                      <td>
                        <strong>
                          {
                            order.customerName ||
                            "-"
                          }
                        </strong>

                        {order.customerCode && (
                          <div className="eo-muted">
                            {
                              order.customerCode
                            }
                          </div>
                        )}
                      </td>

                      <td>
                        {
                          order.contactPerson ||
                          "-"
                        }
                      </td>

                      <td>
                        {
                          order.buyerCountry ||
                          order.countryOfDestination ||
                          "-"
                        }
                      </td>

                      <td>
                        <div className="eo-products">
                          {Array.isArray(
                            order.items
                          ) &&
                          order.items.length >
                            0 ? (
                            order.items.map(
                              (
                                item,
                                index
                              ) => (
                                <div
                                  className="eo-product-line"
                                  key={`${order.id}-${index}`}
                                >
                                  <strong>
                                    {
                                      item.productName
                                    }
                                  </strong>
                                  {" — "}
                                  {Number(
                                    item.qty ||
                                      0
                                  ).toFixed(
                                    3
                                  )}{" "}
                                  {
                                    item.unit
                                  }
                                </div>
                              )
                            )
                          ) : (
                            "-"
                          )}
                        </div>
                      </td>

                      <td>
                        {
                          order.currency
                        }
                      </td>

                      <td>
                        {Number(
                          order.totalOrderValue ||
                            0
                        ).toFixed(2)}
                      </td>

                      <td>
                        {
                          order.incoterm
                        }
                      </td>

                      <td>
                        {
                          order.shipmentMode
                        }
                      </td>

                      <td>
                        <span
                          className={`eo-status ${statusClass(
                            order.status
                          )}`}
                        >
                          {
                            order.status
                          }
                        </span>
                      </td>

                      <td>
                        <div className="eo-row-actions">
                          <button
                            type="button"
                            className="eo-row-btn"
                            onClick={() =>
                              handleEditOrder(
                                order
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="eo-row-btn"
                            onClick={() =>
                              handlePrintOrder(
                                order
                              )
                            }
                          >
                            Print
                          </button>

                          <button
                            type="button"
                            className="eo-row-btn eo-row-delete"
                            onClick={() =>
                              handleDeleteOrder(
                                order
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          WORKFLOW NOTE
      ===================================================== */}

      <div className="eo-info">
        <strong>
          Export Workflow:
        </strong>{" "}
        Export Enquiry → Quotation →
        Proforma Invoice → Export Order →
        Stock Reservation → Packing →
        Container Loading → Shipment →
        Commercial Invoice → Export Documents →
        Payment → Completed.
        <br />
        <br />
        <strong>
          Stock Safety:
        </strong>{" "}
        Export Order creation currently
        does not reduce or modify stock.
        Stock reservation will be handled
        in the dedicated Reservation stage.
      </div>
    </div>
  );
}