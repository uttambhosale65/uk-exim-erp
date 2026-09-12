"use client";

import { useState } from "react";
import { ExportCustomer } from "./ExportCustomerTypes";

type ExportCustomerTableProps = {
  customers: ExportCustomer[];
  onEdit: (customer: ExportCustomer) => void;
  onDelete: (id: string) => void;
};

export default function ExportCustomerTable({
  customers,
  onEdit,
  onDelete,
}: ExportCustomerTableProps) {
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter(
    (customer) => {
      const searchText = search
        .toLowerCase()
        .trim();

      return (
        customer.name
          .toLowerCase()
          .includes(searchText) ||
        customer.code
          .toLowerCase()
          .includes(searchText) ||
        customer.contactPerson
          .toLowerCase()
          .includes(searchText) ||
        customer.mobile
          .toLowerCase()
          .includes(searchText) ||
        customer.email
          .toLowerCase()
          .includes(searchText) ||
        customer.country
          .toLowerCase()
          .includes(searchText) ||
        customer.currency
          .toLowerCase()
          .includes(searchText) ||
        customer.city
          .toLowerCase()
          .includes(searchText) ||
        customer.taxRegistrationNo
          .toLowerCase()
          .includes(searchText)
      );
    }
  );

  // ==========================================
  // TABLE HEADER STYLE
  // ==========================================

  const thStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    padding: "9px 6px",
    background: "#0F4C81",
    color: "#ffffff",
    textAlign: "center",
    whiteSpace: "nowrap",
    fontSize: "11px",
    fontWeight: 700,
    overflow: "hidden",
  };

  // ==========================================
  // TABLE CELL STYLE
  // ==========================================

  const tdStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    padding: "8px 7px",
    fontSize: "11px",
    color: "#1f2937",
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        marginTop: "20px",
        background: "#ffffff",
        padding: "15px",
        borderRadius: "10px",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.12)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ==========================================
          REGISTER HEADER
      =========================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "14px",
          width: "100%",
        }}
      >
        {/* TITLE */}

        <div
          style={{
            minWidth: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#0F4C81",
              fontSize: "18px",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            🌍 Export Customer Register
          </h2>

          <div
            style={{
              marginTop: "5px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            Total Export Customers:{" "}
            <span
              style={{
                display: "inline-block",
                marginLeft: "4px",
                padding: "3px 8px",
                borderRadius: "5px",
                background: "#dbeafe",
                color: "#1d4ed8",
                fontWeight: 700,
              }}
            >
              {filteredCustomers.length}
            </span>
          </div>
        </div>

        {/* SEARCH */}

        <input
          type="text"
          placeholder="🔍 Search Customer / Code / Country / Mobile"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            width: "340px",
            maxWidth: "40%",
            minWidth: "220px",
            height: "38px",
            padding: "0 10px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "12px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* ==========================================
          TABLE CONTAINER
      =========================================== */}

      <div
        style={{
          width: "100%",
          overflowX: "hidden",
          overflowY: "auto",
          maxHeight: "55vh",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          boxSizing: "border-box",
        }}
      >
        <table
          style={{
            width: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
            background: "#ffffff",
          }}
        >
          {/* ======================================
              FIXED COLUMN WIDTHS
          ======================================= */}

          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "13%" }} />
          </colgroup>

          {/* ======================================
              TABLE HEADER
          ======================================= */}

          <thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 5,
            }}
          >
            <tr>
              <th style={thStyle}>
                Code
              </th>

              <th style={thStyle}>
                Customer Name
              </th>

              <th style={thStyle}>
                Contact Person
              </th>

              <th style={thStyle}>
                Country
              </th>

              <th style={thStyle}>
                Currency
              </th>

              <th style={thStyle}>
                Mobile
              </th>

              <th style={thStyle}>
                Payment Terms
              </th>

              <th style={thStyle}>
                Status
              </th>

              <th style={thStyle}>
                Action
              </th>
            </tr>
          </thead>

          {/* ======================================
              TABLE BODY
          ======================================= */}

          <tbody>
            {filteredCustomers.map(
              (customer, index) => (
                <tr
                  key={customer.id}
                  style={{
                    background:
                      index % 2 === 0
                        ? "#ffffff"
                        : "#f9fafb",
                  }}
                >
                  {/* CODE */}

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#0F4C81",
                    }}
                    title={customer.code}
                  >
                    {customer.code}
                  </td>

                  {/* CUSTOMER NAME */}

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                    }}
                    title={customer.name}
                  >
                    {customer.name}
                  </td>

                  {/* CONTACT PERSON */}

                  <td
                    style={tdStyle}
                    title={
                      customer.contactPerson
                    }
                  >
                    {customer.contactPerson ||
                      "-"}
                  </td>

                  {/* COUNTRY */}

                  <td
                    style={tdStyle}
                    title={customer.country}
                  >
                    {customer.country || "-"}
                  </td>

                  {/* CURRENCY */}

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                    title={customer.currency}
                  >
                    {customer.currency || "-"}
                  </td>

                  {/* MOBILE */}

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                    }}
                    title={customer.mobile}
                  >
                    {customer.mobile || "-"}
                  </td>

                  {/* PAYMENT TERMS */}

                  <td
                    style={tdStyle}
                    title={customer.paymentTerms}
                  >
                    {customer.paymentTerms ||
                      "-"}
                  </td>

                  {/* STATUS */}

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 7px",
                        borderRadius: "15px",
                        fontSize: "10px",
                        fontWeight: 700,
                        background:
                          customer.status ===
                          "Active"
                            ? "#dcfce7"
                            : "#fee2e2",
                        color:
                          customer.status ===
                          "Active"
                            ? "#15803d"
                            : "#b91c1c",
                      }}
                    >
                      {customer.status}
                    </span>
                  </td>

                  {/* ACTION */}

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      whiteSpace: "normal",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "center",
                        alignItems: "center",
                        gap: "4px",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* EDIT */}

                      <button
                        type="button"
                        onClick={() =>
                          onEdit(customer)
                        }
                        style={{
                          background:
                            "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          padding:
                            "5px 7px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "10px",
                          fontWeight: 600,
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        ✏️ Edit
                      </button>

                      {/* DELETE */}

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to delete "${customer.name}"?`
                            )
                          ) {
                            onDelete(
                              customer.id
                            );
                          }
                        }}
                        style={{
                          background:
                            "#dc2626",
                          color: "#ffffff",
                          border: "none",
                          padding:
                            "5px 7px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "10px",
                          fontWeight: 600,
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {/* ======================================
            NO DATA
        ======================================= */}

        {filteredCustomers.length ===
          0 && (
          <div
            style={{
              textAlign: "center",
              padding: "30px",
              color: "#6b7280",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            🌍 No Export Customers Found
          </div>
        )}
      </div>
    </div>
  );
}