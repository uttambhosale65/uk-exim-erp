"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
  title?: string;
  variant?: "primary" | "secondary" | "danger";
};

export default function Button({
  children,
  title,
  variant = "primary",
  style,
  ...props
}: ButtonProps) {
  const background =
    variant === "secondary"
      ? "#6b7280"
      : variant === "danger"
      ? "#dc2626"
      : "#2563eb";

  return (
    <button
      {...props}
      style={{
        height: "40px",
        minWidth: "110px",
        padding: "0 18px",
        border: "none",
        borderRadius: "6px",
        background,
        color: "#fff",
        fontSize: "14px",
        fontWeight: 600,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        transition: "0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!props.disabled) {
          e.currentTarget.style.filter = "brightness(0.95)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = "brightness(1)";
      }}
    >
      {children ?? title ?? "Button"}
    </button>
  );
}