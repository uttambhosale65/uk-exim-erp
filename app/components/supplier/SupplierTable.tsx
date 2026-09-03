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

  const thStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    padding: "7px 4px",
    background: "#14532d",
    color: "#ffffff",
    textAlign: "center",
    whiteSpace: "normal",
    wordBreak: "break-word",
    fontSize: "10px",
    fontWeight: 700,
    lineHeight: "13px",
    overflow: "hidden",
    boxSizing: "border-box",
  };

  const tdStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    padding: "6px 4px",
    fontSize: "10px",
    color: "#1f2937",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        marginTop: "20px",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        background: "#ffffff",
        padding: "15px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      {/* REGISTER HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          marginBottom: "12px",
          width: "100%",
          minWidth: 0,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: "1 1 220px",
          }}
        >
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
            flex: "0 1 320px",
            height: "36px",
            padding: "0 10px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "12px",
            outline: "none",
            boxSizing: "border-box",
            minWidth: 0,
          }}
        />
      </div>

      {/* TABLE CONTAINER */}

      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
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
            maxWidth: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
            background: "#ffffff",
          }}
        >
          <colgroup>
            <col style={{ width: "8%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "9%" }} />
          </colgroup>

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

          <tbody>
            {filteredSuppliers.map(
              (supplier, index) => (
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
                    title={supplier.code}
                  >
                    {supplier.code}
                  </td>

                  {/* SUPPLIER NAME */}

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                    }}
                    title={supplier.name}
                  >
                    {supplier.name}
                  </td>

                  {/* CONTACT PERSON */}

                  <td
                    style={tdStyle}
                    title={supplier.contactPerson}
                  >
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

                  <td
                    style={tdStyle}
                    title={supplier.email || "-"}
                  >
                    {supplier.email || "-"}
                  </td>

                  {/* CITY */}

                  <td
                    style={tdStyle}
                    title={supplier.city}
                  >
                    {supplier.city}
                  </td>

                  {/* GST */}

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                    }}
                    title={supplier.gst || "-"}
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
                        display: "inline-block",
                        maxWidth: "100%",
                        padding: "3px 6px",
                        borderRadius: "15px",
                        fontSize: "9px",
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        boxSizing: "border-box",
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
                      whiteSpace: "nowrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onEdit(supplier)
                      }
                      style={{
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        padding: "4px 5px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "9px",
                        fontWeight: 600,
                        marginRight: "2px",
                        minWidth: "24px",
                      }}
                      title="Edit"
                    >
                      ✏️
                    </button>

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
                        background: "#dc2626",
                        color: "#ffffff",
                        border: "none",
                        padding: "4px 5px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "9px",
                        fontWeight: 600,
                        minWidth: "24px",
                      }}
                      title="Delete"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {/* NO DATA */}

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