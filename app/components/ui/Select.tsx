"use client";

import React from "react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export default function Select({
  label,
  children,
  ...props
}: SelectProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        marginBottom: "15px",
      }}
    >
      {label && (
        <label
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          {label}
        </label>
      )}

      <select
        {...props}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          fontSize: "14px",
          background: "#ffffff",
          outline: "none",
          boxSizing: "border-box",
          ...(props.style || {}),
        }}
      >
        {children}
      </select>
    </div>
  );
}