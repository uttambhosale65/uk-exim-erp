"use client";

import { useEffect, useState } from "react";
import {
  ExportEnquiry,
  ExportEnquiryItem,
} from "./ExportEnquiryTypes";
import { ExportCustomer } from "../customer/ExportCustomerTypes";
import { loadExportCustomers } from "../customer/ExportCustomerStorage";
import { Product } from "../../../product/components/ProductTypes";
import { loadProducts } from "../../../product/components/ProductStorage";

type ExportEnquiryFormProps = {
  enquiries: ExportEnquiry[];
  editingEnquiry: ExportEnquiry | null;
  onSave: (enquiry: ExportEnquiry) => void;
  onReset: () => void;
};

const emptyItem: ExportEnquiryItem = {
  productCode: "",
  productName: "",
  qty: 0,
  unit: "KG",
  customerRequirement: "",
};

function getTodayISO(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(value: string): string {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateForStorage(value: string): string {
  const parts = value.split("/");

  if (parts.length !== 3) return "";

  const [day, month, year] = parts;

  if (
    day.length !== 2 ||
    month.length !== 2 ||
    year.length !== 4
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function isValidDateDisplay(value: string): boolean {
  if (!value) return false;

  const parts = value.split("/");

  if (parts.length !== 3) return false;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    return false;
  }

  if (year < 2000 || year > 2100) return false;

  if (month < 1 || month > 12) return false;

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function createEmptyEnquiry(
  enquiryNo: string
): ExportEnquiry {
  const today = getTodayISO();

  return {
    id: crypto.randomUUID(),
    enquiryNo,
    enquiryDate: today,
    customerCode: "",
    customerName: "",
    country: "",
    contactPerson: "",
    currency: "USD",
    items: [{ ...emptyItem }],
    requiredDeliveryDate: "",
    incoterm: "FOB",
    remarks: "",
    status: "Open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getNextEnquiryNo(
  enquiries: ExportEnquiry[]
): string {
  if (enquiries.length === 0) {
    return "EXP-ENQ-0001";
  }

  const maxNumber = Math.max(
    ...enquiries.map((enquiry) => {
      const match = enquiry.enquiryNo.match(
        /EXP-ENQ-(\d+)/
      );

      return match ? Number(match[1]) : 0;
    })
  );

  return `EXP-ENQ-${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}

export default function ExportEnquiryForm({
  enquiries,
  editingEnquiry,
  onSave,
  onReset,
}: ExportEnquiryFormProps) {
  const [customers, setCustomers] = useState<
    ExportCustomer[]
  >([]);

  const [products, setProducts] = useState<
    Product[]
  >([]);

  const [enquiry, setEnquiry] =
    useState<ExportEnquiry>(() =>
      createEmptyEnquiry(
        getNextEnquiryNo(enquiries)
      )
    );

  const [enquiryDateDisplay, setEnquiryDateDisplay] =
    useState("");

  const [
    deliveryDateDisplay,
    setDeliveryDateDisplay,
  ] = useState("");

  useEffect(() => {
    setCustomers(loadExportCustomers());
    setProducts(
      loadProducts().filter(
        (product) => product.active
      )
    );
  }, []);

  useEffect(() => {
    if (editingEnquiry) {
      setEnquiry({
        ...editingEnquiry,
        items:
          editingEnquiry.items.length > 0
            ? editingEnquiry.items.map((item) => ({
                ...item,
              }))
            : [{ ...emptyItem }],
      });

      setEnquiryDateDisplay(
        formatDateForDisplay(
          editingEnquiry.enquiryDate
        )
      );

      setDeliveryDateDisplay(
        formatDateForDisplay(
          editingEnquiry.requiredDeliveryDate
        )
      );

      return;
    }

    const newEnquiry = createEmptyEnquiry(
      getNextEnquiryNo(enquiries)
    );

    setEnquiry(newEnquiry);

    setEnquiryDateDisplay(
      formatDateForDisplay(
        newEnquiry.enquiryDate
      )
    );

    setDeliveryDateDisplay("");
  }, [editingEnquiry, enquiries]);

  function handleCustomerChange(
    customerCode: string
  ) {
    const customer = customers.find(
      (item) => item.code === customerCode
    );

    if (!customer) {
      setEnquiry((prev) => ({
        ...prev,
        customerCode: "",
        customerName: "",
        country: "",
        contactPerson: "",
        currency: "USD",
      }));

      return;
    }

    setEnquiry((prev) => ({
      ...prev,
      customerCode: customer.code,
      customerName: customer.name,
      country: customer.country,
      contactPerson: customer.contactPerson,
      currency: customer.currency,
    }));
  }

  function handleProductChange(
    index: number,
    productCode: string
  ) {
    const product = products.find(
      (item) => item.code === productCode
    );

    setEnquiry((prev) => {
      const items = [...prev.items];

      if (!product) {
        items[index] = {
          ...items[index],
          productCode: "",
          productName: "",
          unit: "KG",
        };

        return {
          ...prev,
          items,
        };
      }

      items[index] = {
        ...items[index],
        productCode: product.code,
        productName: product.name,
        unit: product.unit,
      };

      return {
        ...prev,
        items,
      };
    });
  }

  function handleItemChange(
    index: number,
    field: keyof ExportEnquiryItem,
    value: string | number
  ) {
    setEnquiry((prev) => {
      const items = [...prev.items];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      return {
        ...prev,
        items,
      };
    });
  }

  function addItem() {
    setEnquiry((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { ...emptyItem },
      ],
    }));
  }

  function removeItem(index: number) {
    setEnquiry((prev) => {
      if (prev.items.length === 1) {
        return prev;
      }

      return {
        ...prev,
        items: prev.items.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),
      };
    });
  }

  function handleEnquiryDateChange(
    value: string
  ) {
    setEnquiryDateDisplay(value);

    if (isValidDateDisplay(value)) {
      setEnquiry((prev) => ({
        ...prev,
        enquiryDate:
          formatDateForStorage(value),
      }));
    }
  }

  function handleDeliveryDateChange(
    value: string
  ) {
    setDeliveryDateDisplay(value);

    if (!value) {
      setEnquiry((prev) => ({
        ...prev,
        requiredDeliveryDate: "",
      }));

      return;
    }

    if (isValidDateDisplay(value)) {
      setEnquiry((prev) => ({
        ...prev,
        requiredDeliveryDate:
          formatDateForStorage(value),
      }));
    }
  }

  function handleEnquiryDatePicker(
    value: string
  ) {
    setEnquiry((prev) => ({
      ...prev,
      enquiryDate: value,
    }));

    setEnquiryDateDisplay(
      formatDateForDisplay(value)
    );
  }

  function handleDeliveryDatePicker(
    value: string
  ) {
    setEnquiry((prev) => ({
      ...prev,
      requiredDeliveryDate: value,
    }));

    setDeliveryDateDisplay(
      formatDateForDisplay(value)
    );
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!enquiry.customerCode) {
      alert(
        "Please select Export Customer."
      );
      return;
    }

    if (!enquiry.enquiryDate) {
      alert(
        "Please enter Enquiry Date."
      );
      return;
    }

    if (
      !isValidDateDisplay(
        enquiryDateDisplay
      )
    ) {
      alert(
        "Please enter a valid Enquiry Date."
      );
      return;
    }

    if (enquiry.items.length === 0) {
      alert(
        "Please add at least one product."
      );
      return;
    }

    const invalidItem =
      enquiry.items.some(
        (item) =>
          !item.productCode.trim() ||
          !item.productName.trim() ||
          item.qty <= 0 ||
          !item.unit.trim()
      );

    if (invalidItem) {
      alert(
        "Please select Product, enter Quantity and confirm Unit for all rows."
      );
      return;
    }

    if (
      enquiry.requiredDeliveryDate &&
      !isValidDateDisplay(
        deliveryDateDisplay
      )
    ) {
      alert(
        "Please enter a valid Required Delivery Date."
      );
      return;
    }

    const now =
      new Date().toISOString();

    const finalEnquiry: ExportEnquiry = {
      ...enquiry,

      items: enquiry.items.map(
        (item) => ({
          ...item,
          productCode:
            item.productCode.trim(),
          productName:
            item.productName.trim(),
          qty: Number(item.qty),
          unit: item.unit.trim(),
          customerRequirement:
            item.customerRequirement.trim(),
        })
      ),

      createdAt:
        editingEnquiry?.createdAt ||
        enquiry.createdAt,

      updatedAt: now,
    };

    onSave(finalEnquiry);
  }

  function handleReset() {
    const newEnquiry =
      createEmptyEnquiry(
        getNextEnquiryNo(enquiries)
      );

    setEnquiry(newEnquiry);

    setEnquiryDateDisplay(
      formatDateForDisplay(
        newEnquiry.enquiryDate
      )
    );

    setDeliveryDateDisplay("");

    onReset();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#ffffff",
        border: "1px solid #d9dee7",
        borderRadius: 8,
        padding: 16,
        boxShadow:
          "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {/* PAGE TITLE */}
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: 14,
          borderBottom:
            "1px solid #e5e7eb",
          paddingBottom: 10,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {editingEnquiry
            ? "Edit Export Enquiry"
            : "New Export Enquiry"}
        </h2>

        <span
          style={{
            fontSize: 13,
            color: "#64748b",
          }}
        >
          Enquiry Entry
        </span>
      </div>

      {/* HEADER ROW */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "120px 170px 150px minmax(220px, 1fr) 180px",
          gap: 10,
          alignItems: "end",
          marginBottom: 12,
        }}
      >
        {/* ENQUIRY NO */}
        <div>
          <label style={labelStyle}>
            Enquiry No.
          </label>

          <input
            value={enquiry.enquiryNo}
            readOnly
            style={readOnlyInputStyle}
          />
        </div>

        {/* ENQUIRY DATE */}
        <div>
          <label style={labelStyle}>
            Enquiry Date
          </label>

          <div
            style={dateWrapperStyle}
          >
            <input
              value={
                enquiryDateDisplay
              }
              onChange={(e) =>
                handleEnquiryDateChange(
                  e.target.value
                )
              }
              placeholder="DD/MM/YYYY"
              maxLength={10}
              style={dateInputStyle}
            />

            <label
              style={calendarButtonStyle}
              title="Select Enquiry Date"
            >
              📅
              <input
                type="date"
                value={
                  enquiry.enquiryDate
                }
                onChange={(e) =>
                  handleEnquiryDatePicker(
                    e.target.value
                  )
                }
                style={
                  hiddenDatePickerStyle
                }
                aria-label="Select Enquiry Date"
              />
            </label>
          </div>
        </div>

        {/* CUSTOMER CODE */}
        <div>
          <label style={labelStyle}>
            Customer Code
          </label>

          <input
            value={
              enquiry.customerCode
            }
            readOnly
            placeholder="Auto"
            style={
              readOnlyInputStyle
            }
          />
        </div>

        {/* CUSTOMER */}
        <div>
          <label style={labelStyle}>
            Customer
          </label>

          <select
            value={
              enquiry.customerCode
            }
            onChange={(e) =>
              handleCustomerChange(
                e.target.value
              )
            }
            style={inputStyle}
            required
          >
            <option value="">
              Select Export Customer
            </option>

            {customers.map(
              (customer) => (
                <option
                  key={customer.id}
                  value={
                    customer.code
                  }
                >
                  {customer.code} -{" "}
                  {customer.name}
                </option>
              )
            )}
          </select>
        </div>

        {/* CONTACT PERSON */}
        <div>
          <label style={labelStyle}>
            Contact Person
          </label>

          <input
            value={
              enquiry.contactPerson
            }
            readOnly
            placeholder="Auto"
            style={
              readOnlyInputStyle
            }
          />
        </div>
      </div>

      {/* CUSTOMER INFO */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr 160px 180px",
          gap: 10,
          alignItems: "end",
          marginBottom: 16,
        }}
      >
        {/* COUNTRY */}
        <div>
          <label style={labelStyle}>
            Country
          </label>

          <input
            value={enquiry.country}
            readOnly
            placeholder="Auto"
            style={
              readOnlyInputStyle
            }
          />
        </div>

        {/* CURRENCY */}
        <div>
          <label style={labelStyle}>
            Currency
          </label>

          <select
            value={
              enquiry.currency
            }
            onChange={(e) =>
              setEnquiry((prev) => ({
                ...prev,
                currency:
                  e.target.value,
              }))
            }
            style={inputStyle}
          >
            <option value="USD">
              USD
            </option>
            <option value="EUR">
              EUR
            </option>
            <option value="GBP">
              GBP
            </option>
            <option value="AED">
              AED
            </option>
            <option value="SAR">
              SAR
            </option>
            <option value="CAD">
              CAD
            </option>
            <option value="AUD">
              AUD
            </option>
            <option value="JPY">
              JPY
            </option>
            <option value="CHF">
              CHF
            </option>
            <option value="Other">
              Other
            </option>
          </select>
        </div>

        {/* INCOTERM */}
        <div>
          <label style={labelStyle}>
            Incoterm
          </label>

          <select
            value={
              enquiry.incoterm
            }
            onChange={(e) =>
              setEnquiry((prev) => ({
                ...prev,
                incoterm:
                  e.target.value,
              }))
            }
            style={inputStyle}
          >
            <option value="FOB">
              FOB
            </option>
            <option value="CFR">
              CFR
            </option>
            <option value="CIF">
              CIF
            </option>
            <option value="EXW">
              EXW
            </option>
            <option value="FCA">
              FCA
            </option>
            <option value="DAP">
              DAP
            </option>
            <option value="DDP">
              DDP
            </option>
          </select>
        </div>

        {/* STATUS */}
        <div>
          <label style={labelStyle}>
            Status
          </label>

          <select
            value={
              enquiry.status
            }
            onChange={(e) =>
              setEnquiry((prev) => ({
                ...prev,
                status:
                  e.target.value as ExportEnquiry["status"],
              }))
            }
            style={inputStyle}
          >
            <option value="Open">
              Open
            </option>

            <option value="Quoted">
              Quoted
            </option>

            <option value="Under Discussion">
              Under Discussion
            </option>

            <option value="Won">
              Won
            </option>

            <option value="Lost">
              Lost
            </option>

            <option value="Cancelled">
              Cancelled
            </option>
          </select>
        </div>
      </div>

      {/* PRODUCT DETAILS */}
      <div
        style={{
          border:
            "1px solid #d9dee7",
          borderRadius: 6,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            background: "#f8fafc",
            padding:
              "9px 10px",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            borderBottom:
              "1px solid #d9dee7",
          }}
        >
          <strong
            style={{
              fontSize: 14,
            }}
          >
            Product Details
          </strong>

          <button
            type="button"
            onClick={addItem}
            style={addButtonStyle}
          >
            + Add Product
          </button>
        </div>

        {/* TABLE HEADER */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "170px minmax(220px, 1fr) 110px 100px minmax(220px, 1fr) 45px",
            gap: 8,
            padding:
              "8px 10px",
            background:
              "#f1f5f9",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <div>
            Product Code
          </div>

          <div>
            Product
          </div>

          <div>
            Quantity
          </div>

          <div>
            Unit
          </div>

          <div>
            Customer Requirement
          </div>

          <div></div>
        </div>

        {/* PRODUCT ROWS */}
        {enquiry.items.map(
          (item, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "170px minmax(220px, 1fr) 110px 100px minmax(220px, 1fr) 45px",
                gap: 8,
                padding:
                  "8px 10px",
                borderTop:
                  index === 0
                    ? "none"
                    : "1px solid #eef2f7",
                alignItems:
                  "center",
              }}
            >
              {/* PRODUCT CODE */}
              <select
                value={
                  item.productCode
                }
                onChange={(e) =>
                  handleProductChange(
                    index,
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  Select Product
                </option>

                {products.map(
                  (product) => (
                    <option
                      key={product.id}
                      value={
                        product.code
                      }
                    >
                      {product.code} -{" "}
                      {product.name}
                    </option>
                  )
                )}
              </select>

              {/* PRODUCT NAME */}
              <input
                value={
                  item.productName
                }
                readOnly
                placeholder="Auto"
                style={
                  readOnlyInputStyle
                }
              />

              {/* QUANTITY */}
              <input
                type="number"
                min="0"
                step="0.001"
                value={
                  item.qty === 0
                    ? ""
                    : item.qty
                }
                onChange={(e) =>
                  handleItemChange(
                    index,
                    "qty",
                    Number(
                      e.target.value
                    )
                  )
                }
                placeholder="Qty"
                style={inputStyle}
                required
              />

              {/* UNIT */}
              <input
                value={item.unit}
                readOnly
                style={
                  readOnlyInputStyle
                }
              />

              {/* CUSTOMER REQUIREMENT */}
              <input
                value={
                  item.customerRequirement
                }
                onChange={(e) =>
                  handleItemChange(
                    index,
                    "customerRequirement",
                    e.target.value
                  )
                }
                placeholder="Specification / Requirement"
                style={inputStyle}
              />

              {/* REMOVE */}
              <button
                type="button"
                onClick={() =>
                  removeItem(index)
                }
                disabled={
                  enquiry.items.length ===
                  1
                }
                style={{
                  ...removeButtonStyle,
                  opacity:
                    enquiry.items.length ===
                    1
                      ? 0.4
                      : 1,
                  cursor:
                    enquiry.items.length ===
                    1
                      ? "not-allowed"
                      : "pointer",
                }}
                title="Remove Product"
              >
                ×
              </button>
            </div>
          )
        )}
      </div>

      {/* DELIVERY DATE + REMARKS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "220px minmax(300px, 1fr)",
          gap: 10,
          alignItems: "end",
          marginBottom: 16,
        }}
      >
        {/* REQUIRED DELIVERY DATE */}
        <div>
          <label style={labelStyle}>
            Required Delivery Date
          </label>

          <div
            style={dateWrapperStyle}
          >
            <input
              value={
                deliveryDateDisplay
              }
              onChange={(e) =>
                handleDeliveryDateChange(
                  e.target.value
                )
              }
              placeholder="DD/MM/YYYY"
              maxLength={10}
              style={dateInputStyle}
            />

            <label
              style={calendarButtonStyle}
              title="Select Required Delivery Date"
            >
              📅
              <input
                type="date"
                value={
                  enquiry.requiredDeliveryDate
                }
                onChange={(e) =>
                  handleDeliveryDatePicker(
                    e.target.value
                  )
                }
                style={
                  hiddenDatePickerStyle
                }
                aria-label="Select Required Delivery Date"
              />
            </label>
          </div>
        </div>

        {/* REMARKS */}
        <div>
          <label style={labelStyle}>
            Remarks
          </label>

          <input
            value={enquiry.remarks}
            onChange={(e) =>
              setEnquiry((prev) => ({
                ...prev,
                remarks:
                  e.target.value,
              }))
            }
            placeholder="Enter remarks"
            style={inputStyle}
          />
        </div>
      </div>

      {/* ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent:
            "flex-end",
          gap: 10,
          borderTop:
            "1px solid #e5e7eb",
          paddingTop: 12,
        }}
      >
        <button
          type="button"
          onClick={handleReset}
          style={resetButtonStyle}
        >
          Reset
        </button>

        <button
          type="submit"
          style={saveButtonStyle}
        >
          {editingEnquiry
            ? "Update Enquiry"
            : "Save Enquiry"}
        </button>
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 5,
  color: "#334155",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 36,
  padding: "0 9px",
  border:
    "1px solid #cbd5e1",
  borderRadius: 5,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  background: "#ffffff",
};

const readOnlyInputStyle: React.CSSProperties = {
  ...inputStyle,
  background: "#f8fafc",
  color: "#475569",
};

const dateWrapperStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
};

const dateInputStyle: React.CSSProperties = {
  ...inputStyle,
  paddingRight: 42,
};

const calendarButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: 4,
  top: 4,
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 16,
  background: "#f8fafc",
};

const hiddenDatePickerStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  cursor: "pointer",
};

const addButtonStyle: React.CSSProperties = {
  border:
    "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#1e3a8a",
  borderRadius: 5,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const removeButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  border:
    "1px solid #fecaca",
  background: "#fff1f2",
  color: "#dc2626",
  borderRadius: 5,
  fontSize: 18,
  lineHeight: 1,
};

const resetButtonStyle: React.CSSProperties = {
  height: 36,
  padding: "0 16px",
  border:
    "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  borderRadius: 5,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const saveButtonStyle: React.CSSProperties = {
  height: 36,
  padding: "0 18px",
  border: "none",
  background: "#1d4ed8",
  color: "#ffffff",
  borderRadius: 5,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};