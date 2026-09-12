"use client";

import { useMemo, useState } from "react";
import { ExportEnquiry } from "./ExportEnquiryTypes";

type ExportEnquiryTableProps = {
  enquiries: ExportEnquiry[];
  onEdit: (enquiry: ExportEnquiry) => void;
  onDelete: (id: string) => void;
};

function formatDate(value: string): string {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getStatusStyle(
  status: ExportEnquiry["status"]
): React.CSSProperties {
  switch (status) {
    case "Won":
      return {
        background: "#dcfce7",
        color: "#166534",
      };

    case "Lost":
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };

    case "Cancelled":
      return {
        background: "#f1f5f9",
        color: "#475569",
      };

    case "Quoted":
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
      };

    case "Under Discussion":
      return {
        background: "#fef3c7",
        color: "#92400e",
      };

    case "Open":
    default:
      return {
        background: "#e0f2fe",
        color: "#075985",
      };
  }
}

export default function ExportEnquiryTable({
  enquiries,
  onEdit,
  onDelete,
}: ExportEnquiryTableProps) {
  const [search, setSearch] = useState("");

  const filteredEnquiries = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    const result = enquiries.filter((enquiry) => {
      if (!searchText) return true;

      return [
        enquiry.enquiryNo,
        enquiry.enquiryDate,
        enquiry.customerCode,
        enquiry.customerName,
        enquiry.country,
        enquiry.contactPerson,
        enquiry.currency,
        enquiry.incoterm,
        enquiry.status,
        enquiry.remarks,
        ...enquiry.items.flatMap((item) => [
          item.productCode,
          item.productName,
          item.unit,
          item.customerRequirement,
          String(item.qty),
        ]),
      ].some((value) =>
        String(value)
          .toLowerCase()
          .includes(searchText)
      );
    });

    return result;
  }, [enquiries, search]);

  function handleDelete(
    enquiry: ExportEnquiry
  ) {
    const confirmed = window.confirm(
      `Delete ${enquiry.enquiryNo}?\n\nCustomer: ${enquiry.customerName}`
    );

    if (!confirmed) return;

    onDelete(enquiry.id);
  }

  return (
    <div
      style={{
        marginTop: 18,
        background: "#ffffff",
        border: "1px solid #d9dee7",
        borderRadius: 8,
        boxShadow:
          "0 1px 3px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
      {/* REGISTER HEADER */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom:
            "1px solid #e5e7eb",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Export Enquiry Register
          </h3>

          <div
            style={{
              marginTop: 3,
              fontSize: 12,
              color: "#64748b",
            }}
          >
            Total Enquiries:{" "}
            {enquiries.length}
          </div>
        </div>

        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search Enquiry..."
          style={{
            width: 280,
            height: 34,
            padding: "0 10px",
            border:
              "1px solid #cbd5e1",
            borderRadius: 5,
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* EMPTY STATE */}
      {filteredEnquiries.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: "#64748b",
            fontSize: 13,
          }}
        >
          {enquiries.length === 0
            ? "No Export Enquiries Found"
            : "No Enquiries Match Your Search"}
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
              fontSize: 12,
              minWidth: 1150,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                }}
              >
                <th style={thStyle}>
                  Enquiry No.
                </th>

                <th style={thStyle}>
                  Date
                </th>

                <th style={thStyle}>
                  Customer
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
                  Products
                </th>

                <th style={thStyle}>
                  Incoterm
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
              {filteredEnquiries.map(
                (enquiry) => (
                  <tr key={enquiry.id}>
                    {/* ENQUIRY NO */}
                    <td style={tdStyle}>
                      <strong>
                        {enquiry.enquiryNo}
                      </strong>
                    </td>

                    {/* DATE */}
                    <td style={tdStyle}>
                      {formatDate(
                        enquiry.enquiryDate
                      )}
                    </td>

                    {/* CUSTOMER */}
                    <td style={tdStyle}>
                      <div
                        style={{
                          fontWeight: 600,
                          color:
                            "#1e293b",
                        }}
                      >
                        {
                          enquiry.customerName
                        }
                      </div>

                      {enquiry.customerCode && (
                        <div
                          style={{
                            marginTop: 2,
                            fontSize: 11,
                            color:
                              "#64748b",
                          }}
                        >
                          {
                            enquiry.customerCode
                          }
                        </div>
                      )}
                    </td>

                    {/* CONTACT */}
                    <td style={tdStyle}>
                      {enquiry.contactPerson ||
                        "-"}
                    </td>

                    {/* COUNTRY */}
                    <td style={tdStyle}>
                      {enquiry.country ||
                        "-"}
                    </td>

                    {/* CURRENCY */}
                    <td style={tdStyle}>
                      {enquiry.currency ||
                        "-"}
                    </td>

                    {/* PRODUCTS */}
                    <td
                      style={{
                        ...tdStyle,
                        whiteSpace:
                          "normal",
                        minWidth: 230,
                        maxWidth: 330,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection:
                            "column",
                          gap: 5,
                        }}
                      >
                        {enquiry.items.map(
                          (
                            item,
                            index
                          ) => (
                            <div
                              key={`${enquiry.id}-product-${index}`}
                              style={{
                                padding:
                                  "4px 6px",
                                background:
                                  "#f8fafc",
                                border:
                                  "1px solid #e2e8f0",
                                borderRadius:
                                  4,
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  color:
                                    "#1e293b",
                                }}
                              >
                                {item.productName ||
                                  "-"}
                              </div>

                              <div
                                style={{
                                  marginTop: 2,
                                  fontSize: 11,
                                  color:
                                    "#64748b",
                                }}
                              >
                                {item.productCode
                                  ? `${item.productCode} • `
                                  : ""}
                                {item.qty}{" "}
                                {item.unit}
                              </div>

                              {item.customerRequirement && (
                                <div
                                  style={{
                                    marginTop: 2,
                                    fontSize: 11,
                                    color:
                                      "#475569",
                                  }}
                                >
                                  Requirement:{" "}
                                  {
                                    item.customerRequirement
                                  }
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </td>

                    {/* INCOTERM */}
                    <td style={tdStyle}>
                      {enquiry.incoterm ||
                        "-"}
                    </td>

                    {/* STATUS */}
                    <td style={tdStyle}>
                      <span
                        style={{
                          display:
                            "inline-block",
                          padding:
                            "4px 8px",
                          borderRadius:
                            12,
                          fontSize: 11,
                          fontWeight: 600,
                          whiteSpace:
                            "nowrap",
                          ...getStatusStyle(
                            enquiry.status
                          ),
                        }}
                      >
                        {enquiry.status}
                      </span>
                    </td>

                    {/* ACTION */}
                    <td style={tdStyle}>
                      <div
                        style={{
                          display:
                            "flex",
                          gap: 6,
                          alignItems:
                            "center",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onEdit(
                              enquiry
                            )
                          }
                          style={
                            editButtonStyle
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              enquiry
                            )
                          }
                          style={
                            deleteButtonStyle
                          }
                        >
                          Delete
                        </button>

                        <button
                          type="button"
                          disabled
                          title="Quotation will be enabled after Export Quotation module is created."
                          style={
                            quotationButtonStyle
                          }
                        >
                          Quotation
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* FOOTER */}
      {filteredEnquiries.length > 0 && (
        <div
          style={{
            padding:
              "9px 14px",
            borderTop:
              "1px solid #e5e7eb",
            fontSize: 12,
            color: "#64748b",
            background: "#fafafa",
          }}
        >
          Showing{" "}
          {filteredEnquiries.length}{" "}
          of {enquiries.length}{" "}
          enquiries
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "9px 8px",
  borderBottom:
    "1px solid #d9dee7",
  textAlign: "left",
  fontWeight: 700,
  color: "#334155",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "9px 8px",
  borderBottom:
    "1px solid #eef2f7",
  color: "#334155",
  verticalAlign:
    "middle",
  whiteSpace:
    "nowrap",
};

const editButtonStyle: React.CSSProperties = {
  height: 28,
  padding: "0 9px",
  border:
    "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const deleteButtonStyle: React.CSSProperties = {
  height: 28,
  padding: "0 9px",
  border:
    "1px solid #fecaca",
  background: "#fff1f2",
  color: "#dc2626",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const quotationButtonStyle: React.CSSProperties = {
  height: 28,
  padding: "0 9px",
  border:
    "1px solid #d1d5db",
  background: "#f3f4f6",
  color: "#9ca3af",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  cursor: "not-allowed",
};