"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ExportPacking,
  ExportPackingItem,
  ExportPackingStatus,
} from "./PackingTypes";

import {
  getNextPackingNo,
  getPackedQuantity,
  loadPackings,
} from "./PackingStorage";

type ExportOrder = {
  exportOrderNo: string;
  exportOrderDate: string;
  customerCode: string;
  customerName: string;
  contactPerson: string;
  buyerCountry: string;
  items?: any[];
};

type ExportReservation = {
  reservationNo: string;
  reservationDate: string;
  exportOrderNo: string;
  exportOrderDate: string;
  customerCode: string;
  customerName: string;
  contactPerson: string;
  buyerCountry: string;
  status:
    | "Draft"
    | "Reserved"
    | "Partially Packed"
    | "Packed"
    | "Cancelled";
  items?: any[];
};

type PackingFormProps = {
  initialData?: ExportPacking | null;
  onSave: (packing: ExportPacking) => void;
  onCancel: () => void;
};

const ORDER_KEY =
  "uk-exim-export-orders";

const RESERVATION_KEY =
  "uk-exim-export-reservations";

/* =========================================
   DATE HELPERS
========================================= */

function formatDateForDisplay(
  value: string
): string {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function formatDateForStorage(
  value: string
): string {
  const match = value.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  );

  if (!match) return "";

  return `${match[3]}-${match[2]}-${match[1]}`;
}

function isValidDateDisplay(
  value: string
): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return false;
  }

  const [day, month, year] =
    value.split("/").map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function getTodayStorageDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================================
   STORAGE LOADERS
========================================= */

function loadOrders(): ExportOrder[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = JSON.parse(
      window.localStorage.getItem(
        ORDER_KEY
      ) || "[]"
    );

    return Array.isArray(value)
      ? value
      : [];
  } catch {
    return [];
  }
}

function loadReservations(): ExportReservation[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = JSON.parse(
      window.localStorage.getItem(
        RESERVATION_KEY
      ) || "[]"
    );

    return Array.isArray(value)
      ? value
      : [];
  } catch {
    return [];
  }
}

/* =========================================
   NUMBER HELPER
========================================= */

function numberValue(
  value: unknown
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

/* =========================================
   DATE FIELD
========================================= */

function PackingDateField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [textValue, setTextValue] =
    useState(
      formatDateForDisplay(value)
    );

  const [pickerValue, setPickerValue] =
    useState(value || "");

  useEffect(() => {
    setTextValue(
      formatDateForDisplay(value)
    );

    setPickerValue(value || "");
  }, [value]);

  const handleTextChange = (
    nextValue: string
  ) => {
    setTextValue(nextValue);

    if (
      nextValue.length === 10 &&
      isValidDateDisplay(nextValue)
    ) {
      const storageDate =
        formatDateForStorage(
          nextValue
        );

      setPickerValue(storageDate);
      onChange(storageDate);
    } else if (!nextValue) {
      setPickerValue("");
      onChange("");
    }
  };

  const handlePickerChange = (
    nextValue: string
  ) => {
    setPickerValue(nextValue);

    if (nextValue) {
      setTextValue(
        formatDateForDisplay(
          nextValue
        )
      );

      onChange(nextValue);
    } else {
      setTextValue("");
      onChange("");
    }
  };

  return (
    <div className="pf-field">
      <label>
        {label}
        {required && (
          <span className="pf-required">
            *
          </span>
        )}
      </label>

      <div className="pf-date-wrap">
        <input
          type="text"
          value={textValue}
          placeholder="DD/MM/YYYY"
          maxLength={10}
          onChange={(event) =>
            handleTextChange(
              event.target.value
            )
          }
        />

        <button
          type="button"
          className="pf-calendar-btn"
          onClick={() => {
            const picker =
              document.querySelector(
                `input[data-packing-date="${label}"]`
              ) as HTMLInputElement | null;

            if (picker) {
              if (
                typeof picker.showPicker ===
                "function"
              ) {
                picker.showPicker();
              } else {
                picker.focus();
              }
            }
          }}
          title="Select date"
        >
          📅
        </button>
      </div>

      <input
        data-packing-date={label}
        className="pf-hidden-date-picker"
        type="date"
        value={pickerValue}
        onChange={(event) =>
          handlePickerChange(
            event.target.value
          )
        }
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      />
    </div>
  );
}

