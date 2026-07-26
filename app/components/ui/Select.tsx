"use client";

import React from "react";

type Option = {
  label: string;
  value: string;
};

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options?: Option[];
  children?: React.ReactNode;
};

export default function Select({
  label,
  options,
  children,
  ...props
}: SelectProps) {
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
          }}
        >
          {label}
        </label>
      )}

      <select
        {...props}
        style={{
          width: "100%",
          height: "40px",
          padding: "8px 10px",
          border: "1px solid #cbd5e1",
          borderRadius: "6px",
          background: "#fff",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box",
          ...(props.style || {}),
        }}
      >
        {children
          ? children
          : options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
      </select>
    </div>
  );
}