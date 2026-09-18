"use client";

import { useEffect, useMemo, useState } from "react";
import { loadProducts } from "../../../product/components/ProductStorage";
import { loadSuppliers } from "../../../components/supplier/SupplierStorage";
import {
  ExportPurchase,
  ExportPurchaseItem,
  ExportPurchaseStatus,
} from "./ExportPurchaseTypes";

type ExportPurchaseFormProps = {
  purchaseNo: string;
  initialData?: ExportPurchase | null;
  onSave: (purchase: ExportPurchase) => void;
  onCancel?: () => void;
};

type ProductOption = {
  code: string;
  name: string;
  unit: string;
  active?: boolean;
};

type SupplierOption = {
  code?: string;
  name?: string;
  contactPerson?: string;
};

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
};

const displayDate = (value: string) => {
  if (!value) return "";

  const [y, m, d] = value.split("-");

  return y && m && d ? `${d}/${m}/${y}` : value;
};

const emptyItem = (): ExportPurchaseItem => ({
  productCode: "",
  productName: "",
  lotBatchNo: "",
  qty: 0,
  receivedQty: 0,
  unit: "KG",
  unitPrice: 0,
  amount: 0,
  packingType: "",
  packageQty: 0,
  netWeight: 0,
  grossWeight: 0,
  cbm: 0,
  remarks: "",
});

const normalizeInitialItems = (
  purchase?: ExportPurchase | null
): ExportPurchaseItem[] => {
  if (!purchase?.items?.length) {
    return [emptyItem()];
  }

  return purchase.items.map((item) => ({
    ...item,
    qty: Number(item.qty || 0),
    receivedQty: Number(item.receivedQty || 0),
    unitPrice: Number(item.unitPrice || 0),
    amount:
      Number(item.qty || 0) * Number(item.unitPrice || 0),
    packageQty: Number(item.packageQty || 0),
    netWeight: Number(item.netWeight || 0),
    grossWeight: Number(item.grossWeight || 0),
    cbm: Number(item.cbm || 0),
  }));
};

