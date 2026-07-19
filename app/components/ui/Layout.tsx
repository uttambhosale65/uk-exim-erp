"use client";

import { ReactNode } from "react";

type LayoutProps = {
  title: string;
  children: ReactNode;
};

export default function Layout({
  title,
  children,
}: LayoutProps) {
  return (
    <div
      style={{
        background: "#f1f5f9",
        minHeight: "100vh",
        padding: "16px",
      }}
    >
      <div
        style={{
          maxWidth: "1600px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #dbe3ea",
            borderRadius: "8px",
           padding: "10px 16px",
            marginBottom: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              margin: 0,
            fontSize: "22px",
              fontWeight: 700,
              color: "#1f2937",
            }}
          >
            {title}
          </h1>
        </div>

        {children}
      </div>
    </div>
  );
}