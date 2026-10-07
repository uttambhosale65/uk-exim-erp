"use client";

import { useMemo, useState } from "react";
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
  const [viewCustomer, setViewCustomer] =
    useState<ExportCustomer | null>(null);

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const filteredCustomers = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return customers;

    return customers.filter((customer) => {
      const searchableFields = [
        customer.name,
        customer.code,
        customer.contactPerson,
        customer.mobile,
        customer.email,
        customer.country,
        customer.currency,
        customer.city,
        customer.stateProvince,
        customer.postalCode,
        customer.address,
        customer.taxRegistrationNo,
        customer.paymentTerms,
        customer.status,
        customer.businessRole,
        customer.industry,
        customer.sourceEvent,
        customer.interestedProducts,
        customer.remarks,
      ];

      return searchableFields.some((field) =>
        String(field ?? "")
          .toLowerCase()
          .includes(searchText)
      );
    });
  }, [customers, search]);

  // ==========================================
  // TABLE HEADER STYLE
  // ==========================================

  const thStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    padding: "9px 8px",
    background: "#0F4C81",
    color: "#ffffff",
    textAlign: "center",
    whiteSpace: "nowrap",
    fontSize: "11px",
    fontWeight: 700,
    position: "sticky",
    top: 0,
    zIndex: 5,
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

  // ==========================================
  // BUTTON STYLE
  // ==========================================

  const viewButtonStyle: React.CSSProperties = {
    background: "#0f766e",
    color: "#ffffff",
    border: "none",
    padding: "5px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  const editButtonStyle: React.CSSProperties = {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "5px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  const deleteButtonStyle: React.CSSProperties = {
    background: "#dc2626",
    color: "#ffffff",
    border: "none",
    padding: "5px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  // ==========================================
  // DELETE CONFIRMATION
  // ==========================================

  const handleDelete = (customer: ExportCustomer) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${customer.name}"?`
    );

    if (confirmed) {
      onDelete(customer.id);
    }
  };

  // ==========================================
  // PROFILE FIELD
  // ==========================================

  const profileField = (
    label: string,
    value: string | undefined | null,
    fullWidth = false
  ) => {
    return (
      <div
        style={{
          gridColumn: fullWidth ? "1 / -1" : undefined,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: "#0F4C81",
            textTransform: "uppercase",
            letterSpacing: "0.25px",
            marginBottom: "3px",
          }}
        >
          {label}
        </div>

        <div
          style={{
            minHeight: "23px",
            padding: "4px 6px",
            boxSizing: "border-box",
            border: "1px solid #d6dce3",
            borderRadius: "3px",
            background: "#fafbfc",
            color: value ? "#1f2937" : "#9ca3af",
            fontSize: "9.5px",
            lineHeight: "1.25",
            whiteSpace: fullWidth ? "pre-wrap" : "nowrap",
            overflow: "hidden",
            textOverflow: fullWidth ? "clip" : "ellipsis",
            wordBreak: fullWidth ? "break-word" : "normal",
          }}
          title={value || ""}
        >
          {value || "-"}
        </div>
      </div>
    );
  };

  // ==========================================
  // PROFILE SECTION TITLE
  // ==========================================

  const profileSectionTitle = (title: string) => (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 800,
        color: "#0F4C81",
        borderBottom: "1px solid #bfdbfe",
        paddingBottom: "4px",
        marginBottom: "7px",
        textTransform: "uppercase",
        letterSpacing: "0.3px",
      }}
    >
      {title}
    </div>
  );

  // ==========================================
  // REGISTER
  // ==========================================

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
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
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

            {search.trim() !== "" && (
              <span style={{ marginLeft: "6px" }}>
                of {customers.length}
              </span>
            )}
          </div>
        </div>

        {/* SEARCH */}

        <input
          type="text"
          placeholder="🔍 Search Customer / Role / Industry / Country"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "340px",
            maxWidth: "100%",
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
          TABLE
      =========================================== */}

      <div
        style={{
          width: "100%",
          overflowX: "auto",
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
            minWidth: "1550px",
            tableLayout: "fixed",
            borderCollapse: "collapse",
            background: "#ffffff",
          }}
        >
          <colgroup>
            <col style={{ width: "100px" }} />
            <col style={{ width: "180px" }} />
            <col style={{ width: "155px" }} />
            <col style={{ width: "155px" }} />
            <col style={{ width: "150px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "140px" }} />
            <col style={{ width: "125px" }} />
            <col style={{ width: "130px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "245px" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Customer Name</th>
              <th style={thStyle}>Business Role</th>
              <th style={thStyle}>Industry</th>
              <th style={thStyle}>Contact Person</th>
              <th style={thStyle}>Country</th>
              <th style={thStyle}>Currency</th>
              <th style={thStyle}>Mobile</th>
              <th style={thStyle}>Payment Terms</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredCustomers.map((customer, index) => (
              <tr
                key={customer.id}
                style={{
                  background:
                    index % 2 === 0 ? "#ffffff" : "#f9fafb",
                }}
              >
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

                <td
                  style={{ ...tdStyle, fontWeight: 600 }}
                  title={customer.name}
                >
                  {customer.name}
                </td>

                <td
                  style={tdStyle}
                  title={customer.businessRole || ""}
                >
                  {customer.businessRole || "-"}
                </td>

                <td
                  style={tdStyle}
                  title={customer.industry || ""}
                >
                  {customer.industry || "-"}
                </td>

                <td
                  style={tdStyle}
                  title={customer.contactPerson || ""}
                >
                  {customer.contactPerson || "-"}
                </td>

                <td
                  style={tdStyle}
                  title={customer.country}
                >
                  {customer.country || "-"}
                </td>

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

                <td
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                  }}
                  title={customer.mobile}
                >
                  {customer.mobile || "-"}
                </td>

                <td
                  style={tdStyle}
                  title={customer.paymentTerms}
                >
                  {customer.paymentTerms || "-"}
                </td>

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
                        customer.status === "Active"
                          ? "#dcfce7"
                          : "#fee2e2",
                      color:
                        customer.status === "Active"
                          ? "#15803d"
                          : "#b91c1c",
                    }}
                  >
                    {customer.status}
                  </span>
                </td>

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
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "5px",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* VIEW */}

                    <button
                      type="button"
                      onClick={() => setViewCustomer(customer)}
                      style={viewButtonStyle}
                      title="View full customer profile"
                    >
                      👁 View
                    </button>

                    {/* EDIT */}

                    <button
                      type="button"
                      onClick={() => onEdit(customer)}
                      style={editButtonStyle}
                      title="Edit customer"
                    >
                      ✏️ Edit
                    </button>

                    {/* DELETE */}

                    <button
                      type="button"
                      onClick={() => handleDelete(customer)}
                      style={deleteButtonStyle}
                      title="Delete customer"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCustomers.length === 0 && (
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

      {/* =====================================================
          CUSTOMER PROFILE - PRINT PREVIEW STYLE
      ===================================================== */}

      {viewCustomer && (
        <div
          onClick={() => setViewCustomer(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.58)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "18px",
            zIndex: 9999,
            boxSizing: "border-box",
          }}
        >
          {/* ================================================
              PRINT PREVIEW PAGE
          ================================================= */}

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "1000px",
              maxWidth: "calc(100vw - 36px)",
              background: "#ffffff",
              borderRadius: "4px",
              boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {/* ============================================
                PROFILE HEADER
            ============================================= */}

            <div
              style={{
                background: "#0F4C81",
                color: "#ffffff",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "15px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "5px",
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  🌍
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.7px",
                      opacity: 0.85,
                      marginBottom: "2px",
                    }}
                  >
                    EXPORT CUSTOMER PROFILE
                  </div>

                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      lineHeight: "1.2",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={viewCustomer.name}
                  >
                    {viewCustomer.name}
                  </div>

                  <div
                    style={{
                      marginTop: "3px",
                      fontSize: "10px",
                      opacity: 0.9,
                    }}
                  >
                    Customer Code:{" "}
                    <strong>{viewCustomer.code}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewCustomer(null)}
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  border:
                    "1px solid rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: "18px",
                  lineHeight: "1",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
                title="Close profile"
              >
                ×
              </button>
            </div>

            {/* ============================================
                PROFILE BODY
            ============================================= */}

            <div
              style={{
                padding: "14px 18px",
                boxSizing: "border-box",
              }}
            >
              {/* BASIC INFORMATION */}

              {profileSectionTitle("Basic Information")}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap: "5px",
                  marginBottom: "11px",
                }}
              >
                {profileField(
                  "Company Name",
                  viewCustomer.name
                )}

                {profileField(
                  "Contact Person",
                  viewCustomer.contactPerson
                )}

                {profileField(
                  "Business Role",
                  viewCustomer.businessRole
                )}

                {profileField(
                  "Industry",
                  viewCustomer.industry
                )}

                {profileField(
                  "Country",
                  viewCustomer.country
                )}

                {profileField(
                  "Currency",
                  viewCustomer.currency
                )}
              </div>

              {/* CONTACT & LOCATION */}

              {profileSectionTitle(
                "Contact & Location"
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap: "8px",
                  marginBottom: "11px",
                }}
              >
                {profileField(
                  "Mobile",
                  viewCustomer.mobile
                )}

                {profileField(
                  "Email",
                  viewCustomer.email
                )}

                {profileField(
                  "City",
                  viewCustomer.city
                )}

                {profileField(
                  "State / Province",
                  viewCustomer.stateProvince
                )}

                {profileField(
                  "Postal Code",
                  viewCustomer.postalCode
                )}

                {profileField(
                  "Tax / Registration No.",
                  viewCustomer.taxRegistrationNo
                )}
              </div>

              {/* ADDRESS */}

              <div
                style={{
                  marginBottom: "11px",
                }}
              >
                {profileField(
                  "Address",
                  viewCustomer.address,
                  true
                )}
              </div>

              {/* BUSINESS DETAILS */}

              {profileSectionTitle(
                "Business Details"
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap: "8px",
                  marginBottom: "11px",
                }}
              >
                {profileField(
                  "Source / Event",
                  viewCustomer.sourceEvent
                )}

                {profileField(
                  "Payment Terms",
                  viewCustomer.paymentTerms
                )}

                {profileField(
                  "Status",
                  viewCustomer.status
                )}
              </div>

              {/* INTERESTED PRODUCTS */}

              <div
                style={{
                  marginBottom: "11px",
                }}
              >
                {profileField(
                  "Interested Products",
                  viewCustomer.interestedProducts,
                  true
                )}
              </div>

              {/* REMARKS */}

              {profileField(
                "Remarks",
                viewCustomer.remarks,
                true
              )}
            </div>

            {/* ============================================
                PROFILE FOOTER
            ============================================= */}

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                padding: "9px 18px",
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: "7px",
                background: "#f8fafc",
                boxSizing: "border-box",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const customer = viewCustomer;
                  setViewCustomer(null);
                  onEdit(customer);
                }}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  padding: "7px 13px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                ✏️ Edit Customer
              </button>

              <button
                type="button"
                onClick={() => setViewCustomer(null)}
                style={{
                  background: "#374151",
                  color: "#ffffff",
                  border: "none",
                  padding: "7px 13px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}