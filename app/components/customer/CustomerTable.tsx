"use client";

import { useState } from "react";
import { Customer } from "./CustomerTypes";

type CustomerTableProps = {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
};

export default function CustomerTable({
  customers,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter((customer) => {
    const searchText = search.toLowerCase();

    return (
      customer.name.toLowerCase().includes(searchText) ||
      customer.code.toLowerCase().includes(searchText) ||
      customer.contactPerson
        .toLowerCase()
        .includes(searchText) ||
      customer.mobile.includes(searchText) ||
      customer.email.toLowerCase().includes(searchText) ||
      customer.city.toLowerCase().includes(searchText) ||
      customer.gst.toLowerCase().includes(searchText) ||
      customer.pan.toLowerCase().includes(searchText)
    );
  });

  // ==========================================
  // TABLE HEADER STYLE
  // ==========================================

  const thStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    padding: "9px 6px",
    background: "#14532d",
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
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
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
              color: "#14532d",
              fontSize: "18px",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            📋 Customer Register
          </h2>

          <div
            style={{
              marginTop: "5px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            Total Customers:{" "}
            <span
              style={{
                display: "inline-block",
                marginLeft: "4px",
                padding: "3px 8px",
                borderRadius: "5px",
                background: "#dcfce7",
                color: "#166534",
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
          placeholder="🔍 Search Customer / Code / Mobile / GST"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "320px",
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
            <col style={{ width: "7%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "9%" }} />
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
              <th style={thStyle}>Code</th>

              <th style={thStyle}>
                Customer Name
              </th>

              <th style={thStyle}>
                Contact Person
              </th>

              <th style={thStyle}>
                Mobile
              </th>

              <th style={thStyle}>
                Email
              </th>

              <th style={thStyle}>
                City
              </th>

              <th style={thStyle}>
                GST No.
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
                      color: "#14532d",
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

                  {/* EMAIL */}

                  <td
                    style={tdStyle}
                    title={customer.email}
                  >
                    {customer.email || "-"}
                  </td>

                  {/* CITY */}

                  <td
                    style={tdStyle}
                    title={customer.city}
                  >
                    {customer.city || "-"}
                  </td>

                  {/* GST */}

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                    }}
                    title={customer.gst}
                  >
                    {customer.gst || "-"}
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
            👥 No Customers Found
          </div>
        )}
      </div>
    </div>
  );
}