/* =========================================
   NORMALIZE RESERVATION ITEM
========================================= */

function normalizeReservationItem(
  item: any,
  reservationNo: string
): ExportPackingItem {
  const orderQty =
    numberValue(item.orderQty);

  const reserveQty =
    numberValue(item.reserveQty);

  const previousPacked =
    getPackedQuantity(
      reservationNo,
      String(
        item.productCode || ""
      )
    );

  const remainingQty =
    Math.max(
      reserveQty - previousPacked,
      0
    );

  const packageQty =
    numberValue(item.packageQty);

  const netWeight =
    numberValue(item.netWeight);

  const netWeightPerPackage =
    packageQty > 0 && netWeight > 0
      ? netWeight / packageQty
      : 0;

  return {
    productCode:
      String(
        item.productCode || ""
      ),
    productName:
      String(
        item.productName || ""
      ),
    hsCode:
      String(
        item.hsCode || ""
      ),
    lotBatchNo:
      String(
        item.lotBatchNo || ""
      ),

    orderQty,
    reserveQty,

    previouslyPackedQty:
      previousPacked,

    packedQty: 0,

    remainingQty,

    unit:
      String(
        item.unit || ""
      ),

    packingType:
      String(
        item.packingType || ""
      ),

    packageQty: 0,

    netWeightPerPackage,

    totalNetWeight: 0,

    grossWeight: 0,

    cbm: 0,

    marksNumbers:
      String(
        item.marksNumbers || ""
      ),

    grade:
      String(
        item.grade || ""
      ),

    brand:
      String(
        item.brand || ""
      ),

    specification:
      String(
        item.specification || ""
      ),
  };
}

/* =========================================
   MAIN FORM
========================================= */

