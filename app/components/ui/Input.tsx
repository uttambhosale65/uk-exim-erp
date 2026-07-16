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

      <input
        {...props}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box",
          ...(props.style || {}),
        }}
      />
    </div>
  );
}