export default function ExportPurchaseForm({
  purchaseNo,
  initialData,
  onSave,
  onCancel,
}: ExportPurchaseFormProps) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchaseDate || todayISO()
  );

  const [supplierCode, setSupplierCode] = useState(
    initialData?.supplierCode || ""
  );

  const [supplierName, setSupplierName] = useState(
    initialData?.supplierName || ""
  );

  const [contactPerson, setContactPerson] = useState(
    initialData?.contactPerson || ""
  );

  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState(
    initialData?.supplierInvoiceNo || ""
  );

  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState(
    initialData?.supplierInvoiceDate || ""
  );

  const [currency, setCurrency] = useState(
    initialData?.currency || "INR"
  );

  const [exchangeRate, setExchangeRate] = useState(
    initialData?.exchangeRate ?? 1
  );

  const [paymentTerms, setPaymentTerms] = useState(
    initialData?.paymentTerms || "Advance"
  );

  const [paymentMethod, setPaymentMethod] = useState(
    initialData?.paymentMethod || "Bank Transfer"
  );

  const [incoterm, setIncoterm] = useState(
    initialData?.incoterm || "FOB"
  );

  const [shipmentMode, setShipmentMode] = useState(
    initialData?.shipmentMode || "Sea"
  );

  const [expectedReceiptDate, setExpectedReceiptDate] = useState(
    initialData?.expectedReceiptDate || ""
  );

  const [status, setStatus] = useState<ExportPurchaseStatus>(
    initialData?.status || "Draft"
  );

  const [items, setItems] = useState<ExportPurchaseItem[]>(
    normalizeInitialItems(initialData)
  );

  const [freight, setFreight] = useState(
    initialData?.freight ?? 0
  );

  const [insurance, setInsurance] = useState(
    initialData?.insurance ?? 0
  );

  const [customsDuty, setCustomsDuty] = useState(
    initialData?.customsDuty ?? 0
  );

  const [portCharges, setPortCharges] = useState(
    initialData?.portCharges ?? 0
  );

  const [clearingCharges, setClearingCharges] = useState(
    initialData?.clearingCharges ?? 0
  );

  const [otherCharges, setOtherCharges] = useState(
    initialData?.otherCharges ?? 0
  );

  const [remarks, setRemarks] = useState(
    initialData?.remarks || ""
  );

  useEffect(() => {
    const loadedProducts = loadProducts();
    const loadedSuppliers = loadSuppliers();

    setProducts(
      loadedProducts
        .filter((product: any) => product.active !== false)
        .map((product: any) => ({
          code: product.code,
          name: product.name,
          unit: product.unit || "KG",
          active: product.active,
        }))
    );

    setSuppliers(
      loadedSuppliers.map((supplier: any) => ({
        code: supplier.code,
        name: supplier.name,
        contactPerson: supplier.contactPerson || "",
      }))
    );
  }, []);

  const totalGoodsValue = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0
      ),
    [items]
  );

  const totalPurchaseValue =
    totalGoodsValue +
    Number(freight || 0) +
    Number(insurance || 0) +
    Number(customsDuty || 0) +
    Number(portCharges || 0) +
    Number(clearingCharges || 0) +
    Number(otherCharges || 0);

  const inrEquivalent =
    currency === "INR"
      ? totalPurchaseValue
      : totalPurchaseValue *
        Number(exchangeRate || 0);

  const totalPackages = items.reduce(
    (total, item) =>
      total + Number(item.packageQty || 0),
    0
  );

  const totalNetWeight = items.reduce(
    (total, item) =>
      total + Number(item.netWeight || 0),
    0
  );

  const totalGrossWeight = items.reduce(
    (total, item) =>
      total + Number(item.grossWeight || 0),
    0
  );

  const totalCBM = items.reduce(
    (total, item) =>
      total + Number(item.cbm || 0),
    0
  );

  const totalReceivedQty = items.reduce(
    (total, item) =>
      total + Number(item.receivedQty || 0),
    0
  );

  const updateItem = (
    index: number,
    patch: Partial<ExportPurchaseItem>
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const next = {
          ...item,
          ...patch,
        };

        if (patch.productCode !== undefined) {
          const product = products.find(
            (option) =>
              option.code === patch.productCode
          );

          if (product) {
            next.productName = product.name;
            next.unit = product.unit;
          }
        }

        next.amount =
          Number(next.qty || 0) *
          Number(next.unitPrice || 0);

        if (
          patch.qty !== undefined &&
          Number(next.receivedQty || 0) >
            Number(next.qty || 0)
        ) {
          next.receivedQty = Number(next.qty || 0);
        }

        if (
          patch.receivedQty !== undefined &&
          Number(next.receivedQty || 0) >
            Number(next.qty || 0)
        ) {
          next.receivedQty = Number(next.qty || 0);
        }

        if (Number(next.receivedQty || 0) < 0) {
          next.receivedQty = 0;
        }

        return next;
      })
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      emptyItem(),
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;

    setItems((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  };

  const resetForm = () => {
    setPurchaseDate(todayISO());
    setSupplierCode("");
    setSupplierName("");
    setContactPerson("");
    setSupplierInvoiceNo("");
    setSupplierInvoiceDate("");
    setCurrency("INR");
    setExchangeRate(1);
    setPaymentTerms("Advance");
    setPaymentMethod("Bank Transfer");
    setIncoterm("FOB");
    setShipmentMode("Sea");
    setExpectedReceiptDate("");
    setStatus("Draft");
    setItems([emptyItem()]);
    setFreight(0);
    setInsurance(0);
    setCustomsDuty(0);
    setPortCharges(0);
    setClearingCharges(0);
    setOtherCharges(0);
    setRemarks("");
  };

  const handleSupplierChange = (code: string) => {
    setSupplierCode(code);

    const supplier = suppliers.find(
      (item) => item.code === code
    );

    setSupplierName(supplier?.name || "");
    setContactPerson(
      supplier?.contactPerson || ""
    );
  };

  const handleStatusChange = (
    nextStatus: ExportPurchaseStatus
  ) => {
    setStatus(nextStatus);

    if (nextStatus === "Received") {
      setItems((current) =>
        current.map((item) => ({
          ...item,
          receivedQty: Number(item.qty || 0),
        }))
      );
      return;
    }

    if (
      nextStatus === "Draft" ||
      nextStatus === "Cancelled"
    ) {
      setItems((current) =>
        current.map((item) => ({
          ...item,
          receivedQty: 0,
        }))
      );
    }
  };

  const handleSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!purchaseDate) {
      alert("Purchase Date is required.");
      return;
    }

    if (!supplierCode || !supplierName) {
      alert("Please select a Supplier.");
      return;
    }

    if (items.length === 0) {
      alert("At least one product is required.");
      return;
    }

    const invalidItem = items.find(
      (item) =>
        !item.productCode ||
        !item.lotBatchNo.trim() ||
        Number(item.qty) <= 0 ||
        Number(item.unitPrice) < 0
    );

    if (invalidItem) {
      alert(
        "Each product must have Product, Lot/Batch, Quantity and valid Unit Price."
      );
      return;
    }

    const invalidReceivedQty = items.find(
      (item) =>
        Number(item.receivedQty || 0) < 0 ||
        Number(item.receivedQty || 0) >
          Number(item.qty || 0)
    );

    if (invalidReceivedQty) {
      alert(
        "Received Quantity cannot be less than 0 or greater than Purchase Quantity."
      );
      return;
    }

    if (
      status === "Received" &&
      items.some(
        (item) =>
          Number(item.receivedQty || 0) !==
          Number(item.qty || 0)
      )
    ) {
      alert(
        "For Received status, Received Quantity must equal Purchase Quantity for every product."
      );
      return;
    }

    if (
      status === "Partially Received" &&
      items.every(
        (item) =>
          Number(item.receivedQty || 0) <= 0
      )
    ) {
      alert(
        "For Partially Received status, enter the actual Received Quantity."
      );
      return;
    }

    if (
      status === "Partially Received" &&
      items.every(
        (item) =>
          Number(item.receivedQty || 0) >=
          Number(item.qty || 0)
      )
    ) {
      alert(
        "For Partially Received status, at least one product must have pending quantity."
      );
      return;
    }

    if (
      (status === "Draft" ||
        status === "Cancelled") &&
      totalReceivedQty > 0
    ) {
      alert(
        "Draft or Cancelled purchase cannot have Received Quantity."
      );
      return;
    }

    if (
      currency !== "INR" &&
      Number(exchangeRate) <= 0
    ) {
      alert(
        "Exchange Rate must be greater than 0."
      );
      return;
    }

    const duplicateLots = new Set<string>();

    for (const item of items) {
      const key =
        `${item.productCode}__${item.lotBatchNo
          .trim()
          .toUpperCase()}`;

      if (duplicateLots.has(key)) {
        alert(
          "Duplicate Product + Lot/Batch is not allowed."
        );
        return;
      }

      duplicateLots.add(key);
    }

    const now = new Date().toISOString();

    const normalizedItems =
      items.map((item) => ({
        ...item,
        qty: Number(item.qty || 0),
        receivedQty: Number(
          item.receivedQty || 0
        ),
        unitPrice: Number(
          item.unitPrice || 0
        ),
        amount:
          Number(item.qty || 0) *
          Number(item.unitPrice || 0),
        packageQty: Number(
          item.packageQty || 0
        ),
        netWeight: Number(
          item.netWeight || 0
        ),
        grossWeight: Number(
          item.grossWeight || 0
        ),
        cbm: Number(item.cbm || 0),
        lotBatchNo:
          item.lotBatchNo.trim(),
        remarks:
          item.remarks.trim(),
      }));

    const purchase: ExportPurchase = {
      id:
        initialData?.id ||
        crypto.randomUUID(),

      purchaseNo,
      purchaseDate,

      supplierCode,
      supplierName,
      contactPerson,

      supplierInvoiceNo:
        supplierInvoiceNo.trim(),

      supplierInvoiceDate,

      currency,

      exchangeRate:
        Number(exchangeRate || 0),

      paymentTerms,
      paymentMethod,

      incoterm,
      shipmentMode,

      expectedReceiptDate,

      items: normalizedItems,

      totalPackages,
      totalNetWeight,
      totalGrossWeight,
      totalCBM,

      totalGoodsValue,

      freight: Number(freight || 0),
      insurance: Number(insurance || 0),
      customsDuty: Number(
        customsDuty || 0
      ),
      portCharges: Number(
        portCharges || 0
      ),
      clearingCharges: Number(
        clearingCharges || 0
      ),
      otherCharges: Number(
        otherCharges || 0
      ),

      totalPurchaseValue,
      inrEquivalent,

      status,

      remarks: remarks.trim(),

      createdAt:
        initialData?.createdAt || now,

      updatedAt: now,
    };

    onSave(purchase);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 7px",
    border: "1px solid #d1d5db",
    borderRadius: "5px",
    fontSize: "11px",
    background: "#ffffff",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "3px",
    fontSize: "9px",
    fontWeight: 800,
    color: "#374151",
  };

  const sectionStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "7px",
    padding: "9px",
    marginBottom: "8px",
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={sectionStyle}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 900,
            color: "#14532d",
            marginBottom: "7px",
          }}
        >
          📥 Export Purchase Details
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(6, minmax(0, 1fr))",
            gap: "7px",
          }}
        >
          <div>
            <label style={labelStyle}>
              Purchase No.
            </label>

            <input
              value={purchaseNo}
              readOnly
              style={{
                ...inputStyle,
                background: "#f3f4f6",
                fontWeight: 800,
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Purchase Date *
            </label>

            <input
              type="date"
              value={purchaseDate}
              onChange={(e) =>
                setPurchaseDate(e.target.value)
              }
              style={inputStyle}
            />

            <div
              style={{
                marginTop: "2px",
                fontSize: "8px",
                color: "#6b7280",
              }}
            >
              {displayDate(purchaseDate)}
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Supplier *
            </label>

            <select
              value={supplierCode}
              onChange={(e) =>
                handleSupplierChange(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                Select Supplier
              </option>

              {suppliers.map((supplier) => (
                <option
                  key={supplier.code}
                  value={supplier.code}
                >
                  {supplier.code} —{" "}
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Contact Person
            </label>

            <input
              value={contactPerson}
              readOnly
              style={{
                ...inputStyle,
                background: "#f9fafb",
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Supplier Invoice No.
            </label>

            <input
              value={supplierInvoiceNo}
              onChange={(e) =>
                setSupplierInvoiceNo(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Supplier Invoice Date
            </label>

            <input
              type="date"
              value={supplierInvoiceDate}
              onChange={(e) =>
                setSupplierInvoiceDate(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Currency
            </label>

            <select
              value={currency}
              onChange={(e) =>
                setCurrency(e.target.value)
              }
              style={inputStyle}
            >
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
              <option>AED</option>
              <option>SAR</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Exchange Rate
            </label>

            <input
              type="number"
              min="0"
              step="0.0001"
              value={exchangeRate}
              onChange={(e) =>
                setExchangeRate(
                  Number(e.target.value)
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Payment Terms
            </label>

            <select
              value={paymentTerms}
              onChange={(e) =>
                setPaymentTerms(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option>Advance</option>
              <option>TT</option>
              <option>LC</option>
              <option>Credit</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Payment Method
            </label>

            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option>Bank Transfer</option>
              <option>LC</option>
              <option>Cash</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Incoterm
            </label>

            <select
              value={incoterm}
              onChange={(e) =>
                setIncoterm(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option>FOB</option>
              <option>CIF</option>
              <option>CFR</option>
              <option>EXW</option>
              <option>FCA</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Shipment Mode
            </label>

            <select
              value={shipmentMode}
              onChange={(e) =>
                setShipmentMode(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option>Sea</option>
              <option>Air</option>
              <option>Road</option>
              <option>Rail</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Expected Receipt
            </label>

            <input
              type="date"
              value={expectedReceiptDate}
              onChange={(e) =>
                setExpectedReceiptDate(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Status
            </label>

            <select
              value={status}
              onChange={(e) =>
                handleStatusChange(
                  e.target
                    .value as ExportPurchaseStatus
                )
              }
              style={inputStyle}
            >
              <option>Draft</option>
              <option>Received</option>
              <option>
                Partially Received
              </option>
              <option>Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "7px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 900,
              color: "#14532d",
            }}
          >
            📦 Products / Lots
          </div>

          <button
            type="button"
            onClick={addItem}
            style={{
              border: "none",
              borderRadius: "5px",
              padding: "6px 9px",
              background: "#14532d",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: 800,
            }}
          >
            + Add Product
          </button>
        </div>

        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "1380px",
              fontSize: "9px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f3f4f6",
                }}
              >
                {[
                  "Product",
                  "Lot / Batch *",
                  "Qty *",
                  "Received Qty",
                  "Unit",
                  "Unit Price",
                  "Amount",
                  "Packing",
                  "Packages",
                  "Net KG",
                  "Gross KG",
                  "CBM",
                  "Remarks",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "6px 5px",
                      border:
                        "1px solid #e5e7eb",
                      textAlign: "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr
                  key={`${item.productCode}-${item.lotBatchNo}-${index}`}
                >
                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                    }}
                  >
                    <select
                      value={item.productCode}
                      onChange={(e) =>
                        updateItem(index, {
                          productCode:
                            e.target.value,
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="">
                        Select Product
                      </option>

                      {products.map(
                        (product) => (
                          <option
                            key={product.code}
                            value={
                              product.code
                            }
                          >
                            {product.code} —{" "}
                            {product.name}
                          </option>
                        )
                      )}
                    </select>
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                    }}
                  >
                    <input
                      value={item.lotBatchNo}
                      onChange={(e) =>
                        updateItem(index, {
                          lotBatchNo:
                            e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="LOT-001"
                    />
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={item.qty}
                      onChange={(e) =>
                        updateItem(index, {
                          qty: Number(
                            e.target.value
                          ),
                        })
                      }
                      style={{
                        ...inputStyle,
                        width: "75px",
                      }}
                    />
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      max={item.qty}
                      step="0.001"
                      value={
                        item.receivedQty
                      }
                      onChange={(e) =>
                        updateItem(index, {
                          receivedQty:
                            Number(
                              e.target.value
                            ),
                        })
                      }
                      disabled={
                        status ===
                          "Draft" ||
                        status ===
                          "Cancelled" ||
                        status ===
                          "Received"
                      }
                      style={{
                        ...inputStyle,
                        width: "85px",
                        background:
                          status ===
                            "Draft" ||
                          status ===
                            "Cancelled" ||
                          status ===
                            "Received"
                            ? "#f3f4f6"
                            : "#ffffff",
                      }}
                    />
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                    }}
                  >
                    <input
                      value={item.unit}
                      readOnly
                      style={{
                        ...inputStyle,
                        width: "55px",
                        background:
                          "#f9fafb",
                      }}
                    />
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(index, {
                          unitPrice:
                            Number(
                              e.target.value
                            ),
                        })
                      }
                      style={{
                        ...inputStyle,
                        width: "85px",
                      }}
                    />
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                      fontWeight: 800,
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {Number(
                      item.amount || 0
                    ).toFixed(2)}
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                    }}
                  >
                    <input
                      value={
                        item.packingType
                      }
                      onChange={(e) =>
                        updateItem(index, {
                          packingType:
                            e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="PP Bag"
                    />
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        item.packageQty
                      }
                      onChange={(e) =>
                        updateItem(index, {
                          packageQty:
                            Number(
                              e.target.value
                            ),
                        })
                      }
                      style={{
                        ...inputStyle,
                        width: "70px",
                      }}
                    />
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={
                        item.netWeight
                      }
                      onChange={(e) =>
                        updateItem(index, {
                          netWeight:
                            Number(
                              e.target.value
                            ),
                        })
                      }
                      style={{
                        ...inputStyle,
                        width: "75px",
                      }}
                    />
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={
                        item.grossWeight
                      }
                      onChange={(e) =>
                        updateItem(index, {
                          grossWeight:
                            Number(
                              e.target.value
                            ),
                        })
                      }
                      style={{
                        ...inputStyle,
                        width: "75px",
                      }}
                    />
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={item.cbm}
                      onChange={(e) =>
                        updateItem(index, {
                          cbm: Number(
                            e.target.value
                          ),
                        })
                      }
                      style={{
                        ...inputStyle,
                        width: "70px",
                      }}
                    />
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                    }}
                  >
                    <input
                      value={item.remarks}
                      onChange={(e) =>
                        updateItem(index, {
                          remarks:
                            e.target.value,
                        })
                      }
                      style={inputStyle}
                    />
                  </td>

                  <td
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      padding: "4px",
                      textAlign: "center",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        removeItem(index)
                      }
                      disabled={
                        items.length === 1
                      }
                      style={{
                        border: "none",
                        borderRadius: "4px",
                        padding:
                          "5px 7px",
                        background:
                          items.length ===
                          1
                            ? "#e5e7eb"
                            : "#fee2e2",
                        color:
                          items.length ===
                          1
                            ? "#9ca3af"
                            : "#b91c1c",
                        cursor:
                          items.length ===
                          1
                            ? "default"
                            : "pointer",
                        fontSize: "9px",
                        fontWeight: 800,
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: "6px",
            fontSize: "9px",
            color: "#6b7280",
          }}
        >
          Received Qty is the actual quantity physically received
          for export operations. Draft/Cancelled = 0, Received =
          full quantity.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: "8px",
        }}
      >
        <div style={sectionStyle}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 900,
              color: "#14532d",
              marginBottom: "7px",
            }}
          >
            🚚 Additional / Landed Cost
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "7px",
            }}
          >
            {[
              [
                "Freight",
                freight,
                setFreight,
              ],
              [
                "Insurance",
                insurance,
                setInsurance,
              ],
              [
                "Customs Duty",
                customsDuty,
                setCustomsDuty,
              ],
              [
                "Port Charges",
                portCharges,
                setPortCharges,
              ],
              [
                "Clearing Charges",
                clearingCharges,
                setClearingCharges,
              ],
              [
                "Other Charges",
                otherCharges,
                setOtherCharges,
              ],
            ].map(
              ([label, value, setter]) => (
                <div key={String(label)}>
                  <label
                    style={labelStyle}
                  >
                    {String(label)}
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={Number(value)}
                    onChange={(e) =>
                      (
                        setter as React.Dispatch<
                          React.SetStateAction<number>
                        >
                      )(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    style={inputStyle}
                  />
                </div>
              )
            )}
          </div>
        </div>

        <div style={sectionStyle}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 900,
              color: "#14532d",
              marginBottom: "7px",
            }}
          >
            💰 Purchase Summary
          </div>

          <div
            style={{
              display: "grid",
              gap: "4px",
              fontSize: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>Goods Value</span>

              <strong>
                {currency}{" "}
                {totalGoodsValue.toFixed(
                  2
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                Total Purchase
              </span>

              <strong>
                {currency}{" "}
                {totalPurchaseValue.toFixed(
                  2
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                INR Equivalent
              </span>

              <strong>
                ₹{" "}
                {inrEquivalent.toFixed(
                  2
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                Packages / Net / Gross / CBM
              </span>

              <strong>
                {totalPackages} /{" "}
                {totalNetWeight.toFixed(
                  3
                )}{" "}
                /{" "}
                {totalGrossWeight.toFixed(
                  3
                )}{" "}
                /{" "}
                {totalCBM.toFixed(3)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                paddingTop: "4px",
                marginTop: "3px",
                borderTop:
                  "1px solid #e5e7eb",
              }}
            >
              <span>
                Total Received Qty
              </span>

              <strong>
                {totalReceivedQty.toFixed(
                  3
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>
          Remarks
        </label>

        <textarea
          value={remarks}
          onChange={(e) =>
            setRemarks(e.target.value)
          }
          rows={2}
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "7px",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={resetForm}
          style={{
            border:
              "1px solid #d1d5db",
            borderRadius: "5px",
            padding: "7px 12px",
            background: "#ffffff",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: 800,
          }}
        >
          Reset
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              border:
                "1px solid #d1d5db",
              borderRadius: "5px",
              padding: "7px 12px",
              background: "#f3f4f6",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: 800,
            }}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          style={{
            border: "none",
            borderRadius: "5px",
            padding: "7px 14px",
            background: "#14532d",
            color: "#ffffff",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: 900,
          }}
        >
          {initialData
            ? "Update Export Purchase"
            : "Save Export Purchase"}
        </button>
      </div>
    </form>
  );
}