export default function PackingForm({
  initialData,
  onSave,
  onCancel,
}: PackingFormProps) {
  const isEdit =
    Boolean(initialData);

  const [orders] = useState<
    ExportOrder[]
  >(() => loadOrders());

  const [reservations] =
    useState<
      ExportReservation[]
    >(() => loadReservations());

  const [packingNo, setPackingNo] =
    useState("");

  const [packingDate, setPackingDate] =
    useState("");

  const [exportOrderNo, setExportOrderNo] =
    useState("");

  const [
    reservationNo,
    setReservationNo,
  ] = useState("");

  const [
    customerCode,
    setCustomerCode,
  ] = useState("");

  const [
    customerName,
    setCustomerName,
  ] = useState("");

  const [
    contactPerson,
    setContactPerson,
  ] = useState("");

  const [
    buyerCountry,
    setBuyerCountry,
  ] = useState("");

  const [status, setStatus] =
    useState<ExportPackingStatus>(
      "Draft"
    );

  const [items, setItems] =
    useState<ExportPackingItem[]>(
      []
    );

  const [marksNumbers, setMarksNumbers] =
    useState("");

  const [remarks, setRemarks] =
    useState("");

  const [
    errors,
    setErrors,
  ] = useState<string[]>([]);

  /* =====================================
     AVAILABLE RESERVATIONS
  ===================================== */

  const availableReservations =
    useMemo(() => {
      return reservations.filter(
        (reservation) =>
          reservation.status !==
          "Cancelled"
      );
    }, [reservations]);

  /* =====================================
     INITIAL DATA
  ===================================== */

  useEffect(() => {
    if (initialData) {
      setPackingNo(
        initialData.packingNo
      );

      setPackingDate(
        initialData.packingDate
      );

      setExportOrderNo(
        initialData.exportOrderNo
      );

      setReservationNo(
        initialData.reservationNo
      );

      setCustomerCode(
        initialData.customerCode
      );

      setCustomerName(
        initialData.customerName
      );

      setContactPerson(
        initialData.contactPerson
      );

      setBuyerCountry(
        initialData.buyerCountry
      );

      setStatus(
        initialData.status
      );

      setItems(
        initialData.items.map(
          (item) => ({
            ...item,
            previouslyPackedQty:
              getPackedQuantity(
                initialData.reservationNo,
                item.productCode,
                initialData.id
              ),
            remainingQty:
              Math.max(
                numberValue(
                  item.reserveQty
                ) -
                  getPackedQuantity(
                    initialData.reservationNo,
                    item.productCode,
                    initialData.id
                  ),
                0
              ),
          })
        )
      );

      setMarksNumbers(
        initialData.marksNumbers
      );

      setRemarks(
        initialData.remarks
      );

      return;
    }

    setPackingNo(
      getNextPackingNo(
        loadPackings()
      )
    );

    setPackingDate(
      getTodayStorageDate()
    );

    setStatus("Draft");

    setItems([]);
  }, [initialData]);

  /* =====================================
     RESERVATION SELECTION
  ===================================== */

  const handleReservationChange = (
    value: string
  ) => {
    setReservationNo(value);

    const reservation =
      reservations.find(
        (entry) =>
          entry.reservationNo ===
          value
      );

    if (!reservation) {
      setExportOrderNo("");
      setCustomerCode("");
      setCustomerName("");
      setContactPerson("");
      setBuyerCountry("");
      setItems([]);
      return;
    }

    setExportOrderNo(
      reservation.exportOrderNo
    );

    setCustomerCode(
      reservation.customerCode
    );

    setCustomerName(
      reservation.customerName
    );

    setContactPerson(
      reservation.contactPerson
    );

    setBuyerCountry(
      reservation.buyerCountry
    );

    const normalizedItems =
      (reservation.items || []).map(
        (item) =>
          normalizeReservationItem(
            item,
            reservation.reservationNo
          )
      );

    setItems(normalizedItems);

    if (
      normalizedItems.length > 0
    ) {
      setMarksNumbers(
        normalizedItems[0]
          .marksNumbers || ""
      );
    }
  };

  /* =====================================
     ITEM UPDATE
  ===================================== */

  const updateItem = (
    index: number,
    field: keyof ExportPackingItem,
    value: string | number
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const updated = {
          ...item,
        };

        if (
          field === "packedQty"
        ) {
          const packedQty =
            Math.max(
              numberValue(value),
              0
            );

          updated.packedQty =
            packedQty;

          updated.remainingQty =
            Math.max(
              numberValue(
                item.reserveQty
              ) -
                numberValue(
                  item.previouslyPackedQty
                ) -
                packedQty,
              0
            );

          if (
            packedQty === 0
          ) {
            updated.packageQty = 0;
            updated.totalNetWeight = 0;
            updated.grossWeight = 0;
            updated.cbm = 0;
          }

          return updated;
        }

        if (
          field === "packageQty"
        ) {
          const packageQty =
            Math.max(
              numberValue(value),
              0
            );

          updated.packageQty =
            packageQty;

          updated.totalNetWeight =
            packageQty *
            numberValue(
              updated.netWeightPerPackage
            );

          return updated;
        }

        if (
          field ===
          "netWeightPerPackage"
        ) {
          const weight =
            Math.max(
              numberValue(value),
              0
            );

          updated.netWeightPerPackage =
            weight;

          updated.totalNetWeight =
            numberValue(
              updated.packageQty
            ) * weight;

          return updated;
        }

        if (
          field === "grossWeight"
        ) {
          updated.grossWeight =
            Math.max(
              numberValue(value),
              0
            );

          return updated;
        }

        if (field === "cbm") {
          updated.cbm =
            Math.max(
              numberValue(value),
              0
            );

          return updated;
        }

        if (
          field === "packingType"
        ) {
          updated.packingType =
            String(value);

          return updated;
        }

        if (
          field === "marksNumbers"
        ) {
          updated.marksNumbers =
            String(value);

          return updated;
        }

        return updated;
      })
    );
  };

  /* =====================================
     SUMMARY
  ===================================== */

  const totals = useMemo(() => {
    return items.reduce(
      (summary, item) => {
        summary.totalPackages +=
          numberValue(
            item.packageQty
          );

        summary.totalNetWeight +=
          numberValue(
            item.totalNetWeight
          );

        summary.totalGrossWeight +=
          numberValue(
            item.grossWeight
          );

        summary.totalCBM +=
          numberValue(item.cbm);

        return summary;
      },
      {
        totalPackages: 0,
        totalNetWeight: 0,
        totalGrossWeight: 0,
        totalCBM: 0,
      }
    );
  }, [items]);

  /* =====================================
     VALIDATION
  ===================================== */

  const validate = (): string[] => {
    const validationErrors: string[] =
      [];

    if (!packingNo.trim()) {
      validationErrors.push(
        "Packing No. is required."
      );
    }

    if (!packingDate) {
      validationErrors.push(
        "Packing Date is required."
      );
    } else if (
      !isValidDateDisplay(
        formatDateForDisplay(
          packingDate
        )
      )
    ) {
      validationErrors.push(
        "Packing Date is invalid."
      );
    }

    if (!reservationNo) {
      validationErrors.push(
        "Please select a Reservation."
      );
    }

    if (items.length === 0) {
      validationErrors.push(
        "No products are available in the selected Reservation."
      );
    }

    items.forEach(
      (item, index) => {
        const row =
          index + 1;

        const packedQty =
          numberValue(
            item.packedQty
          );

        const remainingQty =
          numberValue(
            item.remainingQty
          );

        if (
          packedQty >
          remainingQty +
            0.000001
        ) {
          validationErrors.push(
            `Row ${row}: Packed Qty cannot exceed remaining quantity.`
          );
        }

        if (
          packedQty > 0 &&
          numberValue(
            item.packageQty
          ) <= 0
        ) {
          validationErrors.push(
            `Row ${row}: Package Qty is required.`
          );
        }

        if (
          packedQty > 0 &&
          numberValue(
            item.netWeightPerPackage
          ) <= 0
        ) {
          validationErrors.push(
            `Row ${row}: Net Weight / Package is required.`
          );
        }

        if (
          packedQty > 0 &&
          numberValue(
            item.totalNetWeight
          ) <= 0
        ) {
          validationErrors.push(
            `Row ${row}: Total Net Weight must be greater than zero.`
          );
        }

        if (
          packedQty > 0 &&
          numberValue(
            item.grossWeight
          ) <= 0
        ) {
          validationErrors.push(
            `Row ${row}: Gross Weight is required.`
          );
        }
      }
    );

    return validationErrors;
  };

  /* =====================================
     SAVE
  ===================================== */

  const handleSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const validationErrors =
      validate();

    setErrors(validationErrors);

    if (
      validationErrors.length > 0
    ) {
      return;
    }

    const now =
      new Date().toISOString();

    const cleanedItems =
      items
        .filter(
          (item) =>
            numberValue(
              item.packedQty
            ) > 0
        )
        .map((item) => ({
          ...item,
          packedQty:
            numberValue(
              item.packedQty
            ),
          packageQty:
            numberValue(
              item.packageQty
            ),
          netWeightPerPackage:
            numberValue(
              item.netWeightPerPackage
            ),
          totalNetWeight:
            numberValue(
              item.totalNetWeight
            ),
          grossWeight:
            numberValue(
              item.grossWeight
            ),
          cbm:
            numberValue(
              item.cbm
            ),
          remainingQty:
            Math.max(
              numberValue(
                item.remainingQty
              ),
              0
            ),
        }));

    const hasPackedItems =
      cleanedItems.length > 0;

    const isFullyPacked =
      hasPackedItems &&
      cleanedItems.every(
        (item) =>
          numberValue(
            item.packedQty
          ) >=
          numberValue(
            item.reserveQty
          ) -
            numberValue(
              item.previouslyPackedQty
            ) -
            0.000001
      );

    const finalStatus: ExportPackingStatus =
      status === "Cancelled"
        ? "Cancelled"
        : isFullyPacked
        ? "Packed"
        : hasPackedItems
        ? "Partially Packed"
        : "Draft";

    const existing =
      initialData;

    const packing: ExportPacking = {
      id:
        existing?.id ||
        `packing-${Date.now()}`,

      packingNo,

      packingDate,

      exportOrderNo,

      exportOrderDate:
        existing?.exportOrderDate ||
        orders.find(
          (order) =>
            order.exportOrderNo ===
            exportOrderNo
        )?.exportOrderDate ||
        "",

      reservationNo,

      reservationDate:
        existing?.reservationDate ||
        reservations.find(
          (reservation) =>
            reservation.reservationNo ===
            reservationNo
        )?.reservationDate ||
        "",

      customerCode,

      customerName,

      contactPerson,

      buyerCountry,

      status: finalStatus,

      items: cleanedItems,

      totalPackages:
        totals.totalPackages,

      totalNetWeight:
        totals.totalNetWeight,

      totalGrossWeight:
        totals.totalGrossWeight,

      totalCBM:
        totals.totalCBM,

      marksNumbers,

      remarks,

      createdAt:
        existing?.createdAt ||
        now,

      updatedAt: now,
    };

    onSave(packing);
  };

  /* =====================================
     RESET
  ===================================== */

  const handleReset = () => {
    if (isEdit) {
      return;
    }

    setPackingNo(
      getNextPackingNo(
        loadPackings()
      )
    );

    setPackingDate(
      getTodayStorageDate()
    );

    setExportOrderNo("");
    setReservationNo("");
    setCustomerCode("");
    setCustomerName("");
    setContactPerson("");
    setBuyerCountry("");
    setStatus("Draft");
    setItems([]);
    setMarksNumbers("");
    setRemarks("");
    setErrors([]);
  };

  return (
    <form
      className="pf-form"
      onSubmit={handleSubmit}
    >
      <div className="pf-header">
        <div>
          <h2>
            {isEdit
              ? "Edit Packing"
              : "New Packing"}
          </h2>

          <p>
            Actual packing against
            Export Reservation
          </p>
        </div>

        <div className="pf-header-actions">
          <button
            type="button"
            className="pf-btn pf-btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>

          {!isEdit && (
            <button
              type="button"
              className="pf-btn pf-btn-light"
              onClick={handleReset}
            >
              Reset
            </button>
          )}

          <button
            type="submit"
            className="pf-btn pf-btn-primary"
          >
            {isEdit
              ? "Update Packing"
              : "Save Packing"}
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="pf-error-box">
          <strong>
            Please check:
          </strong>

          <ul>
            {errors.map(
              (error, index) => (
                <li key={index}>
                  {error}
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {/* =================================
          DOCUMENT DETAILS
      ================================= */}

      <section className="pf-section">
        <div className="pf-section-title">
          Packing Details
        </div>

        <div className="pf-grid pf-grid-4">
          <div className="pf-field">
            <label>
              Packing No.
            </label>

            <input
              value={packingNo}
              readOnly
            />
          </div>

          <PackingDateField
            label="Packing Date"
            value={packingDate}
            onChange={setPackingDate}
            required
          />

          <div className="pf-field">
            <label>
              Export Order
            </label>

            <select
              value={exportOrderNo}
              disabled
              onChange={(event) =>
                setExportOrderNo(
                  event.target.value
                )
              }
            >
              <option value="">
                Select
              </option>

              {orders.map(
                (order) => (
                  <option
                    key={
                      order.exportOrderNo
                    }
                    value={
                      order.exportOrderNo
                    }
                  >
                    {order.exportOrderNo}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="pf-field">
            <label>
              Reservation
              <span className="pf-required">
                *
              </span>
            </label>

            <select
              value={reservationNo}
              disabled={isEdit}
              onChange={(event) =>
                handleReservationChange(
                  event.target.value
                )
              }
            >
              <option value="">
                Select Reservation
              </option>

              {availableReservations.map(
                (reservation) => (
                  <option
                    key={
                      reservation.reservationNo
                    }
                    value={
                      reservation.reservationNo
                    }
                  >
                    {
                      reservation.reservationNo
                    }{" "}
                    —{" "}
                    {
                      reservation.exportOrderNo
                    }
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </section>

      {/* =================================
          CUSTOMER DETAILS
      ================================= */}

      <section className="pf-section">
        <div className="pf-section-title">
          Buyer / Customer
        </div>

        <div className="pf-grid pf-grid-4">
          <div className="pf-field">
            <label>
              Customer Code
            </label>

            <input
              value={customerCode}
              readOnly
            />
          </div>

          <div className="pf-field pf-span-2">
            <label>
              Customer
            </label>

            <input
              value={customerName}
              readOnly
            />
          </div>

          <div className="pf-field">
            <label>
              Country
            </label>

            <input
              value={buyerCountry}
              readOnly
            />
          </div>

          <div className="pf-field">
            <label>
              Contact Person
            </label>

            <input
              value={contactPerson}
              readOnly
            />
          </div>
        </div>
      </section>

      {/* =================================
          PRODUCTS
      ================================= */}

      <section className="pf-section">
        <div className="pf-section-title-row">
          <div className="pf-section-title">
            Actual Packing
          </div>

          <div className="pf-help">
            Reserved Qty is the maximum
            quantity available for packing.
          </div>
        </div>

        <div className="pf-table-wrap">
          <table className="pf-table">
            <thead>
              <tr>
                <th>
                  Product
                </th>
                <th>
                  HSN
                </th>
                <th>
                  Lot / Batch
                </th>
                <th>
                  Reserved
                </th>
                <th>
                  Already Packed
                </th>
                <th>
                  Remaining
                </th>
                <th>
                  Pack Now
                </th>
                <th>
                  Unit
                </th>
                <th>
                  Packing
                </th>
                <th>
                  Packages
                </th>
                <th>
                  Net KG / Pkg
                </th>
                <th>
                  Total Net KG
                </th>
                <th>
                  Gross KG
                </th>
                <th>
                  CBM
                </th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="pf-empty"
                  >
                    Select a Reservation
                    to load products.
                  </td>
                </tr>
              ) : (
                items.map(
                  (item, index) => (
                    <tr
                      key={`${item.productCode}-${index}`}
                    >
                      <td>
                        <div className="pf-product-name">
                          {
                            item.productName
                          }
                        </div>

                        <div className="pf-product-code">
                          {
                            item.productCode
                          }
                        </div>
                      </td>

                      <td>
                        <input
                          value={
                            item.hsCode
                          }
                          readOnly
                        />
                      </td>

                      <td>
                        <input
                          value={
                            item.lotBatchNo
                          }
                          readOnly
                        />
                      </td>

                      <td className="pf-number">
                        {numberValue(
                          item.reserveQty
                        ).toFixed(3)}
                      </td>

                      <td className="pf-number">
                        {numberValue(
                          item.previouslyPackedQty
                        ).toFixed(3)}
                      </td>

                      <td className="pf-number pf-remaining">
                        {numberValue(
                          item.remainingQty
                        ).toFixed(3)}
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={
                            item.packedQty ||
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              "packedQty",
                              event.target
                                .value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          value={
                            item.unit
                          }
                          readOnly
                        />
                      </td>

                      <td>
                        <input
                          value={
                            item.packingType
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              "packingType",
                              event.target
                                .value
                            )
                          }
                          placeholder="Bag / Box"
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            item.packageQty ||
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              "packageQty",
                              event.target
                                .value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={
                            item.netWeightPerPackage ||
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              "netWeightPerPackage",
                              event.target
                                .value
                            )
                          }
                        />
                      </td>

                      <td className="pf-number">
                        {numberValue(
                          item.totalNetWeight
                        ).toFixed(3)}
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={
                            item.grossWeight ||
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              "grossWeight",
                              event.target
                                .value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={
                            item.cbm ||
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              "cbm",
                              event.target
                                .value
                            )
                          }
                        />
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="pf-note">
          <strong>
            Packing Logic:
          </strong>{" "}
          Reservation 100 KG → Pack Now
          60 KG → Remaining 40 KG.
          Later another packing can pack
          the remaining 40 KG.
        </div>
      </section>

      {/* =================================
          PACKING SUMMARY
      ================================= */}

      <section className="pf-section">
        <div className="pf-section-title">
          Packing Summary
        </div>

        <div className="pf-summary-grid">
          <div className="pf-summary-card">
            <span>
              Total Packages
            </span>

            <strong>
              {totals.totalPackages.toFixed(
                0
              )}
            </strong>
          </div>

          <div className="pf-summary-card">
            <span>
              Total Net Weight
            </span>

            <strong>
              {totals.totalNetWeight.toFixed(
                3
              )}{" "}
              KG
            </strong>
          </div>

          <div className="pf-summary-card">
            <span>
              Total Gross Weight
            </span>

            <strong>
              {totals.totalGrossWeight.toFixed(
                3
              )}{" "}
              KG
            </strong>
          </div>

          <div className="pf-summary-card">
            <span>
              Total CBM
            </span>

            <strong>
              {totals.totalCBM.toFixed(
                3
              )}
            </strong>
          </div>
        </div>
      </section>

      {/* =================================
          MARKS / REMARKS
      ================================= */}

      <section className="pf-section">
        <div className="pf-grid pf-grid-2">
          <div className="pf-field">
            <label>
              Marks & Numbers
            </label>

            <textarea
              value={marksNumbers}
              onChange={(event) =>
                setMarksNumbers(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Container / package marks"
            />
          </div>

          <div className="pf-field">
            <label>
              Remarks
            </label>

            <textarea
              value={remarks}
              onChange={(event) =>
                setRemarks(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Packing remarks"
            />
          </div>
        </div>
      </section>

      {/* =================================
          SAFETY NOTE
      ================================= */}

      <div className="pf-safety-note">
        <strong>
          Stock Safety:
        </strong>{" "}
        Packing does not directly reduce
        International Export Stock.
        Reservation controls reserved
        quantity. Container Loading and
        Shipment will handle the next
        physical movement.
      </div>

      <style jsx>{`
        .pf-form {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding: 18px;
          box-sizing: border-box;
          background: #f7f8fa;
          color: #1f2937;
        }

        .pf-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .pf-header h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
        }

        .pf-header p {
          margin: 4px 0 0;
          color: #6b7280;
          font-size: 13px;
        }

        .pf-header-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pf-btn {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          background: #fff;
        }

        .pf-btn-primary {
          background: #1d4ed8;
          color: #fff;
          border-color: #1d4ed8;
        }

        .pf-btn-secondary {
          color: #374151;
        }

        .pf-btn-light {
          background: #f3f4f6;
        }

        .pf-error-box {
          margin-bottom: 14px;
          padding: 10px 14px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #991b1b;
          border-radius: 6px;
          font-size: 13px;
        }

        .pf-error-box ul {
          margin: 6px 0 0 18px;
          padding: 0;
        }

        .pf-section {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 14px;
        }

        .pf-section-title {
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 12px;
          padding-bottom: 7px;
          border-bottom: 1px solid #eef0f2;
        }

        .pf-section-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .pf-section-title-row
          .pf-section-title {
          margin-bottom: 0;
          flex: 1;
        }

        .pf-help {
          color: #6b7280;
          font-size: 11px;
        }

        .pf-grid {
          display: grid;
          gap: 10px;
        }

        .pf-grid-2 {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .pf-grid-4 {
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
        }

        .pf-span-2 {
          grid-column: span 2;
        }

        .pf-field {
          min-width: 0;
        }

        .pf-field label {
          display: block;
          margin-bottom: 4px;
          color: #4b5563;
          font-size: 11px;
          font-weight: 600;
        }

        .pf-required {
          color: #dc2626;
          margin-left: 3px;
        }

        .pf-field input,
        .pf-field select,
        .pf-field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 5px;
          background: #fff;
          color: #111827;
          font-size: 12px;
          padding: 7px 8px;
          outline: none;
        }

        .pf-field textarea {
          resize: vertical;
          min-height: 68px;
        }

        .pf-field input:focus,
        .pf-field select:focus,
        .pf-field textarea:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 2px
            rgba(37, 99, 235, 0.08);
        }

        .pf-date-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .pf-date-wrap > input:first-child {
          padding-right: 36px;
        }

        .pf-calendar-btn {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          border: 0;
          background: transparent;
          cursor: pointer;
          padding: 3px;
          font-size: 15px;
          line-height: 1;
        }

        .pf-hidden-date-picker {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: 0 !important;
          border: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
          overflow: hidden !important;
        }

        .pf-table-wrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .pf-table {
          width: 100%;
          min-width: 1450px;
          border-collapse: collapse;
          font-size: 11px;
        }

        .pf-table th {
          background: #f3f4f6;
          color: #374151;
          font-weight: 700;
          padding: 7px 6px;
          border-bottom: 1px solid #d1d5db;
          border-right: 1px solid #e5e7eb;
          white-space: nowrap;
          text-align: left;
        }

        .pf-table td {
          padding: 5px 6px;
          border-bottom: 1px solid #eef0f2;
          border-right: 1px solid #eef0f2;
          vertical-align: middle;
        }

        .pf-table input {
          width: 100%;
          min-width: 70px;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 5px 6px;
          font-size: 11px;
        }

        .pf-product-name {
          min-width: 130px;
          font-weight: 600;
          color: #111827;
        }

        .pf-product-code {
          margin-top: 2px;
          color: #6b7280;
          font-size: 10px;
        }

        .pf-number {
          text-align: right;
          white-space: nowrap;
        }

        .pf-remaining {
          font-weight: 700;
          color: #166534;
        }

        .pf-empty {
          text-align: center;
          padding: 24px;
          color: #6b7280;
        }

        .pf-note {
          margin-top: 9px;
          padding: 8px 10px;
          border-radius: 5px;
          background: #eff6ff;
          color: #1e40af;
          font-size: 11px;
        }

        .pf-summary-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .pf-summary-card {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 10px;
          background: #fafafa;
        }

        .pf-summary-card span {
          display: block;
          color: #6b7280;
          font-size: 11px;
          margin-bottom: 4px;
        }

        .pf-summary-card strong {
          font-size: 17px;
          color: #111827;
        }

        .pf-safety-note {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1e3a8a;
          border-radius: 7px;
          padding: 10px 12px;
          font-size: 12px;
          margin-bottom: 4px;
        }

        @media (max-width: 1100px) {
          .pf-grid-4 {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .pf-summary-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .pf-form {
            padding: 10px;
          }

          .pf-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .pf-grid-2,
          .pf-grid-4,
          .pf-summary-grid {
            grid-template-columns: 1fr;
          }

          .pf-span-2 {
            grid-column: span 1;
          }

          .pf-section-title-row {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </form>
  );
}