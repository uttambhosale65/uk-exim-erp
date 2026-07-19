"use client";

import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function Input({
  label,
  ...props
}: InputProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        marginBottom: "8px",
      }}
    >
      {label && (
        <label
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#374151",
            lineHeight: "18px",
          }}
        >
          {label}
        </label>
      )}

      <input
        {...props}
        style={{
          width: "100%",
          height: "40px",
          padding: "8px 10px",
          border: "1px solid #cbd5e1",
          borderRadius: "6px",
          fontSize: "14px",
          background: "#ffffff",
          color: "#111827",
          outline: "none",
          boxSizing: "border-box",
          transition: "all 0.2s ease",
          ...(props.style || {}),
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#2563eb";
          e.currentTarget.style.boxShadow =
            "0 0 0 2px rgba(37,99,235,0.15)";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#cbd5e1";
          e.currentTarget.style.boxShadow = "none";
          props.onBlur?.(e);
        }}
      />
    </div>
  );
}