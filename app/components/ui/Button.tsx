"use client";

import React from "react";

type ButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    title: string;
  };

export default function Button({
  title,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        background: "#0f766e",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        padding: "12px 20px",
        fontSize: "15px",
        fontWeight: "bold",
        cursor: "pointer",
        transition: "0.3s",
        ...(props.style || {}),
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "#115e59";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "#0f766e";
      }}
    >
      {title}
    </button>
  );
}