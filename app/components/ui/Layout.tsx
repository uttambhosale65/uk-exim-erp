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
        background: "#f4f6f9",
        minHeight: "100vh",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            marginBottom: "25px",
            fontSize: "28px",
            fontWeight: "bold",
            color: "#1f2937",
          }}
        >
          {title}
        </h1>

        <div>{children}</div>
      </div>
    </div>
  );
}