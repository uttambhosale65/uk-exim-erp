"use client";

import { useEffect, useState } from "react";

import {
  Purchase,
  PurchaseItem,
} from "./PurchaseTypes";

import {
  loadProducts,
} from "../../../product/components/ProductStorage";

import { Product } from "../../../product/components/ProductTypes";

import {
  loadSuppliers,
} from "../../supplier/SupplierStorage";

import { Supplier } from "../../supplier/SupplierTypes";

/* =========================================================
   PURCHASE FORM PROPS
========================================================= */

type PurchaseFormProps = {
  purchaseNo: string;
  editingPurchase?: Purchase | null;
  onSave: (purchase: Purchase) => void;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function PurchaseForm({
  purchaseNo,
  editingPurchase,
  onSave,
}: PurchaseFormProps) {
  /* =======================================================
     MASTER DATA
  ======================================================= */

  const [products, setProducts] =
    useState<Product[]>([]);

  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const [productSearch, setProductSearch] =
    useState("");

  const [supplierSearch, setSupplierSearch] =
    useState("");

  /* =======================================================
     CURRENT PRODUCT ENTRY

     This object is used only while entering
     one product before adding it to items[].
  ======================================================= */

  const [currentItem, setCurrentItem] =
    useState<PurchaseItem>({
      productCode: "",
      productName: "",
      hsn: "",
      unit: "KG",

      qty: 0,
      rate: 0,
      amount: 0,

      gst: 5,
      gstAmount: 0,
      netAmount: 0,
    });

  /* =======================================================
     GRN ITEMS

     This is the actual Multi Product collection.
  ======================================================= */

  const [purchaseItems, setPurchaseItems] =
    useState<PurchaseItem[]>([]);

  /* =======================================================
     EDITING ITEM INDEX

     null = adding a new product
     number = editing an existing row
  ======================================================= */

  const [editingItemIndex, setEditingItemIndex] =
    useState<number | null>(null);

  /* =======================================================
     EMPTY PURCHASE / GRN
  ======================================================= */

  const emptyPurchase = (): Purchase => ({
    id: crypto.randomUUID(),

    purchaseNo,

    purchaseDate: new Date()
      .toISOString()
      .split("T")[0],

    invoiceNo: "",

    supplierCode: "",
    supplierName: "",

    items: [],

    totalQty: 0,
    totalAmount: 0,
    totalGstAmount: 0,
    totalNetAmount: 0,

    remarks: "",
  });

  /* =======================================================
     PURCHASE HEADER
  ======================================================= */

  const [purchase, setPurchase] =
    useState<Purchase>(
      emptyPurchase()
    );

  /* =======================================================
     LOAD MASTER DATA
  ======================================================= */

  useEffect(() => {
    setProducts(loadProducts());
    setSuppliers(loadSuppliers());
  }, []);

  /* =======================================================
     EDIT / NEW GRN
  ======================================================= */

  useEffect(() => {
    if (editingPurchase) {
      setPurchase(editingPurchase);

      setPurchaseItems(
        editingPurchase.items ?? []
      );

      setProductSearch("");

      setSupplierSearch(
        editingPurchase.supplierCode &&
        editingPurchase.supplierName
          ? `${editingPurchase.supplierCode} - ${editingPurchase.supplierName}`
          : ""
      );

      setCurrentItem({
        productCode: "",
        productName: "",
        hsn: "",
        unit: "KG",

        qty: 0,
        rate: 0,
        amount: 0,

        gst: 5,
        gstAmount: 0,
        netAmount: 0,
      });

      setEditingItemIndex(null);
    } else {
      const newPurchase =
        emptyPurchase();

      setPurchase(newPurchase);

      setPurchaseItems([]);

      setProductSearch("");
      setSupplierSearch("");

      setCurrentItem({
        productCode: "",
        productName: "",
        hsn: "",
        unit: "KG",

        qty: 0,
        rate: 0,
        amount: 0,

        gst: 5,
        gstAmount: 0,
        netAmount: 0,
      });

      setEditingItemIndex(null);
    }
  }, [purchaseNo, editingPurchase]);

  /* =======================================================
     SUPPLIER CHANGE
  ======================================================= */

  const handleSupplierChange = (
    supplierCode: string
  ) => {
    const supplier =
      suppliers.find(
        (item) =>
          item.code === supplierCode &&
          item.status === "Active"
      );

    if (!supplier) {
      setPurchase((prev) => ({
        ...prev,
        supplierCode: "",
        supplierName: "",
      }));

      return;
    }

    setPurchase((prev) => ({
      ...prev,
      supplierCode:
        supplier.code,

      supplierName:
        supplier.name,
    }));
  };

  /* =======================================================
     PRODUCT CHANGE
  ======================================================= */

  const handleProductChange = (
    productCode: string
  ) => {
    const product =
      products.find(
        (item) =>
          item.code === productCode &&
          item.active
      );

    if (!product) {
      setCurrentItem({
        productCode: "",
        productName: "",
        hsn: "",
        unit: "KG",

        qty: 0,
        rate: 0,
        amount: 0,

        gst: 5,
        gstAmount: 0,
        netAmount: 0,
      });

      return;
    }

    const gstRate =
      parseFloat(
        String(product.gst)
          .replace("%", "")
      ) || 0;

    const rate =
      Number(product.purchase) || 0;

    const qty =
      Number(currentItem.qty) || 0;

    const amount =
      qty * rate;

    const gstAmount =
      (amount * gstRate) / 100;

    const netAmount =
      amount + gstAmount;

    setCurrentItem({
      productCode:
        product.code,

      productName:
        product.name,

      hsn:
        product.hsn,

      unit:
        product.unit,

      qty,

      rate,

      amount:
        Number(
          amount.toFixed(2)
        ),

      gst:
        gstRate,

      gstAmount:
        Number(
          gstAmount.toFixed(2)
        ),

      netAmount:
        Number(
          netAmount.toFixed(2)
        ),
    });
  };

  /* =======================================================
     CURRENT ITEM CHANGE
  ======================================================= */

  const handleItemChange = (
    name:
      | "qty"
      | "rate"
      | "gst",
    value: string
  ) => {
    setCurrentItem((prev) => {
      const updated = {
        ...prev,
        [name]:
          Number(value) || 0,
      };

      const amount =
        Number(updated.qty) *
        Number(updated.rate);

      const gstAmount =
        (amount *
          Number(updated.gst)) /
        100;

      const netAmount =
        amount + gstAmount;

      return {
        ...updated,

        amount:
          Number(
            amount.toFixed(2)
          ),

        gstAmount:
          Number(
            gstAmount.toFixed(2)
          ),

        netAmount:
          Number(
            netAmount.toFixed(2)
          ),
      };
    });
  };

  /* =======================================================
     RESET CURRENT ITEM
  ======================================================= */

  const resetCurrentItem = () => {
    setCurrentItem({
      productCode: "",
      productName: "",
      hsn: "",
      unit: "KG",

      qty: 0,
      rate: 0,
      amount: 0,

      gst: 5,
      gstAmount: 0,
      netAmount: 0,
    });

    setProductSearch("");

    setEditingItemIndex(null);
  };

  /* =======================================================
     ADD / UPDATE PRODUCT ITEM
  ======================================================= */

  const handleAddProduct = () => {
    if (!currentItem.productCode) {
      alert("Please select Product");
      return;
    }

    if (currentItem.qty <= 0) {
      alert(
        "Quantity should be greater than zero"
      );
      return;
    }

    if (currentItem.rate <= 0) {
      alert(
        "Purchase Rate should be greater than zero"
      );
      return;
    }

    const item: PurchaseItem = {
      ...currentItem,

      qty:
        Number(currentItem.qty),

      rate:
        Number(currentItem.rate),

      amount:
        Number(
          currentItem.amount.toFixed(2)
        ),

      gst:
        Number(currentItem.gst),

      gstAmount:
        Number(
          currentItem.gstAmount.toFixed(2)
        ),

      netAmount:
        Number(
          currentItem.netAmount.toFixed(2)
        ),
    };

    /* =====================================================
       UPDATE EXISTING ITEM
    ===================================================== */

    if (
      editingItemIndex !== null
    ) {
      setPurchaseItems((prev) =>
        prev.map(
          (existingItem, index) =>
            index ===
            editingItemIndex
              ? item
              : existingItem
        )
      );

      resetCurrentItem();

      return;
    }

    /* =====================================================
       ADD NEW ITEM
    ===================================================== */

    setPurchaseItems((prev) => [
      ...prev,
      item,
    ]);

    resetCurrentItem();
  };

  /* =======================================================
     EDIT PRODUCT ROW
  ======================================================= */

  const handleEditItem = (
    index: number
  ) => {
    const item =
      purchaseItems[index];

    if (!item) return;

    setCurrentItem({
      ...item,
    });

    setProductSearch(
      `${item.productCode} - ${item.productName}`
    );

    setEditingItemIndex(index);
  };

  /* =======================================================
     DELETE PRODUCT ROW
  ======================================================= */

  const handleDeleteItem = (
    index: number
  ) => {
    const confirmed =
      confirm(
        "Delete this product from the GRN?"
      );

    if (!confirmed) {
      return;
    }

    setPurchaseItems((prev) =>
      prev.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );

    if (
      editingItemIndex === index
    ) {
      resetCurrentItem();
    }
  };
  /* =======================================================
     CALCULATE GRN TOTALS
  ======================================================= */

  const totalQty =
    purchaseItems.reduce(
      (total, item) =>
        total + Number(item.qty),
      0
    );

  const totalAmount =
    purchaseItems.reduce(
      (total, item) =>
        total + Number(item.amount),
      0
    );

  const totalGstAmount =
    purchaseItems.reduce(
      (total, item) =>
        total + Number(item.gstAmount),
      0
    );

  const totalNetAmount =
    purchaseItems.reduce(
      (total, item) =>
        total + Number(item.netAmount),
      0
    );

  /* =======================================================
     SAVE / UPDATE GRN
  ======================================================= */

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!purchase.supplierCode) {
      alert("Please select Supplier");
      return;
    }

    if (purchaseItems.length === 0) {
      alert(
        "Please add at least one Product"
      );
      return;
    }

    const finalPurchase: Purchase = {
      ...purchase,

      items: purchaseItems,

      totalQty:
        Number(
          totalQty.toFixed(2)
        ),

      totalAmount:
        Number(
          totalAmount.toFixed(2)
        ),

      totalGstAmount:
        Number(
          totalGstAmount.toFixed(2)
        ),

      totalNetAmount:
        Number(
          totalNetAmount.toFixed(2)
        ),
    };

    onSave(finalPurchase);

    const newPurchase =
      emptyPurchase();

    setPurchase(newPurchase);

    setPurchaseItems([]);

    resetCurrentItem();

    setSupplierSearch("");
  };

  /* =======================================================
     RESET COMPLETE GRN
  ======================================================= */

  const handleReset = () => {
    const confirmed =
      confirm(
        "Reset the current GRN?"
      );

    if (!confirmed) {
      return;
    }

    setPurchase({
      ...emptyPurchase(),
      purchaseNo,
    });

    setPurchaseItems([]);

    setSupplierSearch("");

    resetCurrentItem();
  };

  /* =======================================================
     STYLES
  ======================================================= */

  const inputStyle:
    React.CSSProperties = {
      width: "100%",
      height: "40px",
      padding: "0 10px",
      border:
        "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "13px",
      boxSizing: "border-box",
      background: "#ffffff",
      outline: "none",
    };

  const labelStyle:
    React.CSSProperties = {
      display: "block",
      fontSize: "11px",
      fontWeight: 700,
      color: "#374151",
      marginBottom: "5px",
    };

  const fieldStyle:
    React.CSSProperties = {
      minWidth: 0,
    };

  const addedTh:
    React.CSSProperties = {
      padding: "8px 7px",
      border:
        "1px solid #14532d",
      textAlign: "left",
      whiteSpace: "nowrap",
      fontSize: "11px",
      fontWeight: 700,
    };

  const addedTd:
    React.CSSProperties = {
      padding: "8px 7px",
      border:
        "1px solid #d1d5db",
      whiteSpace: "nowrap",
      fontSize: "11px",
      color: "#374151",
    };

  /* =======================================================
     FORM UI
  ======================================================= */

  return (
    <form
      onSubmit={handleSubmit}
    >
      <div
        style={{
          background: "#ffffff",
          border:
            "1px solid #d1d5db",
          borderRadius: "10px",
          padding: "18px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >

        {/* =================================================
            TITLE
        ================================================== */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "18px",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#14532d",
              fontSize: "19px",
              fontWeight: 700,
            }}
          >
            📋 Purchase / GRN Entry
          </h2>

          {editingPurchase && (
            <div
              style={{
                padding:
                  "6px 10px",
                background:
                  "#fef3c7",
                color: "#92400e",
                borderRadius:
                  "5px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              ✏️ Editing{" "}
              {editingPurchase.purchaseNo}
            </div>
          )}
        </div>

        {/* =================================================
            HEADER ROW
        ================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "120px 150px 170px 1.5fr 1.5fr",
            gap: "10px",
            alignItems: "end",
          }}
        >

          {/* GRN NO */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              GRN No.
            </label>

            <input
              type="text"
              value={
                purchase.purchaseNo
              }
              readOnly
              style={{
                ...inputStyle,
                background:
                  "#f3f4f6",
                fontWeight: 700,
              }}
            />
          </div>

          {/* DATE */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              GRN Date *
            </label>

            <input
              type="date"
              name="purchaseDate"
              value={
                purchase.purchaseDate
              }
              onChange={(e) =>
                setPurchase(
                  (prev) => ({
                    ...prev,
                    purchaseDate:
                      e.target.value,
                  })
                )
              }
              required
              style={inputStyle}
            />
          </div>

          {/* INVOICE */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              Supplier Invoice No.
            </label>

            <input
              type="text"
              value={
                purchase.invoiceNo
              }
              onChange={(e) =>
                setPurchase(
                  (prev) => ({
                    ...prev,
                    invoiceNo:
                      e.target.value,
                  })
                )
              }
              placeholder="Invoice No."
              style={inputStyle}
            />
          </div>

          {/* SUPPLIER */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              Supplier *
            </label>

            <input
              list="supplier-list"
              value={
                supplierSearch
              }
              onChange={(e) => {
                const value =
                  e.target.value;

                setSupplierSearch(
                  value
                );

                const selectedSupplier =
                  suppliers.find(
                    (supplier) =>
                      `${supplier.code} - ${supplier.name}` ===
                        value &&
                      supplier.status ===
                        "Active"
                  );

                if (
                  selectedSupplier
                ) {
                  handleSupplierChange(
                    selectedSupplier.code
                  );
                }
              }}
              placeholder="Type supplier name..."
              style={inputStyle}
            />

            <datalist
              id="supplier-list"
            >
              {suppliers
                .filter(
                  (supplier) =>
                    supplier.status ===
                    "Active"
                )
                .map(
                  (supplier) => (
                    <option
                      key={
                        supplier.id
                      }
                      value={`${supplier.code} - ${supplier.name}`}
                    />
                  )
                )}
            </datalist>
          </div>

          {/* SUPPLIER NAME */}

          <div style={fieldStyle}>
            <label
              style={labelStyle}
            >
              Supplier Name
            </label>

            <input
              type="text"
              value={
                purchase.supplierName
              }
              readOnly
              placeholder="Selected Supplier"
              style={{
                ...inputStyle,
                background:
                  "#f3f4f6",
                fontWeight: 600,
              }}
            />
          </div>
        </div>

        {/* =================================================
            PRODUCT ENTRY SECTION
        ================================================== */}

        <div
          style={{
            marginTop: "18px",
            padding: "14px",
            background: "#f8fafc",
            border:
              "1px solid #d1d5db",
            borderRadius: "8px",
          }}
        >

          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#14532d",
              marginBottom: "10px",
            }}
          >
            ➕ Product Entry
          </div>

          {/* PRODUCT ROW */}

          <div
            style={{
              display: "grid",
              width: "100%",
minWidth: 0,
boxSizing: "border-box",
             gridTemplateColumns:
  "minmax(140px, 2fr) minmax(140px, 2fr) minmax(70px, 1fr) minmax(65px, 1fr) minmax(75px, 1fr) minmax(75px, 1fr) minmax(75px, 1fr) auto",
              gap: "8px",
              alignItems: "end",
            }}
          >

            {/* PRODUCT */}

            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                Product *
              </label>

              <input
                list="product-list"
                value={
                  productSearch
                }
                onChange={(e) => {
                  const value =
                    e.target.value;

                  setProductSearch(
                    value
                  );

                  const selectedProduct =
                    products.find(
                      (product) =>
                        `${product.code} - ${product.name}` ===
                          value &&
                        product.active
                    );

                  if (
                    selectedProduct
                  ) {
                    handleProductChange(
                      selectedProduct.code
                    );
                  }
                }}
                placeholder="Type product name..."
                style={inputStyle}
              />

              <datalist
                id="product-list"
              >
                {products
                  .filter(
                    (product) =>
                      product.active
                  )
                  .map(
                    (product) => (
                      <option
                        key={
                          product.id
                        }
                        value={`${product.code} - ${product.name}`}
                      />
                    )
                  )}
              </datalist>
            </div>

            {/* PRODUCT NAME */}

            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                Product Name
              </label>

              <input
                type="text"
                value={
                  currentItem.productName
                }
                readOnly
                style={{
                  ...inputStyle,
                  background:
                    "#f3f4f6",
                  fontWeight: 600,
                }}
              />
            </div>

            {/* HSN */}

            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                HSN
              </label>

              <input
                type="text"
                value={
                  currentItem.hsn
                }
                readOnly
                style={{
                  ...inputStyle,
                  background:
                    "#f3f4f6",
                }}
              />
            </div>

            {/* UNIT */}

            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                Unit
              </label>

              <input
                type="text"
                value={
                  currentItem.unit
                }
                readOnly
                style={{
                  ...inputStyle,
                  background:
                    "#f3f4f6",
                }}
              />
            </div>

            {/* QTY */}

            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                Qty *
              </label>

              <input
                type="number"
                value={
                  currentItem.qty
                }
                onChange={(e) =>
                  handleItemChange(
                    "qty",
                    e.target.value
                  )
                }
                min="0"
                step="0.01"
                style={inputStyle}
              />
            </div>

            {/* RATE */}

            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                Rate *
              </label>

              <input
                type="number"
                value={
                  currentItem.rate
                }
                onChange={(e) =>
                  handleItemChange(
                    "rate",
                    e.target.value
                  )
                }
                min="0"
                step="0.01"
                style={inputStyle}
              />
            </div>

            {/* GST */}

            <div style={fieldStyle}>
              <label
                style={labelStyle}
              >
                GST
              </label>

              <input
                type="text"
                value={`${currentItem.gst}%`}
                readOnly
                style={{
                  ...inputStyle,
                  background:
                    "#f3f4f6",
                  fontWeight: 700,
                  color: "#14532d",
                }}
              />
            </div>

            {/* ADD / UPDATE BUTTON */}

            <button
              type="button"
              onClick={
                handleAddProduct
              }
              style={{
                height: "40px",
                padding:
                  "0 14px",
                border: "none",
                borderRadius:
                  "6px",
                background:
                  editingItemIndex !==
                  null
                    ? "#2563eb"
                    : "#14532d",
                color:
                  "#ffffff",
                fontWeight: 700,
                cursor:
                  "pointer",
                fontSize:
                  "12px",
                whiteSpace:
                  "nowrap",
              }}
            >
              {editingItemIndex !==
              null
                ? "✔ Update Row"
                : "➕ Add Product"}
            </button>
          </div>

          {/* CURRENT ITEM TOTALS */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              gap: "18px",
              marginTop: "10px",
              fontSize: "12px",
              color: "#374151",
            }}
          >
            <span>
              Amount:{" "}
              <strong>
                ₹
                {currentItem.amount.toFixed(
                  2
                )}
              </strong>
            </span>

            <span>
              GST:{" "}
              <strong>
                ₹
                {currentItem.gstAmount.toFixed(
                  2
                )}
              </strong>
            </span>

            <span
              style={{
                color: "#14532d",
              }}
            >
              Net:{" "}
              <strong>
                ₹
                {currentItem.netAmount.toFixed(
                  2
                )}
              </strong>
            </span>
          </div>

          {/* CANCEL ROW EDIT */}

          {editingItemIndex !==
            null && (
            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                marginTop: "8px",
              }}
            >
              <button
                type="button"
                onClick={
                  resetCurrentItem
                }
                style={{
                  border: "none",
                  background:
                    "transparent",
                  color:
                    "#dc2626",
                  fontSize:
                    "11px",
                  fontWeight:
                    700,
                  cursor:
                    "pointer",
                }}
              >
                ✖ Cancel Row Edit
              </button>
            </div>
          )}
        </div>
        {/* =================================================
            ADDED PRODUCTS TABLE
        ================================================== */}

        {purchaseItems.length > 0 && (
          <div
            style={{
              marginTop: "16px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "9px 12px",
                background: "#14532d",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              📦 Added Products (
              {purchaseItems.length}
              )
            </div>

            <div
              style={{
                width: "100%",
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: "1000px",
                  borderCollapse: "collapse",
                  fontSize: "11px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f0fdf4",
                    }}
                  >
                    <th
                      style={{
                        ...addedTh,
                        width: "40px",
                      }}
                    >
                      #
                    </th>

                    <th style={addedTh}>
                      Product
                    </th>

                    <th style={addedTh}>
                      HSN
                    </th>

                    <th style={addedTh}>
                      Unit
                    </th>

                    <th
                      style={{
                        ...addedTh,
                        textAlign: "right",
                      }}
                    >
                      Qty
                    </th>

                    <th
                      style={{
                        ...addedTh,
                        textAlign: "right",
                      }}
                    >
                      Rate
                    </th>

                    <th
                      style={{
                        ...addedTh,
                        textAlign: "right",
                      }}
                    >
                      Amount
                    </th>

                    <th
                      style={{
                        ...addedTh,
                        textAlign: "center",
                      }}
                    >
                      GST
                    </th>

                    <th
                      style={{
                        ...addedTh,
                        textAlign: "right",
                      }}
                    >
                      GST Amount
                    </th>

                    <th
                      style={{
                        ...addedTh,
                        textAlign: "right",
                      }}
                    >
                      Net Amount
                    </th>

                    <th
                      style={{
                        ...addedTh,
                        textAlign: "center",
                      }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {purchaseItems.map(
                    (item, index) => (
                      <tr
                        key={`${item.productCode}-${index}`}
                        style={{
                          background:
                            index % 2 === 0
                              ? "#ffffff"
                              : "#f8fafc",
                        }}
                      >
                        <td
                          style={{
                            ...addedTd,
                            textAlign: "center",
                          }}
                        >
                          {index + 1}
                        </td>

                        <td
                          style={{
                            ...addedTd,
                            fontWeight: 600,
                          }}
                        >
                          {item.productCode} -{" "}
                          {item.productName}
                        </td>

                        <td style={addedTd}>
                          {item.hsn || "-"}
                        </td>

                        <td style={addedTd}>
                          {item.unit || "-"}
                        </td>

                        <td
                          style={{
                            ...addedTd,
                            textAlign: "right",
                          }}
                        >
                          {Number(item.qty)}
                        </td>

                        <td
                          style={{
                            ...addedTd,
                            textAlign: "right",
                          }}
                        >
                          ₹
                          {Number(
                            item.rate
                          ).toFixed(2)}
                        </td>

                        <td
                          style={{
                            ...addedTd,
                            textAlign: "right",
                          }}
                        >
                          ₹
                          {Number(
                            item.amount
                          ).toFixed(2)}
                        </td>

                        <td
                          style={{
                            ...addedTd,
                            textAlign: "center",
                          }}
                        >
                          {Number(item.gst)}%
                        </td>

                        <td
                          style={{
                            ...addedTd,
                            textAlign: "right",
                          }}
                        >
                          ₹
                          {Number(
                            item.gstAmount
                          ).toFixed(2)}
                        </td>

                        <td
                          style={{
                            ...addedTd,
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#14532d",
                          }}
                        >
                          ₹
                          {Number(
                            item.netAmount
                          ).toFixed(2)}
                        </td>

                        <td
                          style={{
                            ...addedTd,
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "center",
                              gap: "5px",
                            }}
                          >
                            {/* EDIT ROW */}

                            <button
                              type="button"
                              onClick={() =>
                                handleEditItem(index)
                              }
                              title="Edit Product Row"
                              style={{
                                padding:
                                  "4px 7px",
                                border: "none",
                                borderRadius: "4px",
                                background:
                                  "#2563eb",
                                color: "#ffffff",
                                cursor: "pointer",
                                fontSize: "11px",
                              }}
                            >
                              ✏️
                            </button>

                            {/* DELETE ROW */}

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteItem(index)
                              }
                              title="Delete Product Row"
                              style={{
                                padding:
                                  "4px 7px",
                                border: "none",
                                borderRadius: "4px",
                                background:
                                  "#dc2626",
                                color: "#ffffff",
                                cursor: "pointer",
                                fontSize: "11px",
                              }}
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}

                  {/* TOTAL ROW */}

                  <tr
                    style={{
                      background: "#dcfce7",
                      fontWeight: 700,
                    }}
                  >
                    <td
                      colSpan={4}
                      style={{
                        ...addedTd,
                        textAlign: "right",
                        color: "#14532d",
                      }}
                    >
                      TOTAL
                    </td>

                    <td
                      style={{
                        ...addedTd,
                        textAlign: "right",
                        color: "#14532d",
                      }}
                    >
                      {totalQty.toFixed(2)}
                    </td>

                    <td
                      style={{
                        ...addedTd,
                        textAlign: "right",
                      }}
                    >
                      -
                    </td>

                    <td
                      style={{
                        ...addedTd,
                        textAlign: "right",
                      }}
                    >
                      ₹
                      {totalAmount.toFixed(2)}
                    </td>

                    <td
                      style={{
                        ...addedTd,
                        textAlign: "center",
                      }}
                    >
                      -
                    </td>

                    <td
                      style={{
                        ...addedTd,
                        textAlign: "right",
                      }}
                    >
                      ₹
                      {totalGstAmount.toFixed(2)}
                    </td>

                    <td
                      style={{
                        ...addedTd,
                        textAlign: "right",
                        color: "#14532d",
                      }}
                    >
                      ₹
                      {totalNetAmount.toFixed(2)}
                    </td>

                    <td style={addedTd}>
                      -
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================
            GRN TOTAL SUMMARY
        ================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, 1fr)",
            gap: "10px",
            marginTop: "16px",
          }}
        >
          {/* TOTAL QTY */}

          <div
            style={{
              padding: "10px 12px",
              background: "#f8fafc",
              border:
                "1px solid #d1d5db",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#6b7280",
                fontWeight: 600,
              }}
            >
              Total Quantity
            </div>

            <div
              style={{
                marginTop: "3px",
                fontSize: "16px",
                fontWeight: 800,
                color: "#111827",
              }}
            >
              {totalQty.toFixed(2)}
            </div>
          </div>

          {/* TOTAL AMOUNT */}

          <div
            style={{
              padding: "10px 12px",
              background: "#f8fafc",
              border:
                "1px solid #d1d5db",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#6b7280",
                fontWeight: 600,
              }}
            >
              Total Amount
            </div>

            <div
              style={{
                marginTop: "3px",
                fontSize: "16px",
                fontWeight: 800,
                color: "#111827",
              }}
            >
              ₹
              {totalAmount.toFixed(2)}
            </div>
          </div>

          {/* TOTAL GST */}

          <div
            style={{
              padding: "10px 12px",
              background: "#f8fafc",
              border:
                "1px solid #d1d5db",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#6b7280",
                fontWeight: 600,
              }}
            >
              Total GST
            </div>

            <div
              style={{
                marginTop: "3px",
                fontSize: "16px",
                fontWeight: 800,
                color: "#111827",
              }}
            >
              ₹
              {totalGstAmount.toFixed(2)}
            </div>
          </div>

          {/* NET AMOUNT */}

          <div
            style={{
              padding: "10px 12px",
              background: "#f0fdf4",
              border:
                "1px solid #bbf7d0",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#166534",
                fontWeight: 600,
              }}
            >
              Net Amount
            </div>

            <div
              style={{
                marginTop: "3px",
                fontSize: "17px",
                fontWeight: 800,
                color: "#14532d",
              }}
            >
              ₹
              {totalNetAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* =================================================
            REMARKS
        ================================================== */}

        <div
          style={{
            marginTop: "14px",
          }}
        >
          <label
            style={labelStyle}
          >
            Remarks
          </label>

          <input
            type="text"
            value={purchase.remarks}
            onChange={(e) =>
              setPurchase((prev) => ({
                ...prev,
                remarks:
                  e.target.value,
              }))
            }
            placeholder="Remarks"
            style={inputStyle}
          />
        </div>

        {/* =================================================
            FOOTER ACTIONS
        ================================================== */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            gap: "8px",
            marginTop: "16px",
          }}
        >
          {/* RESET */}

          <button
            type="button"
            onClick={handleReset}
            style={{
              height: "40px",
              padding: "0 16px",
              border: "none",
              borderRadius: "6px",
              background: "#6b7280",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            🔄 Reset
          </button>

          {/* SAVE / UPDATE */}

          <button
            type="submit"
            style={{
              height: "40px",
              padding: "0 18px",
              border: "none",
              borderRadius: "6px",
              background: "#14532d",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            💾{" "}
            {editingPurchase
              ? "Update GRN"
              : "Save GRN"}
          </button>
        </div>

      </div>
    </form>
  );
}