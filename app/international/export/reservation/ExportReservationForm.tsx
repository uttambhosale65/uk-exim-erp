"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ExportOrder,
  ExportOrderItem,
} from "../order/ExportOrderTypes";

import { loadExportOrders } from "../order/ExportOrderStorage";

import {
  ExportReservation,
  ExportReservationItem,
  ExportReservationStatus,
} from "./ExportReservationTypes";

import {
  loadInternationalExportStock,
} from "../stock/InternationalExportStockStorage";

import {
  InternationalExportStock,
} from "../stock/InternationalExportStockTypes";

import {
  loadExportReservations,
} from "./ExportReservationStorage";

type ExportReservationFormProps = {
  reservationNo: string;
  initialData?: ExportReservation | null;
  onSave: (
    reservation: ExportReservation
  ) => void;
  onCancel?: () => void;
};

const STATUS_OPTIONS: ExportReservationStatus[] = [
  "Draft",
  "Reserved",
  "Partially Packed",
  "Packed",
  "Cancelled",
];

function getToday(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function formatDateForInput(
  value: string
): string {
  if (!value) return "";

  const directMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (directMatch) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
}

function formatDateForDisplay(
  value: string
): string {
  const storageValue =
    formatDateForInput(value);

  if (!storageValue) {
    return "";
  }

  const [year, month, day] =
    storageValue.split("-");

  return `${day}/${month}/${year}`;
}

function formatDateForStorage(
  value: string
): string {
  const cleanValue =
    value.trim();

  if (!cleanValue) {
    return "";
  }

  const match =
    cleanValue.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

  if (!match) {
    return "";
  }

  const [, day, month, year] =
    match;

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  if (
    date.getFullYear() !==
      Number(year) ||
    date.getMonth() !==
      Number(month) - 1 ||
    date.getDate() !==
      Number(day)
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function isValidDateDisplay(
  value: string
): boolean {
  if (!value.trim()) {
    return false;
  }

  return Boolean(
    formatDateForStorage(value)
  );
}

type ReservationDateFieldProps = {
  label: string;
  value: string;
  onChange?: (
    value: string
  ) => void;
  readOnly?: boolean;
};

function ReservationDateField({
  label,
  value,
  onChange,
  readOnly = false,
}: ReservationDateFieldProps) {
  const [
    displayValue,
    setDisplayValue,
  ] = useState<string>(
    formatDateForDisplay(value)
  );

  const datePickerRef =
    React.useRef<HTMLInputElement | null>(
      null
    );

  useEffect(() => {
    setDisplayValue(
      formatDateForDisplay(value)
    );
  }, [value]);

  const handleTextChange = (
    nextValue: string
  ) => {
    setDisplayValue(nextValue);

    if (readOnly || !onChange) {
      return;
    }

    const storageValue =
      formatDateForStorage(
        nextValue
      );

    if (storageValue) {
      onChange(storageValue);
    } else if (!nextValue.trim()) {
      onChange("");
    }
  };

  const handleTextBlur = () => {
    if (readOnly) {
      return;
    }

    const storageValue =
      formatDateForStorage(
        displayValue
      );

    if (storageValue) {
      setDisplayValue(
        formatDateForDisplay(
          storageValue
        )
      );

      onChange?.(
        storageValue
      );

      return;
    }

    if (!displayValue.trim()) {
      onChange?.("");
      return;
    }

    setDisplayValue(
      formatDateForDisplay(value)
    );
  };

  const handlePickerChange = (
    nextValue: string
  ) => {
    if (readOnly || !onChange) {
      return;
    }

    onChange(nextValue);

    setDisplayValue(
      formatDateForDisplay(
        nextValue
      )
    );
  };

  return (
    <div className="er-date-field">
      <label className="er-label">
        {label}
      </label>

      <div className="er-date-control">
        <input
          className="er-input er-date-text"
          value={displayValue}
          onChange={(e) =>
            handleTextChange(
              e.target.value
            )
          }
          onBlur={handleTextBlur}
          placeholder="DD/MM/YYYY"
          inputMode="numeric"
          maxLength={10}
          readOnly={readOnly}
          style={
            readOnly
              ? {
                  background:
                    "#f3f4f6",
                  color:
                    "#374151",
                  paddingRight:
                    "34px",
                }
              : {
                  paddingRight:
                    "34px",
                }
          }
        />

        {!readOnly && (
          <>
            <button
              type="button"
              className="er-date-button"
              aria-label={`Select ${label}`}
              onClick={() =>
                datePickerRef.current?.showPicker?.()
              }
            >
              📅
            </button>

            <input
              ref={datePickerRef}
              className="er-hidden-date-picker"
              type="date"
              value={formatDateForInput(value)}
              onChange={(e) =>
                handlePickerChange(
                  e.target.value
                )
              }
              tabIndex={-1}
              aria-hidden="true"
            />
          </>
        )}
      </div>
    </div>
  );
}

function createEmptyReservation(
  reservationNo: string
): ExportReservation {
  const now =
    new Date().toISOString();

  return {
    id: crypto.randomUUID(),

    reservationNo,
    reservationDate: getToday(),

    exportOrderNo: "",
    exportOrderDate: "",

    customerCode: "",
    customerName: "",
    contactPerson: "",
    buyerCountry: "",

    status: "Draft",

    items: [],

    totalReservedQty: 0,
    totalPackages: 0,
    totalNetWeight: 0,
    totalGrossWeight: 0,
    totalCBM: 0,

    remarks: "",

    createdAt: now,
    updatedAt: now,
  };
}

function normaliseExistingReservation(
  reservation: ExportReservation
): ExportReservation {
  return {
    ...reservation,

    reservationDate:
      formatDateForInput(
        reservation.reservationDate
      ),

    exportOrderDate:
      formatDateForInput(
        reservation.exportOrderDate
      ),

    items:
      Array.isArray(
        reservation.items
      )
        ? reservation.items
        : [],
  };
}

function getOrderItemKey(
  item: ExportOrderItem,
  index: number
): string {
  return `${item.productCode || "PRODUCT"}__${index}`;
}

export default function ExportReservationForm({
  reservationNo,
  initialData,
  onSave,
  onCancel,
}: ExportReservationFormProps) {
  const [form, setForm] =
    useState<ExportReservation>(() =>
      initialData
        ? normaliseExistingReservation(
            initialData
          )
        : createEmptyReservation(
            reservationNo
          )
    );

  const [orders, setOrders] =
    useState<ExportOrder[]>([]);

  const [stock, setStock] =
    useState<
      InternationalExportStock[]
    >([]);

  const [reservations, setReservations] =
    useState<ExportReservation[]>([]);

  const [
    selectedOrderNo,
    setSelectedOrderNo,
  ] = useState<string>(
    initialData?.exportOrderNo || ""
  );

  useEffect(() => {
    setOrders(
      loadExportOrders()
    );

    setStock(
      loadInternationalExportStock()
    );

    setReservations(
      loadExportReservations()
    );
  }, []);

  useEffect(() => {
    if (initialData) {
      const normalised =
        normaliseExistingReservation(
          initialData
        );

      setForm(normalised);

      setSelectedOrderNo(
        normalised.exportOrderNo || ""
      );

      return;
    }

    setForm(
      createEmptyReservation(
        reservationNo
      )
    );

    setSelectedOrderNo("");
  }, [
    initialData,
    reservationNo,
  ]);

  const selectedOrder =
    useMemo(() => {
      if (!selectedOrderNo) {
        return undefined;
      }

      return orders.find(
        (order) =>
          order.exportOrderNo ===
          selectedOrderNo
      );
    }, [
      orders,
      selectedOrderNo,
    ]);

  /*
   * Existing reservation quantity for the same
   * Export Order and product.
   *
   * When editing the current reservation,
   * its own quantity is excluded because it will
   * be released and re-reserved by Storage.
   */
  const existingReservedByProduct =
    useMemo(() => {
      const map =
        new Map<string, number>();

      for (const reservation of reservations) {
        if (
          reservation.exportOrderNo !==
          selectedOrderNo
        ) {
          continue;
        }

        if (
          initialData &&
          reservation.id ===
            initialData.id
        ) {
          continue;
        }

        if (
          reservation.status ===
          "Cancelled"
        ) {
          continue;
        }

        for (const item of
          reservation.items || []) {
          const key =
            item.productCode;

          map.set(
            key,
            (map.get(key) || 0) +
              Math.max(
                Number(
                  item.reserveQty || 0
                ),
                0
              )
          );
        }
      }

      return map;
    }, [
      reservations,
      selectedOrderNo,
      initialData,
    ]);

  const getReservableQuantity = (
    stockItem: InternationalExportStock
  ): number => {
    const availableQty = Math.max(
      Number(stockItem.availableQty || 0),
      0
    );

    const reservedQty = Math.max(
      Number(stockItem.reservedQty || 0),
      0
    );

    const packedQty = Math.max(
      Number(stockItem.packedQty || 0),
      0
    );

    return Math.max(
      availableQty - reservedQty - packedQty,
      0
    );
  };

  const stockByProduct =
    useMemo(() => {
      const map =
        new Map<
          string,
          InternationalExportStock[]
        >();

      for (const item of stock) {
        const current =
          map.get(
            item.productCode
          ) || [];

        current.push(item);

        map.set(
          item.productCode,
          current
        );
      }

      return map;
    }, [stock]);

  const calculateAvailableForOrder =
    (productCode: string): number => {
      const productStock =
        stockByProduct.get(
          productCode
        ) || [];

      const currentReservationQty =
        initialData?.items
          ?.filter(
            (item) =>
              item.productCode ===
              productCode
          )
          .reduce(
            (sum, item) =>
              sum +
              Math.max(
                Number(
                  item.reserveQty || 0
                ),
                0
              ),
            0
          ) || 0;

      const totalReservable =
        productStock.reduce(
          (sum, stockItem) =>
            sum +
            getReservableQuantity(
              stockItem
            ),
          0
        );

      return Math.max(
        totalReservable +
          currentReservationQty,
        0
      );
    };

  const buildReservationItemFromOrder =
    (
      orderItem: ExportOrderItem,
      index: number
    ): ExportReservationItem => {
      const existingItem =
        form.items.find(
          (item) =>
            item.productCode ===
              orderItem.productCode &&
            item.orderQty ===
              Number(
                orderItem.qty || 0
              )
        );

      const stockForProduct =
        stockByProduct.get(
          orderItem.productCode
        ) || [];

      const existingStock =
        existingItem
          ? stockForProduct.find(
              (stockItem) =>
                stockItem.id ===
                existingItem.reservedStockId
            )
          : undefined;

      const selectedStock =
        existingStock ||
        stockForProduct.find(
          (stockItem) =>
            getReservableQuantity(
              stockItem
            ) > 0 &&
            stockItem.unit ===
              orderItem.unit
        );

      return {
        productCode:
          orderItem.productCode || "",

        productName:
          orderItem.productName || "",

        lotBatchNo:
          selectedStock?.lotBatchNo ||
          "",

        orderQty:
          Number(
            orderItem.qty || 0
          ),

        reserveQty:
          existingItem?.reserveQty ||
          0,

        unit:
          orderItem.unit || "KG",

        packingType:
          orderItem.packingType || "",

        packageQty:
          existingItem?.packageQty ||
          0,

        netWeight:
          existingItem?.netWeight ||
          0,

        grossWeight:
          existingItem?.grossWeight ||
          0,

        cbm:
          existingItem?.cbm ||
          0,

        marksNumbers:
          orderItem.marksNumbers ||
          "",

        reservedStockId:
          selectedStock?.id || "",
      };
    };

  const updateTotals = (
    items: ExportReservationItem[]
  ) => {
    const totalReservedQty =
      items.reduce(
        (sum, item) =>
          sum +
          Math.max(
            Number(
              item.reserveQty || 0
            ),
            0
          ),
        0
      );

    const totalPackages =
      items.reduce(
        (sum, item) =>
          sum +
          Math.max(
            Number(
              item.packageQty || 0
            ),
            0
          ),
        0
      );

    const totalNetWeight =
      items.reduce(
        (sum, item) =>
          sum +
          Math.max(
            Number(
              item.netWeight || 0
            ),
            0
          ),
        0
      );

    const totalGrossWeight =
      items.reduce(
        (sum, item) =>
          sum +
          Math.max(
            Number(
              item.grossWeight || 0
            ),
            0
          ),
        0
      );

    const totalCBM =
      items.reduce(
        (sum, item) =>
          sum +
          Math.max(
            Number(
              item.cbm || 0
            ),
            0
          ),
        0
      );

    return {
      totalReservedQty,
      totalPackages,
      totalNetWeight,
      totalGrossWeight,
      totalCBM,
    };
  };

  const handleOrderChange = (
    orderNo: string
  ) => {
    setSelectedOrderNo(
      orderNo
    );

    if (!orderNo) {
      setForm(
        createEmptyReservation(
          reservationNo
        )
      );

      setSelectedOrderNo("");

      return;
    }

    const order =
      orders.find(
        (item) =>
          item.exportOrderNo ===
          orderNo
      );

    if (!order) {
      return;
    }

    const orderItems =
      Array.isArray(order.items)
        ? order.items
        : [];

    const reservationItems =
      orderItems.map(
        (
          orderItem,
          index
        ) =>
          buildReservationItemFromOrder(
            orderItem,
            index
          )
      );

    const totals =
      updateTotals(
        reservationItems
      );

    setForm((previous) => ({
      ...previous,

      exportOrderNo:
        order.exportOrderNo,

      exportOrderDate:
        formatDateForInput(
          order.exportOrderDate
        ),

      customerCode:
        order.customerCode,

      customerName:
        order.customerName,

      contactPerson:
        order.contactPerson,

      buyerCountry:
        order.buyerCountry,

      items:
        reservationItems,

      ...totals,
    }));
  };

  const updateItem = (
    index: number,
    field: keyof ExportReservationItem,
    value: string | number
  ) => {
    setForm((previous) => {
      const items = [
        ...previous.items,
      ];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      const totals =
        updateTotals(
          items
        );

      return {
        ...previous,
        items,
        ...totals,
      };
    });
  };

  const handleStockChange = (
    index: number,
    stockId: string
  ) => {
    const stockItem =
      stock.find(
        (item) =>
          item.id === stockId
      );

    if (!stockItem) {
      return;
    }

    setForm((previous) => {
      const items = [
        ...previous.items,
      ];

      items[index] = {
        ...items[index],

        lotBatchNo:
          stockItem.lotBatchNo,

        reservedStockId:
          stockItem.id,
      };

      return {
        ...previous,
        items,
      };
    });
  };

  const getProductStock =
    (
      productCode: string
    ) =>
      stockByProduct.get(
        productCode
      ) || [];

  const getCurrentItemReservable =
    (
      item: ExportReservationItem
    ): number => {
      if (
        !item.productCode
      ) {
        return 0;
      }

      const productStock =
        getProductStock(
          item.productCode
        );

      const baseReservable =
        productStock.reduce(
          (sum, stockItem) =>
            sum +
            getReservableQuantity(
              stockItem
            ),
          0
        );

      const currentReservationQty =
        initialData?.items
          ?.filter(
            (existingItem) =>
              existingItem.productCode ===
              item.productCode
          )
          .reduce(
            (sum, existingItem) =>
              sum +
              Math.max(
                Number(
                  existingItem.reserveQty ||
                    0
                ),
                0
              ),
            0
          ) || 0;

      return Math.max(
        baseReservable +
          currentReservationQty,
        0
      );
    };

  const statusForCurrentForm =
    useMemo(() => {
      const activeItems =
        form.items.filter(
          (item) =>
            Number(
              item.reserveQty || 0
            ) > 0
        );

      if (
        activeItems.length === 0
      ) {
        return "Draft";
      }

      const allComplete =
        form.items.every(
          (item) =>
            Number(
              item.reserveQty || 0
            ) >=
            Number(
              item.orderQty || 0
            )
        );

      if (allComplete) {
        return "Reserved";
      }

      return "Reserved";
    }, [form.items]);

  const handleReset = () => {
    if (initialData) {
      const normalised =
        normaliseExistingReservation(
          initialData
        );

      setForm(normalised);

      setSelectedOrderNo(
        normalised.exportOrderNo ||
          ""
      );

      return;
    }

    setForm(
      createEmptyReservation(
        reservationNo
      )
    );

    setSelectedOrderNo("");
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !form.reservationDate
    ) {
      alert(
        "Please enter Reservation Date."
      );

      return;
    }

    if (
      !form.exportOrderNo.trim()
    ) {
      alert(
        "Please select an Export Order."
      );

      return;
    }

    if (
      !form.customerName.trim()
    ) {
      alert(
        "Customer details could not be loaded from the selected Export Order."
      );

      return;
    }

    if (
      form.items.length === 0
    ) {
      alert(
        "No product items found in the selected Export Order."
      );

      return;
    }

    for (
      let index = 0;
      index < form.items.length;
      index++
    ) {
      const item =
        form.items[index];

      const reserveQty =
        Math.max(
          Number(
            item.reserveQty || 0
          ),
          0
        );

      const orderQty =
        Math.max(
          Number(
            item.orderQty || 0
          ),
          0
        );

      if (
        reserveQty <= 0
      ) {
        continue;
      }

      if (
        !item.productCode
      ) {
        alert(
          `Product ${index + 1} does not have a Product Code.`
        );

        return;
      }

      if (
        !item.reservedStockId
      ) {
        alert(
          `Please select Stock / Lot for ${item.productName}.`
        );

        return;
      }

      if (
        reserveQty > orderQty
      ) {
        alert(
          `Reservation Qty for ${item.productName} cannot exceed Order Qty ${orderQty} ${item.unit}.`
        );

        return;
      }

      const selectedStock =
        stock.find(
          (stockItem) =>
            stockItem.id ===
            item.reservedStockId
        );

      if (!selectedStock) {
        alert(
          `Selected stock was not found for ${item.productName}. Please refresh the form.`
        );

        return;
      }

      if (
        selectedStock.unit !==
        item.unit
      ) {
        alert(
          `Unit mismatch for ${item.productName}. Order Unit: ${item.unit}, Stock Unit: ${selectedStock.unit}.`
        );

        return;
      }

      const availableToReserve =
        getCurrentItemReservable(
          item
        );

      /*
       * Existing reservation from the same document
       * is intentionally not counted here.
       */
      if (
        reserveQty >
        availableToReserve
      ) {
        alert(
          `Insufficient reservable stock for ${item.productName}. Available to reserve: ${availableToReserve.toFixed(
            3
          )} ${item.unit}.`
        );

        return;
      }
    }

    const activeItems =
      form.items.filter(
        (item) =>
          Number(
            item.reserveQty || 0
          ) > 0
      );

    if (
      activeItems.length === 0
    ) {
      alert(
        "Please enter Reservation Qty for at least one product."
      );

      return;
    }

    const totals =
      updateTotals(
        activeItems
      );

    const now =
      new Date().toISOString();

    const finalReservation: ExportReservation =
      {
        ...form,

        id:
          form.id ||
          crypto.randomUUID(),

        reservationNo:
          form.reservationNo ||
          reservationNo,

        exportOrderNo:
          form.exportOrderNo,

        items:
          activeItems,

        status:
          form.status ===
            "Cancelled"
            ? "Cancelled"
            : statusForCurrentForm,

        ...totals,

        createdAt:
          form.createdAt || now,

        updatedAt: now,
      };

    onSave(
      finalReservation
    );
  };

  const totalPhysicalStock =
    useMemo(() => {
      return form.items.reduce(
        (sum, item) => {
          const productStock =
            getProductStock(
              item.productCode
            );

          return (
            sum +
            productStock.reduce(
              (
                productSum,
                stockItem
              ) =>
                productSum +
                Math.max(
                  Number(
                    stockItem.availableQty ||
                      0
                  ),
                  0
                ),
              0
            )
          );
        },
        0
      );
    }, [
      form.items,
      stockByProduct,
    ]);

  const totalReservableStock =
    useMemo(() => {
      return form.items.reduce(
        (sum, item) =>
          sum +
          getCurrentItemReservable(
            item
          ),
        0
      );
    }, [
      form.items,
      stockByProduct,
      existingReservedByProduct,
    ]);

  const readonlyStyle: React.CSSProperties =
    {
      background: "#f3f4f6",
      color: "#374151",
    };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%",
        maxWidth: "1600px",
        margin: "0 auto",
        padding: "10px",
        boxSizing: "border-box",
        background: "#f7f8fa",
        color: "#1f2937",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <style>{`
        .er-section {
          background: #ffffff;
          border: 1px solid #dfe3e8;
          border-radius: 6px;
          margin-bottom: 8px;
          overflow: hidden;
        }

        .er-title {
          padding: 7px 9px;
          background: #f1f3f5;
          border-bottom: 1px solid #dfe3e8;
          font-size: 13px;
          font-weight: 700;
        }

        .er-body {
          padding: 8px 9px;
        }

        .er-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 7px;
        }

        .er-grid-3 {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 7px;
        }

        .er-field {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .er-date-field {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .er-date-control {
          position: relative;
          width: 100%;
        }

        .er-date-text {
          padding-right: 34px;
        }

        .er-date-button {
          position: absolute;
          top: 50%;
          right: 4px;
          transform: translateY(-50%);
          width: 26px;
          height: 26px;
          border: 0;
          background: transparent;
          cursor: pointer;
          padding: 0;
          font-size: 14px;
          line-height: 1;
        }

        .er-date-button:hover {
          background: #f3f4f6;
          border-radius: 4px;
        }

        .er-hidden-date-picker {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .er-label {
          font-size: 11px;
          font-weight: 600;
          color: #4b5563;
        }

        .er-input,
        .er-select,
        .er-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cfd5dc;
          border-radius: 4px;
          padding: 5px 7px;
          font-size: 12px;
          line-height: 1.25;
          background: #ffffff;
          color: #111827;
          outline: none;
        }

        .er-input:focus,
        .er-select:focus,
        .er-textarea:focus {
          border-color: #6b7280;
        }

        .er-textarea {
          min-height: 42px;
          resize: vertical;
        }

        .er-note {
          margin-top: 4px;
          font-size: 10px;
          color: #6b7280;
          line-height: 1.35;
        }

        .er-info-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 7px;
        }

        .er-info-card {
          border: 1px solid #dfe3e8;
          border-radius: 5px;
          background: #fafafa;
          padding: 7px;
        }

        .er-info-label {
          font-size: 10px;
          color: #6b7280;
        }

        .er-info-value {
          margin-top: 2px;
          font-size: 14px;
          font-weight: 700;
          color: #111827;
        }

        .er-table-wrap {
          overflow-x: auto;
          border: 1px solid #dfe3e8;
          border-radius: 5px;
        }

        .er-table {
          width: 100%;
          min-width: 1350px;
          border-collapse: collapse;
          font-size: 11px;
        }

        .er-table th {
          background: #f1f3f5;
          border-bottom: 1px solid #dfe3e8;
          padding: 6px 5px;
          text-align: left;
          white-space: nowrap;
        }

        .er-table td {
          border-bottom: 1px solid #edf0f2;
          padding: 5px;
          vertical-align: top;
        }

        .er-table input,
        .er-table select {
          width: 100%;
          min-width: 65px;
          box-sizing: border-box;
          border: 1px solid #d3d8de;
          border-radius: 3px;
          padding: 4px;
          font-size: 11px;
        }

        .er-stock-ok {
          color: #166534;
          font-weight: 700;
        }

        .er-stock-low {
          color: #b45309;
          font-weight: 700;
        }

        .er-summary {
          display: grid;
          grid-template-columns: repeat(
            5,
            minmax(0, 1fr)
          );
          gap: 7px;
        }

        .er-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          margin-top: 10px;
        }

        .er-btn {
          border: 1px solid #c7ccd2;
          border-radius: 4px;
          padding: 6px 11px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          background: #ffffff;
        }

        .er-btn-primary {
          background: #1f2937;
          color: #ffffff;
          border-color: #1f2937;
        }

        @media (max-width: 1100px) {
          .er-grid,
          .er-info-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .er-summary {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }
        }

        @media (max-width: 700px) {
          .er-grid,
          .er-info-grid,
          .er-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* =====================================================
          1. RESERVATION DETAILS
      ===================================================== */}

      <div className="er-section">
        <div className="er-title">
          Export Stock Reservation
        </div>

        <div className="er-body">
          <div className="er-grid">
            <div className="er-field">
              <label className="er-label">
                Reservation No.
              </label>

              <input
                className="er-input"
                value={
                  form.reservationNo
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <ReservationDateField
              label="Reservation Date"
              value={
                form.reservationDate
              }
              onChange={(value) =>
                setForm(
                  (previous) => ({
                    ...previous,
                    reservationDate:
                      value,
                  })
                )
              }
            />

            <div className="er-field">
              <label className="er-label">
                Select Export Order *
              </label>

              <select
                className="er-select"
                value={
                  selectedOrderNo
                }
                onChange={(e) =>
                  handleOrderChange(
                    e.target.value
                  )
                }
              >
                <option value="">
                  -- Select Export Order --
                </option>

                {orders
                  .filter(
                    (order) =>
                      order.status !==
                      "Cancelled"
                  )
                  .map(
                    (order) => (
                      <option
                        key={order.id}
                        value={
                          order.exportOrderNo
                        }
                      >
                        {
                          order.exportOrderNo
                        }{" "}
                        —{" "}
                        {
                          order.customerName
                        }{" "}
                        —{" "}
                        {
                          order.status
                        }
                      </option>
                    )
                  )}
              </select>

              <div className="er-note">
                Reservation is created
                against an existing
                Export Order.
              </div>
            </div>

            <ReservationDateField
              label="Order Date"
              value={
                form.exportOrderDate
              }
              readOnly
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          2. CUSTOMER
      ===================================================== */}

      <div className="er-section">
        <div className="er-title">
          Customer / Buyer
        </div>

        <div className="er-body">
          <div className="er-grid">
            <div className="er-field">
              <label className="er-label">
                Customer Code
              </label>

              <input
                className="er-input"
                value={
                  form.customerCode
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="er-field">
              <label className="er-label">
                Customer
              </label>

              <input
                className="er-input"
                value={
                  form.customerName
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="er-field">
              <label className="er-label">
                Contact Person
              </label>

              <input
                className="er-input"
                value={
                  form.contactPerson
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="er-field">
              <label className="er-label">
                Country
              </label>

              <input
                className="er-input"
                value={
                  form.buyerCountry
                }
                readOnly
                style={readonlyStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          3. STOCK SUMMARY
      ===================================================== */}

      <div className="er-section">
        <div className="er-title">
          International Export Stock Position
        </div>

        <div className="er-body">
          <div className="er-summary">
            <div className="er-info-card">
              <div className="er-info-label">
                Physical Stock
              </div>

              <div className="er-info-value">
                {totalPhysicalStock.toFixed(
                  3
                )}
              </div>
            </div>

            <div className="er-info-card">
              <div className="er-info-label">
                Available to Reserve
              </div>

              <div className="er-info-value er-stock-ok">
                {totalReservableStock.toFixed(
                  3
                )}
              </div>
            </div>

            <div className="er-info-card">
              <div className="er-info-label">
                Current Reservation
              </div>

              <div className="er-info-value">
                {form.totalReservedQty.toFixed(
                  3
                )}
              </div>
            </div>

            <div className="er-info-card">
              <div className="er-info-label">
                Total Packages
              </div>

              <div className="er-info-value">
                {form.totalPackages}
              </div>
            </div>

            <div className="er-info-card">
              <div className="er-info-label">
                Total Net Weight
              </div>

              <div className="er-info-value">
                {form.totalNetWeight.toFixed(
                  3
                )}{" "}
                KG
              </div>
            </div>
          </div>

          <div className="er-note">
            <strong>
              Important:
            </strong>{" "}
            Reservation does not reduce
            physical stock. It only increases
            Reserved Qty. Actual stock movement
            will happen in the later Packing /
            Loading / Shipment workflow.
          </div>
        </div>
      </div>

      {/* =====================================================
          4. RESERVATION ITEMS
      ===================================================== */}

      <div className="er-section">
        <div className="er-title">
          Export Order Products → Stock Reservation
        </div>

        <div className="er-body">
          {!selectedOrder && (
            <div
              style={{
                padding: "12px",
                border:
                  "1px dashed #cfd5dc",
                borderRadius: "5px",
                background: "#fafafa",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              Please select an Export
              Order above to load its
              products.
            </div>
          )}

          {selectedOrder && (
            <>
              <div className="er-note">
                Select the Stock / Lot for
                each product and enter the
                quantity to reserve. Reservation
                Qty cannot exceed Order Qty or
                currently available reservable
                stock.
              </div>

              <div
                className="er-table-wrap"
                style={{
                  marginTop: "7px",
                }}
              >
                <table className="er-table">
                  <thead>
                    <tr>
                      <th>
                        Sr.
                      </th>

                      <th>
                        Product
                      </th>

                      <th>
                        Order Qty
                      </th>

                      <th>
                        Unit
                      </th>

                      <th>
                        Stock / Lot
                      </th>

                      <th>
                        Physical Stock
                      </th>

                      <th>
                        Already Reserved
                      </th>

                      <th>
                        Available to Reserve
                      </th>

                      <th>
                        Reserve Qty
                      </th>

                      <th>
                        Packing
                      </th>

                      <th>
                        Packages
                      </th>

                      <th>
                        Net KG
                      </th>

                      <th>
                        Gross KG
                      </th>

                      <th>
                        CBM
                      </th>

                      <th>
                        Marks & Numbers
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {form.items.map(
                      (
                        item,
                        index
                      ) => {
                        const productStock =
                          getProductStock(
                            item.productCode
                          );

                        const selectedStock =
                          productStock.find(
                            (
                              stockItem
                            ) =>
                              stockItem.id ===
                              item.reservedStockId
                          );

                        const physicalStock =
                          selectedStock
                            ? Number(
                                selectedStock.availableQty ||
                                  0
                              )
                            : productStock.reduce(
                                (
                                  sum,
                                  stockItem
                                ) =>
                                  sum +
                                  Number(
                                    stockItem.availableQty ||
                                      0
                                  ),
                                0
                              );

                        const alreadyReserved =
                          selectedStock
                            ? Number(
                                selectedStock.reservedQty ||
                                  0
                              )
                            : productStock.reduce(
                                (
                                  sum,
                                  stockItem
                                ) =>
                                  sum +
                                  Number(
                                    stockItem.reservedQty ||
                                      0
                                  ),
                                0
                              );

                        const availableToReserve =
                          getCurrentItemReservable(
                            item
                          );

                        const reserveQty =
                          Number(
                            item.reserveQty ||
                              0
                          );

                        const exceedsAvailable =
                          reserveQty >
                          availableToReserve;

                        const exceedsOrder =
                          reserveQty >
                          Number(
                            item.orderQty ||
                              0
                          );

                        return (
                          <tr
                            key={`${getOrderItemKey(
                              selectedOrder.items[
                                index
                              ],
                              index
                            )}`}
                          >
                            <td>
                              {index +
                                1}
                            </td>

                            <td>
                              <div
                                style={{
                                  fontWeight:
                                    700,
                                  marginBottom:
                                    "2px",
                                }}
                              >
                                {
                                  item.productName
                                }
                              </div>

                              <div
                                style={{
                                  fontSize:
                                    "10px",
                                  color:
                                    "#6b7280",
                                }}
                              >
                                {
                                  item.productCode
                                }
                              </div>
                            </td>

                            <td>
                              {Number(
                                item.orderQty ||
                                  0
                              ).toFixed(
                                3
                              )}
                            </td>

                            <td>
                              {
                                item.unit
                              }
                            </td>

                            <td>
                              <select
                                value={
                                  item.reservedStockId
                                }
                                onChange={(
                                  e
                                ) =>
                                  handleStockChange(
                                    index,
                                    e.target
                                      .value
                                  )
                                }
                              >
                                <option value="">
                                  -- Select Stock / Lot --
                                </option>

                                {productStock
                                  .filter(
                                    (
                                      stockItem
                                    ) =>
                                      stockItem.unit ===
                                      item.unit
                                  )
                                  .map(
                                    (
                                      stockItem
                                    ) => (
                                      <option
                                        key={
                                          stockItem.id
                                        }
                                        value={
                                          stockItem.id
                                        }
                                      >
                                        {
                                          stockItem.lotBatchNo
                                        }{" "}
                                        —{" "}
                                        {Number(
                                          stockItem.availableQty ||
                                            0
                                        ).toFixed(
                                          3
                                        )}{" "}
                                        {
                                          stockItem.unit
                                        }
                                      </option>
                                    )
                                  )}
                              </select>

                              {productStock.filter(
                                (
                                  stockItem
                                ) =>
                                  stockItem.unit ===
                                  item.unit
                              ).length ===
                                0 && (
                                <div
                                  style={{
                                    marginTop:
                                      "3px",
                                    fontSize:
                                      "10px",
                                    color:
                                      "#b91c1c",
                                  }}
                                >
                                  No matching
                                  stock found.
                                </div>
                              )}
                            </td>

                            <td>
                              {physicalStock.toFixed(
                                3
                              )}{" "}
                              {
                                item.unit
                              }
                            </td>

                            <td>
                              {alreadyReserved.toFixed(
                                3
                              )}{" "}
                              {
                                item.unit
                              }
                            </td>

                            <td>
                              <span
                                className={
                                  availableToReserve >
                                  0
                                    ? "er-stock-ok"
                                    : "er-stock-low"
                                }
                              >
                                {availableToReserve.toFixed(
                                  3
                                )}{" "}
                                {
                                  item.unit
                                }
                              </span>
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                max={Math.min(
                                  Number(
                                    item.orderQty ||
                                      0
                                  ),
                                  availableToReserve
                                )}
                                step="0.001"
                                value={
                                  item.reserveQty
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateItem(
                                    index,
                                    "reserveQty",
                                    Math.max(
                                      Number(
                                        e.target
                                          .value
                                      ) || 0,
                                      0
                                    )
                                  )
                                }
                                style={
                                  exceedsAvailable ||
                                  exceedsOrder
                                    ? {
                                        border:
                                          "1px solid #dc2626",
                                        background:
                                          "#fef2f2",
                                      }
                                    : undefined
                                }
                              />

                              {exceedsOrder && (
                                <div
                                  style={{
                                    marginTop:
                                      "3px",
                                    fontSize:
                                      "9px",
                                    color:
                                      "#b91c1c",
                                  }}
                                >
                                  Exceeds
                                  Order Qty
                                </div>
                              )}

                              {!exceedsOrder &&
                                exceedsAvailable && (
                                  <div
                                    style={{
                                      marginTop:
                                        "3px",
                                      fontSize:
                                        "9px",
                                      color:
                                        "#b91c1c",
                                    }}
                                  >
                                    Exceeds
                                    available
                                    stock
                                  </div>
                                )}
                            </td>

                            <td>
                              <input
                                value={
                                  item.packingType
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateItem(
                                    index,
                                    "packingType",
                                    e.target
                                      .value
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={
                                  item.packageQty
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateItem(
                                    index,
                                    "packageQty",
                                    Math.max(
                                      Number(
                                        e.target
                                          .value
                                      ) || 0,
                                      0
                                    )
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
                                  item.netWeight
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateItem(
                                    index,
                                    "netWeight",
                                    Math.max(
                                      Number(
                                        e.target
                                          .value
                                      ) || 0,
                                      0
                                    )
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
                                  item.grossWeight
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateItem(
                                    index,
                                    "grossWeight",
                                    Math.max(
                                      Number(
                                        e.target
                                          .value
                                      ) || 0,
                                      0
                                    )
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
    item.cbm
  }
  onChange={(
    e
  ) =>
    updateItem(
      index,
      "cbm",
      Math.max(
        Number(
          e.target
            .value
        ) || 0,
        0
      )
    )
  }
/>
                            </td>

                            <td>
                              <input
                                value={
                                  item.marksNumbers
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateItem(
                                    index,
                                    "marksNumbers",
                                    e.target
                                      .value
                                  )
                                }
                              />
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          5. WEIGHT SUMMARY
      ===================================================== */}

      <div className="er-section">
        <div className="er-title">
          Reservation Summary
        </div>

        <div className="er-body">
          <div className="er-grid-3">
            <div className="er-field">
              <label className="er-label">
                Total Reserved Qty
              </label>

              <input
                className="er-input"
                value={form.totalReservedQty.toFixed(
                  3
                )}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="er-field">
              <label className="er-label">
                Total Packages
              </label>

              <input
                className="er-input"
                value={
                  form.totalPackages
                }
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="er-field">
              <label className="er-label">
                Total Net Weight
              </label>

              <input
                className="er-input"
                value={form.totalNetWeight.toFixed(
                  3
                )}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="er-field">
              <label className="er-label">
                Total Gross Weight
              </label>

              <input
                className="er-input"
                value={form.totalGrossWeight.toFixed(
                  3
                )}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="er-field">
              <label className="er-label">
                Total CBM
              </label>

              <input
                className="er-input"
                value={form.totalCBM.toFixed(
                  3
                )}
                readOnly
                style={readonlyStyle}
              />
            </div>

            <div className="er-field">
              <label className="er-label">
                Status
              </label>

              <select
                className="er-select"
                value={form.status}
                onChange={(e) =>
                  setForm(
                    (previous) => ({
                      ...previous,
                      status:
                        e.target
                          .value as ExportReservationStatus,
                    })
                  )
                }
              >
                {STATUS_OPTIONS.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div
            style={{
              marginTop: "8px",
            }}
          >
            <label className="er-label">
              Remarks
            </label>

            <textarea
              className="er-textarea"
              value={
                form.remarks
              }
              onChange={(e) =>
                setForm(
                  (previous) => ({
                    ...previous,
                    remarks:
                      e.target
                        .value,
                  })
                )
              }
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="er-actions">
        {onCancel && (
          <button
            type="button"
            className="er-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          className="er-btn"
          onClick={handleReset}
        >
          Reset
        </button>

        <button
          type="submit"
          className="er-btn er-btn-primary"
        >
          {initialData
            ? "Update Reservation"
            : "Save Reservation"}
        </button>
      </div>
    </form>
  );
}