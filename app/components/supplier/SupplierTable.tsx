"use client";

import { useState } from "react";
import { Supplier } from "./SupplierTypes";

type SupplierTableProps = {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
};

export default function SupplierTable({
  suppliers,
  onEdit,
  onDelete,
}: SupplierTableProps) {
  const [search, setSearch] = useState("");

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      supplier.code
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      supplier.contactPerson
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      supplier.mobile.includes(search) ||
      supplier.city
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      supplier.gst
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  /* ================================
     TABLE STYLES
  ================================= */

  const thStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    padding: "9px 10px",
    background: "#14532d",
    color: "#ffffff",
    textAlign: "center",
    whiteSpace: "nowrap",
    fontSize: "12px",
    fontWeight: 700,
  };

  const tdStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    padding: "8px 10px",
    whiteSpace: "nowrap",
    fontSize: "12px",
    color: "#1f2937",
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
      }}
    >
      {/* =================================
          REGISTER HEADER
      ================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          marginBottom: "12px",
        }}
      >
        {/* TITLE */}

        <div>
          <h2
            style={{
              color: "#14532d",
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            🚚 Supplier Register
          </h2>

          <div
            style={{
              marginTop: "3px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            Total Suppliers:{" "}
            <strong>
              {filteredSuppliers.length}
            </strong>
          </div>
        </div>

        {/* SEARCH */}

        <input
          type="text"
          placeholder="🔍 Search Supplier / Code / Mobile / GST"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            width: "320px",
            maxWidth: "100%",
            height: "38px",
            padding: "0 10px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* =================================
          TABLE CONTAINER
      ================================== */}

      <div
        style={{
          width: "100%",
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: "55vh",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: "900px",
            borderCollapse: "collapse",
            background: "#ffffff",
          }}
        >
          {/* =================================
              HEADER
          ================================== */}

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
                Supplier Name
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

          {/* =================================
              BODY
          ================================== */}

          <tbody>
            {filteredSuppliers.map(
              (supplier, index) => {
                return (
                  <tr
                    key={supplier.id}
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
                        fontWeight: 700,
                        color: "#14532d",
                        textAlign: "center",
                      }}
                    >
                      {supplier.code}
                    </td>

                    {/* SUPPLIER NAME */}

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 600,
                      }}
                    >
                      {supplier.name}
                    </td>

                    {/* CONTACT PERSON */}

                    <td style={tdStyle}>
                      {supplier.contactPerson}
                    </td>

                    {/* MOBILE */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                      }}
                    >
                      {supplier.mobile}
                    </td>

                    {/* EMAIL */}

                    <td style={tdStyle}>
                      {supplier.email || "-"}
                    </td>

                    {/* CITY */}

                    <td style={tdStyle}>
                      {supplier.city}
                    </td>

                    {/* GST */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                      }}
                    >
                      {supplier.gst || "-"}
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
                          display:
                            "inline-block",
                          padding:
                            "4px 9px",
                          borderRadius:
                            "15px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background:
                            supplier.status ===
                            "Active"
                              ? "#dcfce7"
                              : "#fee2e2",
                          color:
                            supplier.status ===
                            "Active"
                              ? "#15803d"
                              : "#b91c1c",
                        }}
                      >
                        {supplier.status}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                      }}
                    >
                      {/* EDIT */}

                      <button
                        type="button"
                        onClick={() =>
                          onEdit(supplier)
                        }
                        style={{
                          background:
                            "#2563eb",
                          color:
                            "#ffffff",
                          border: "none",
                          padding:
                            "6px 10px",
                          borderRadius:
                            "5px",
                          cursor:
                            "pointer",
                          fontSize:
                            "11px",
                          fontWeight: 600,
                          marginRight:
                            "6px",
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
                              `Are you sure you want to delete "${supplier.name}"?`
                            )
                          ) {
                            onDelete(
                              supplier.id
                            );
                          }
                        }}
                        style={{
                          background:
                            "#dc2626",
                          color:
                            "#ffffff",
                          border: "none",
                          padding:
                            "6px 10px",
                          borderRadius:
                            "5px",
                          cursor:
                            "pointer",
                          fontSize:
                            "11px",
                          fontWeight: 600,
                        }}
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>

        {/* =================================
            NO DATA
        ================================== */}

        {filteredSuppliers.length ===
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
            🚚 No Suppliers Found
          </div>
        )}
      </div>
    </div>
  );
}