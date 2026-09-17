"use client";

import { useEffect, useState } from "react";
import { loadProducts } from "../../../product/components/ProductStorage";
import {
  InternationalExportStock,
} from "./InternationalExportStockTypes";

type InternationalExportStockFormProps = {
  initialData?: InternationalExportStock | null;
  onSave: (stock: InternationalExportStock) => void;
  onCancel?: () => void;
};

type StockSource = "Opening Stock" | "Purchase";

function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

export default function InternationalExportStockForm({
  initialData,
  onSave,
  onCancel,
}: InternationalExportStockFormProps) {
  const [products, setProducts] = useState<
  {
    code: string;
    name: string;
    unit: string;
    active?: boolean;
  }[]
>([]);

  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [lotBatchNo, setLotBatchNo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [source, setSource] = useState<StockSource>("Purchase");
  const [purchaseReference, setPurchaseReference] = useState("");

  useEffect(() => {
    setProducts(loadProducts());
  }, []);

  useEffect(() => {
    if (!initialData) return;

    setProductCode(initialData.productCode);
    setProductName(initialData.productName);
    setLotBatchNo(initialData.lotBatchNo);
    setQuantity(formatNumber(initialData.availableQty));
    setUnit(initialData.unit);
    setSource("Purchase");
    setPurchaseReference("");
  }, [initialData]);

  const handleProductChange = (code: string) => {
    setProductCode(code);

    const selectedProduct = products.find(
      (product) => product.code === code
    );

    if (!selectedProduct) {
      setProductName("");
      setUnit("");
      return;
    }

    setProductName(selectedProduct.name);
    setUnit(selectedProduct.unit);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const qty = Number(quantity);

    if (!productCode) {
      alert("Please select Product.");
      return;
    }

    if (!lotBatchNo.trim()) {
      alert("Please enter Lot / Batch No.");
      return;
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      alert("Please enter a valid Quantity.");
      return;
    }

    if (!unit) {
      alert("Please select Unit.");
      return;
    }

    if (source === "Purchase" && !purchaseReference.trim()) {
      alert("Please enter Purchase Reference.");
      return;
    }

    const now = new Date().toISOString();

    const stock: InternationalExportStock = {
      id:
        initialData?.id ||
        `INT-EXP-STK-${Date.now()}`,

      productCode,
      productName,
      lotBatchNo: lotBatchNo.trim(),

      availableQty: qty,
      reservedQty: initialData?.reservedQty || 0,
      packedQty: initialData?.packedQty || 0,
      loadedQty: initialData?.loadedQty || 0,
      shippedQty: initialData?.shippedQty || 0,

    unit,

source,
purchaseReference:
  source === "Purchase"
    ? purchaseReference.trim()
    : "",

createdAt: initialData?.createdAt || now,
updatedAt: now,
    };

    onSave(stock);
  };

  const handleReset = () => {
    if (initialData) {
      setProductCode(initialData.productCode);
      setProductName(initialData.productName);
      setLotBatchNo(initialData.lotBatchNo);
      setQuantity(formatNumber(initialData.availableQty));
      setUnit(initialData.unit);
      setSource("Purchase");
      setPurchaseReference("");
      return;
    }

    setProductCode("");
    setProductName("");
    setLotBatchNo("");
    setQuantity("");
    setUnit("");
    setSource("Purchase");
    setPurchaseReference("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d9dee7",
          borderRadius: 10,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {initialData
                ? "Edit International Export Stock"
                : "International Export Stock Entry"}
            </h2>

            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "#667085",
              }}
            >
              Export Stock is maintained separately from Domestic Stock.
            </div>
          </div>

          <div
            style={{
              background: "#eef6ff",
              color: "#175cd3",
              border: "1px solid #b2ddff",
              borderRadius: 6,
              padding: "5px 10px",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            INTERNATIONAL EXPORT
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(160px, 0.8fr) minmax(140px, 0.7fr)",
            gap: 12,
            alignItems: "end",
          }}
        >
          {/* Product */}
          <div>
            <label style={labelStyle}>
              Product <span style={requiredStyle}>*</span>
            </label>

            <select
              value={productCode}
              onChange={(e) => handleProductChange(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select Product</option>

              {products
                .filter((product) => product.active !== false)
                .map((product) => (
                  <option key={product.code} value={product.code}>
                    {product.code} - {product.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Product Name */}
          <div>
            <label style={labelStyle}>Product Name</label>

            <input
              value={productName}
              readOnly
              placeholder="Auto filled"
              style={{
                ...inputStyle,
                background: "#f8fafc",
              }}
            />
          </div>

          {/* Lot */}
          <div>
            <label style={labelStyle}>
              Lot / Batch No. <span style={requiredStyle}>*</span>
            </label>

            <input
              value={lotBatchNo}
              onChange={(e) => setLotBatchNo(e.target.value)}
              placeholder="e.g. LOT-SEP-001"
              style={inputStyle}
            />
          </div>

          {/* Unit */}
          <div>
            <label style={labelStyle}>
              Unit <span style={requiredStyle}>*</span>
            </label>

            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select Unit</option>
              <option value="KG">KG</option>
              <option value="Gram">Gram</option>
              <option value="Pkt">Pkt</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(180px, 0.8fr) minmax(180px, 0.8fr) minmax(220px, 1fr) 1fr",
            gap: 12,
            marginTop: 12,
            alignItems: "end",
          }}
        >
          {/* Quantity */}
          <div>
            <label style={labelStyle}>
              Quantity <span style={requiredStyle}>*</span>
            </label>

            <input
              type="number"
              min="0"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.000"
              style={inputStyle}
            />
          </div>

          {/* Source */}
          <div>
            <label style={labelStyle}>
              Stock Source <span style={requiredStyle}>*</span>
            </label>

            <select
              value={source}
              onChange={(e) =>
                setSource(e.target.value as StockSource)
              }
              style={inputStyle}
            >
              <option value="Purchase">Purchase</option>
              <option value="Opening Stock">Opening Stock</option>
            </select>
          </div>

          {/* Purchase Reference */}
          <div>
            <label style={labelStyle}>
              Purchase Reference
              {source === "Purchase" && (
                <span style={requiredStyle}> *</span>
              )}
            </label>

            <input
              value={purchaseReference}
              onChange={(e) =>
                setPurchaseReference(e.target.value)
              }
              disabled={source !== "Purchase"}
              placeholder={
                source === "Purchase"
                  ? "e.g. EXP-PUR-0001"
                  : "Not required for Opening Stock"
              }
              style={{
                ...inputStyle,
                background:
                  source === "Purchase"
                    ? "#ffffff"
                    : "#f2f4f7",
              }}
            />
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#667085",
              lineHeight: 1.5,
              paddingBottom: 7,
            }}
          >
            <strong>Stock Effect:</strong>{" "}
            New entry creates Available Stock only.
            Reservation will be handled separately.
          </div>
        </div>
      </div>

      {/* Safety Note */}
      <div
        style={{
          background: "#fffaeb",
          border: "1px solid #fedf89",
          borderRadius: 8,
          padding: "10px 12px",
          marginBottom: 14,
          fontSize: 12,
          color: "#7a2e0e",
        }}
      >
        <strong>Stock Safety:</strong> This form updates only
        International Export Stock. It does not modify the
        Domestic Stock key or Domestic Purchase / GRN stock.
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={handleReset}
          style={secondaryButtonStyle}
        >
          Reset
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={secondaryButtonStyle}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          style={primaryButtonStyle}
        >
          {initialData ? "Update Stock" : "Save Stock"}
        </button>
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 5,
  fontSize: 12,
  fontWeight: 600,
  color: "#344054",
};

const requiredStyle: React.CSSProperties = {
  color: "#d92d20",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 10px",
  border: "1px solid #d0d5dd",
  borderRadius: 6,
  fontSize: 13,
  color: "#101828",
  background: "#ffffff",
  boxSizing: "border-box",
  outline: "none",
};

const primaryButtonStyle: React.CSSProperties = {
  height: 38,
  padding: "0 16px",
  border: "none",
  borderRadius: 6,
  background: "#175cd3",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  height: 38,
  padding: "0 16px",
  border: "1px solid #d0d5dd",
  borderRadius: 6,
  background: "#ffffff",
  color: "#344054",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};