"use client";

import { useEffect, useMemo, useState } from "react";
import { ExportQuotation } from "./ExportQuotationTypes";

type CompanySettings = {
  companyName: string;
  address: string;
  gstin: string;
  fssai: string;
  iec: string;
  mobile: string;
  email: string;
  website: string;
  logo: string;
};

type InternationalSettings = {
  pan: string;
  udyam: string;
  iecIssueDate: string;
  adCode: string;
  swiftBic: string;
  exportAccount: string;
  defaultCurrency: string;
  defaultIncoterm: string;
  defaultPortOfLoading: string;
  defaultPaymentTerms: string;
  defaultShipmentMode: string;
  countryOfOrigin: string;
};

type ExportQuotationPrintProps = {
  quotation: ExportQuotation;
};

const COMPANY_KEY = "uk-exim-company-settings";

const INTERNATIONAL_KEY =
  "uk-exim-international-settings";

const defaultCompany: CompanySettings = {
  companyName: "UK EXIM ENTERPRISES",
  address:
    "A-703, Vishnu Greens, City Pride School Road, Jadhavwadi, Chikhali, Pune - 411062, Maharashtra, India",
  gstin: "27AJUPB0025D1ZO",
  fssai: "21525038000816",
  iec: "AJUPB0025D",
  mobile: "+91 9970187185",
  email: "uk37exim@gmail.com",
  website: "www.ukeximenterprises.com",
  logo: "/uklogo.png",
};

const defaultInternational: InternationalSettings = {
  pan: "",
  udyam: "",
  iecIssueDate: "",
  adCode: "",
  swiftBic: "",
  exportAccount: "",
  defaultCurrency: "USD",
  defaultIncoterm: "FOB",
  defaultPortOfLoading: "",
  defaultPaymentTerms: "Advance / LC / TT",
  defaultShipmentMode: "Sea",
  countryOfOrigin: "India",
};

function loadSettings<T>(
  key: string,
  fallback: T
): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = localStorage.getItem(key);

    if (!stored) {
      return fallback;
    }

    const parsed = JSON.parse(stored);

    return {
      ...fallback,
      ...parsed,
    };
  } catch {
    return fallback;
  }
}

function formatDate(value: string): string {
  if (!value) return "-";

  const parts = value.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function formatNumber(value: number): string {
  return Number(value || 0).toFixed(2);
}

function formatMoney(
  value: number,
  currency: string
): string {
  return `${currency || ""} ${formatNumber(value)}`.trim();
}

export default function ExportQuotationPrint({
  quotation,
}: ExportQuotationPrintProps) {
  const [company, setCompany] =
    useState<CompanySettings>(defaultCompany);

  const [international, setInternational] =
    useState<InternationalSettings>(
      defaultInternational
    );

  useEffect(() => {
    setCompany(
      loadSettings(
        COMPANY_KEY,
        defaultCompany
      )
    );

    setInternational(
      loadSettings(
        INTERNATIONAL_KEY,
        defaultInternational
      )
    );
  }, []);

  const totals = useMemo(() => {
    const goodsValue = quotation.items.reduce(
      (sum, item) => {
        const qty = Number(item.qty || 0);
        const unitPrice = Number(
          item.unitPrice || 0
        );

        return sum + qty * unitPrice;
      },
      0
    );

    const freight = Number(
      quotation.freight || 0
    );

    const insurance = Number(
      quotation.insurance || 0
    );

    const otherCharges = Number(
      quotation.otherCharges || 0
    );

    return {
      goodsValue,
      freight,
      insurance,
      otherCharges,
      total:
        goodsValue +
        freight +
        insurance +
        otherCharges,
    };
  }, [quotation]);

  const currency =
    quotation.currency ||
    international.defaultCurrency ||
    "USD";

  const incoterm =
    quotation.incoterm ||
    international.defaultIncoterm ||
    "-";

  const paymentTerms =
    quotation.paymentTerms ||
    international.defaultPaymentTerms ||
    "-";

  const shipmentMode =
    international.defaultShipmentMode ||
    "-";

  const portOfLoading =
    international.defaultPortOfLoading ||
    "-";

  const countryOfOrigin =
    international.countryOfOrigin ||
    "India";

  const companyName =
    company.companyName ||
    "UK EXIM ENTERPRISES";

  const logo =
    company.logo || "/uklogo.png";

  const website = company.website
    ? company.website.replace(
        /^https?:\/\//,
        ""
      )
    : "";

  const bankAccount =
    international.exportAccount || "";

  const swiftBic =
    international.swiftBic || "";

  const adCode =
    international.adCode || "";

  return (
    <>
      <style jsx global>{`
        .quotation-print-root {
          width: 100%;
          box-sizing: border-box;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          color: #172033;
        }

        .quotation-print-toolbar {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 14px;
        }

        .quotation-print-button {
          border: 0;
          border-radius: 7px;
          padding: 10px 18px;
          background: #172033;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .quotation-print-button:hover {
          background: #26344d;
        }

        /* =========================
           DOCUMENT
        ========================= */

        .quotation-document {
          width: 100%;
          max-width: 820px;
          min-height: 286mm;
          margin: 0 auto;
          box-sizing: border-box;
          background: #ffffff;
          color: #172033;
          border: 1px solid #cbd5e1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .quotation-content {
          flex: 1 0 auto;
        }

        /* =========================
           TOP ACCENT
        ========================= */

        .quotation-top-accent {
          height: 7px;
          flex-shrink: 0;
          background: #172033;
        }

        /* =========================
           HEADER
        ========================= */

        .quotation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 22px 25px 18px;
          border-bottom: 1px solid #d9e0e8;
        }

        .quotation-brand {
          display: flex;
          align-items: center;
          gap: 15px;
          min-width: 0;
        }

        .quotation-logo {
          width: 72px;
          height: 72px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .quotation-company-name {
          font-size: 25px;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: 0.3px;
          color: #172033;
        }

        .quotation-company-address {
          max-width: 500px;
          margin-top: 7px;
          font-size: 9px;
          line-height: 1.45;
          color: #56657a;
        }

        .quotation-company-contact {
          margin-top: 5px;
          font-size: 8.5px;
          line-height: 1.35;
          color: #344257;
        }

        .quotation-company-ids {
          margin-top: 5px;
          font-size: 8px;
          font-weight: 700;
          color: #344257;
        }

        .quotation-title-block {
          flex-shrink: 0;
          min-width: 190px;
          text-align: right;
        }

        .quotation-title-small {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 2.2px;
          color: #738197;
          text-transform: uppercase;
        }

        .quotation-title {
          margin-top: 5px;
          font-size: 29px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 1px;
          color: #172033;
        }

        .quotation-title-sub {
          margin-top: 5px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 3px;
          color: #536177;
        }

        .quotation-title-line {
          width: 95px;
          height: 3px;
          margin: 10px 0 0 auto;
          background: #172033;
        }

        /* =========================
           SECTION HEADER
        ========================= */

        .quotation-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 25px;
          background: #f5f7fa;
          border-top: 1px solid #d9e0e8;
          border-bottom: 1px solid #d9e0e8;
        }

        .quotation-section-heading-title {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.6px;
          color: #172033;
          text-transform: uppercase;
        }

        .quotation-section-heading-note {
          font-size: 7px;
          color: #718096;
        }

        /* =========================
           META
        ========================= */

        .quotation-meta {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          border-bottom: 1px solid #d9e0e8;
        }

        .quotation-meta-item {
          min-height: 54px;
          padding: 10px 13px;
          border-right: 1px solid #d9e0e8;
        }

        .quotation-meta-item:last-child {
          border-right: none;
        }

        .quotation-label {
          font-size: 7px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: 1px;
          color: #7a8799;
          text-transform: uppercase;
        }

        .quotation-value {
          margin-top: 5px;
          font-size: 10px;
          line-height: 1.25;
          font-weight: 800;
          color: #172033;
        }

        /* =========================
           BUYER / COMMERCIAL
        ========================= */

        .quotation-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #d9e0e8;
        }

        .quotation-info-box {
          padding: 12px 25px;
        }

        .quotation-info-box:first-child {
          border-right: 1px solid #d9e0e8;
        }

        .quotation-section-title {
          margin-bottom: 7px;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 1.5px;
          color: #78869a;
          text-transform: uppercase;
        }

        .quotation-buyer-name {
          font-size: 14px;
          line-height: 1.2;
          font-weight: 900;
          color: #172033;
        }

        .quotation-small-line {
          margin-top: 4px;
          font-size: 8.5px;
          line-height: 1.4;
          color: #4d5c70;
        }

        .quotation-small-line strong {
          color: #27354a;
        }

        .quotation-commercial-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 22px;
        }

        .quotation-commercial-label {
          font-size: 7px;
          color: #7a8799;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .quotation-commercial-value {
          margin-top: 2px;
          font-size: 8.5px;
          line-height: 1.3;
          font-weight: 800;
          color: #172033;
        }

        /* =========================
           SHIPPING
        ========================= */

        .quotation-shipping-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          border-bottom: 1px solid #d9e0e8;
        }

        .quotation-shipping-item {
          min-height: 47px;
          padding: 9px 25px;
          border-right: 1px solid #d9e0e8;
        }

        .quotation-shipping-item:last-child {
          border-right: none;
        }

        .quotation-shipping-label {
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.7px;
          color: #7a8799;
          text-transform: uppercase;
        }

        .quotation-shipping-value {
          margin-top: 3px;
          font-size: 8.5px;
          line-height: 1.3;
          font-weight: 800;
          color: #172033;
        }

        /* =========================
           PRODUCTS
        ========================= */

        .quotation-products {
          padding: 13px 25px 0;
        }

        .quotation-products-title {
          margin-bottom: 7px;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.4px;
          color: #172033;
          text-transform: uppercase;
        }

        .quotation-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 8.5px;
          border: 1px solid #cbd5e1;
        }

        .quotation-table th {
          padding: 8px 6px;
          background: #172033;
          color: #ffffff;
          font-size: 7.5px;
          font-weight: 800;
          letter-spacing: 0.4px;
          text-align: left;
        }

        .quotation-table td {
          padding: 7px 6px;
          border-bottom: 1px solid #dfe5ec;
          vertical-align: top;
          color: #27354a;
        }

        .quotation-table tbody tr:last-child td {
          border-bottom: none;
        }

        .quotation-table th:first-child,
        .quotation-table td:first-child {
          width: 35px;
          text-align: center;
        }

        .quotation-table th:nth-child(3),
        .quotation-table td:nth-child(3) {
          width: 65px;
          text-align: right;
        }

        .quotation-table th:nth-child(4),
        .quotation-table td:nth-child(4) {
          width: 48px;
          text-align: center;
        }

        .quotation-table th:nth-child(5),
        .quotation-table td:nth-child(5) {
          width: 90px;
          text-align: right;
        }

        .quotation-table th:nth-child(6),
        .quotation-table td:nth-child(6) {
          width: 105px;
          text-align: right;
        }

        .quotation-product-name {
          font-size: 9px;
          font-weight: 800;
          color: #172033;
        }

        .quotation-product-code {
          margin-top: 2px;
          font-size: 7px;
          color: #718096;
        }

        .quotation-requirement {
          margin-top: 3px;
          font-size: 7px;
          line-height: 1.3;
          color: #526176;
        }

        /* =========================
           SUMMARY
        ========================= */

        .quotation-summary-grid {
          display: grid;
          grid-template-columns: 1fr 285px;
          gap: 14px;
          padding: 13px 25px 0;
        }

        .quotation-remarks-box {
          min-height: 105px;
          padding: 11px 12px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
        }

        .quotation-remarks-text {
          margin-top: 5px;
          white-space: pre-wrap;
          font-size: 8px;
          line-height: 1.5;
          color: #46556a;
        }

        .quotation-totals {
          border: 1px solid #cbd5e1;
          overflow: hidden;
        }

        .quotation-total-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 7px 10px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 8.5px;
        }

        .quotation-total-row span:first-child {
          color: #59677a;
        }

        .quotation-total-row span:last-child {
          font-weight: 800;
          color: #172033;
          white-space: nowrap;
        }

        .quotation-grand-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 11px 10px;
          background: #172033;
          color: #ffffff;
        }

        .quotation-grand-total-label {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.7px;
          text-transform: uppercase;
        }

        .quotation-grand-total-value {
          font-size: 14px;
          font-weight: 900;
          white-space: nowrap;
        }

        /* =========================
           COMMERCIAL TERMS
        ========================= */

        .quotation-commercial-terms {
          margin-top: 13px;
          padding: 0 25px;
        }

        .quotation-commercial-terms-container {
          border: 1px solid #cbd5e1;
          background: #ffffff;
        }

        .quotation-commercial-terms-header {
          padding: 7px 10px;
          background: #172033;
          color: #ffffff;
          font-size: 7.5px;
          font-weight: 900;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }

        .quotation-commercial-terms-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
        }

        .quotation-commercial-term {
          min-height: 48px;
          padding: 8px 10px;
          border-right: 1px solid #d9e0e8;
          border-bottom: 1px solid #d9e0e8;
        }

        .quotation-commercial-term:nth-child(4),
        .quotation-commercial-term:nth-child(8) {
          border-right: none;
        }

        .quotation-commercial-term:nth-child(n + 5) {
          border-bottom: none;
        }

        .quotation-commercial-term-label {
          font-size: 6.5px;
          font-weight: 800;
          letter-spacing: 0.7px;
          color: #7a8799;
          text-transform: uppercase;
        }

        .quotation-commercial-term-value {
          margin-top: 3px;
          font-size: 7.5px;
          line-height: 1.3;
          font-weight: 800;
          color: #27354a;
        }

        /* =========================
           TERMS & CONDITIONS
        ========================= */

        .quotation-terms-box {
          margin-top: 13px;
          padding: 0 25px;
        }

        .quotation-terms-container {
          border: 1px solid #cbd5e1;
          background: #ffffff;
        }

        .quotation-terms-header {
          padding: 7px 10px;
          background: #f5f7fa;
          border-bottom: 1px solid #d9e0e8;
          font-size: 7.5px;
          font-weight: 900;
          letter-spacing: 1.3px;
          color: #172033;
          text-transform: uppercase;
        }

        .quotation-terms-list {
          margin: 0;
          padding: 9px 14px 9px 27px;
          columns: 2;
          column-gap: 30px;
          font-size: 7.4px;
          line-height: 1.45;
          color: #4c5a6e;
        }

        .quotation-terms-list li {
          margin-bottom: 5px;
          padding-left: 2px;
          break-inside: avoid;
        }

        .quotation-terms-list strong {
          color: #27354a;
        }

        /* =========================
           BANK / PAYMENT
        ========================= */

        .quotation-bank-section {
          margin-top: 12px;
          padding: 0 25px;
        }

        .quotation-bank-container {
          border: 1px solid #cbd5e1;
          background: #f8fafc;
        }

        .quotation-bank-header {
          padding: 7px 10px;
          border-bottom: 1px solid #d9e0e8;
          font-size: 7.5px;
          font-weight: 900;
          letter-spacing: 1.3px;
          color: #172033;
          text-transform: uppercase;
        }

        .quotation-bank-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
        }

        .quotation-bank-item {
          min-height: 38px;
          padding: 7px 10px;
          border-right: 1px solid #d9e0e8;
        }

        .quotation-bank-item:last-child {
          border-right: none;
        }

        .quotation-bank-label {
          font-size: 6.5px;
          font-weight: 800;
          letter-spacing: 0.7px;
          color: #7a8799;
          text-transform: uppercase;
        }

        .quotation-bank-value {
          margin-top: 3px;
          font-size: 7.5px;
          line-height: 1.3;
          font-weight: 800;
          color: #27354a;
          word-break: break-word;
        }

        /* =========================
           IDENTIFIERS
        ========================= */

        .quotation-identifiers {
          margin: 10px 25px 0;
          padding: 7px 10px;
          border-top: 1px solid #d9e0e8;
          border-bottom: 1px solid #d9e0e8;
          background: #ffffff;
          font-size: 7px;
          line-height: 1.35;
          color: #526176;
          text-align: center;
        }

        /* =========================
           SIGNATURE
        ========================= */

        .quotation-signature {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 55px;
          padding: 13px 25px 12px;
        }

        .quotation-signature-box {
          min-height: 48px;
        }

        .quotation-signature-right {
          text-align: right;
        }

        .quotation-signature-title {
          font-size: 8px;
          font-weight: 800;
          color: #4f5e73;
        }

        .quotation-signature-line {
          margin-top: 25px;
          padding-top: 5px;
          border-top: 1px solid #8b98aa;
          font-size: 7.5px;
          color: #718096;
        }

        /* =========================
           FOOTER
        ========================= */

        .quotation-footer {
          margin-top: auto;
          flex-shrink: 0;
          padding: 10px 25px 12px;
          border-top: 4px solid #172033;
          text-align: center;
        }

        .quotation-footer-company {
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #172033;
        }

        .quotation-footer-details {
          margin-top: 3px;
          font-size: 7px;
          line-height: 1.4;
          color: #718096;
        }

        /* =========================
           PRINT
        ========================= */

        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm;
          }

          html {
            width: 100% !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          body {
            width: 100% !important;
            height: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .quotation-print-root,
          .quotation-print-root * {
            visibility: visible !important;
          }

          .quotation-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }

          .quotation-print-toolbar {
            display: none !important;
          }

          /*
           * Keep the complete quotation on one A4 page.
           *
           * The screen layout is intentionally left unchanged.
           * For printing, Chrome was pushing the signature section
           * to page 2 because the full document was slightly taller
           * than the printable A4 area. A small print-only CSS zoom
           * gives the document enough vertical room while keeping
           * the same professional layout and all sections visible.
           */
          .quotation-document {
            position: relative !important;
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            border: 1px solid #cbd5e1 !important;
            overflow: visible !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;

            /* Keep natural print scale for readability. */
            zoom: 0.96 !important;
          }

          .quotation-content {
            flex: 0 1 auto !important;
            min-height: 0 !important;
          }

          .quotation-top-accent {
            height: 5px !important;
          }

          .quotation-header {
            padding: 11px 18px 9px !important;
            gap: 14px !important;
          }

          .quotation-logo {
            width: 50px !important;
            height: 50px !important;
          }

          .quotation-company-name {
            font-size: 21px !important;
          }

          .quotation-company-address {
            margin-top: 5px !important;
            font-size: 7px !important;
          }

          .quotation-company-contact,
          .quotation-company-ids {
            margin-top: 3px !important;
            font-size: 7px !important;
          }

          .quotation-title-block {
            min-width: 155px !important;
          }

          .quotation-title-small {
            font-size: 7px !important;
          }

          .quotation-title {
            font-size: 24px !important;
          }

          .quotation-title-sub {
            font-size: 8.5px !important;
          }

          .quotation-title-line {
            width: 75px !important;
            height: 2px !important;
            margin-top: 5px !important;
          }

          .quotation-section-heading {
            padding: 5px 18px !important;
          }

          .quotation-section-heading-title {
            font-size: 7px !important;
          }

          .quotation-section-heading-note {
            font-size: 6.2px !important;
          }

          .quotation-meta-item {
            min-height: 40px !important;
            padding: 6px 9px !important;
          }

          .quotation-label {
            font-size: 6.2px !important;
          }

          .quotation-value {
            margin-top: 3px !important;
            font-size: 8.5px !important;
          }

          .quotation-info-box {
            padding: 6px 18px !important;
          }

          .quotation-section-title {
            margin-bottom: 4px !important;
            font-size: 6.2px !important;
          }

          .quotation-buyer-name {
            font-size: 12px !important;
          }

          .quotation-small-line {
            margin-top: 3px !important;
            font-size: 7px !important;
          }

          .quotation-commercial-grid {
            gap: 5px 15px !important;
          }

          .quotation-commercial-label,
          .quotation-shipping-label {
            font-size: 6.2px !important;
          }

          .quotation-commercial-value,
          .quotation-shipping-value {
            font-size: 7px !important;
          }

          .quotation-shipping-item {
            min-height: 28px !important;
            padding: 5px 18px !important;
          }

          .quotation-products {
            padding: 7px 18px 0 !important;
          }

          .quotation-products-title {
            margin-bottom: 4px !important;
            font-size: 7px !important;
          }

          .quotation-table {
            font-size: 7px !important;
          }

          .quotation-table th {
            padding: 4px 4px !important;
            font-size: 7px !important;
          }

          .quotation-table td {
            padding: 4px 4px !important;
          }

          .quotation-product-name {
            font-size: 8px !important;
          }

          .quotation-product-code,
          .quotation-requirement {
            font-size: 6.2px !important;
          }

          .quotation-summary-grid {
            grid-template-columns: 1fr 250px !important;
            gap: 9px !important;
            padding: 7px 18px 0 !important;
          }

          .quotation-remarks-box {
            min-height: 70px !important;
            padding: 6px 9px !important;
          }

          .quotation-remarks-text {
            font-size: 7px !important;
          }

          .quotation-total-row {
            padding: 4px 8px !important;
            font-size: 7px !important;
          }

          .quotation-grand-total {
            padding: 6px !important;
          }

          .quotation-grand-total-label {
            font-size: 7px !important;
          }

          .quotation-grand-total-value {
            font-size: 12px !important;
          }

          .quotation-commercial-terms {
            margin-top: 6px !important;
            padding: 0 18px !important;
          }

          .quotation-commercial-terms-header {
            padding: 4px 8px !important;
            font-size: 7px !important;
          }

          .quotation-commercial-term {
            min-height: 28px !important;
            padding: 4px 7px !important;
          }

          .quotation-commercial-term-label {
            font-size: 6.2px !important;
          }

          .quotation-commercial-term-value {
            margin-top: 2px !important;
            font-size: 7px !important;
          }

          .quotation-terms-box {
            margin-top: 6px !important;
            padding: 0 18px !important;
          }

          .quotation-terms-header {
            padding: 4px 8px !important;
            font-size: 7px !important;
          }

          .quotation-terms-list {
            padding: 5px 9px 5px 22px !important;
            column-gap: 18px !important;
            font-size: 6.2px !important;
            line-height: 1.25 !important;
          }

          .quotation-terms-list li {
            margin-bottom: 2px !important;
          }

          .quotation-bank-section {
            margin-top: 5px !important;
            padding: 0 18px !important;
          }

          .quotation-bank-header {
            padding: 4px 8px !important;
            font-size: 7px !important;
          }

          .quotation-bank-item {
            min-height: 29px !important;
            padding: 4px 7px !important;
          }

          .quotation-bank-label {
            font-size: 6.2px !important;
          }

          .quotation-bank-value {
            margin-top: 2px !important;
            font-size: 7px !important;
          }

          .quotation-identifiers {
            margin: 6px 18px 0 !important;
            padding: 4px 7px !important;
            font-size: 6.2px !important;
          }

          .quotation-signature {
            gap: 30px !important;
            padding: 4px 18px 3px !important;
          }

          .quotation-signature-box {
            min-height: 28px !important;
          }

          .quotation-signature-title {
            font-size: 7px !important;
          }

          .quotation-signature-line {
            margin-top: 10px !important;
            padding-top: 2px !important;
            font-size: 6.2px !important;
          }

          .quotation-footer {
            padding: 2px 18px 3px !important;
          }

          .quotation-footer {
            margin-top: 0 !important;
          }

          .quotation-footer-company {
            font-size: 7px !important;
          }

          .quotation-footer-details {
            margin-top: 2px !important;
            font-size: 5.6px !important;
          }

          .quotation-top-accent,
          .quotation-header,
          .quotation-section-heading,
          .quotation-meta,
          .quotation-info-grid,
          .quotation-shipping-grid,
          .quotation-products,
          .quotation-summary-grid,
          .quotation-commercial-terms,
          .quotation-terms-box,
          .quotation-bank-section,
          .quotation-identifiers,
          .quotation-signature,
          .quotation-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .quotation-table,
          .quotation-table tbody,
          .quotation-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="quotation-print-root">
        {/* PRINT BUTTON */}

        <div className="quotation-print-toolbar">
          <button
            type="button"
            className="quotation-print-button"
            onClick={() => window.print()}
          >
            🖨️ Print Quotation
          </button>
        </div>

        {/* DOCUMENT */}

        <div className="quotation-document">
          <div className="quotation-top-accent" />

          <div className="quotation-content">
            {/* =========================
                HEADER
            ========================= */}

            <div className="quotation-header">
              <div className="quotation-brand">
                {logo && (
                  <img
                    src={logo}
                    alt="UK EXIM Enterprises Logo"
                    className="quotation-logo"
                  />
                )}

                <div>
                  <div className="quotation-company-name">
                    {companyName}
                  </div>

                  <div className="quotation-company-address">
                    {company.address || "-"}
                  </div>

                  <div className="quotation-company-contact">
                    {[
                      company.mobile,
                      company.email,
                      website,
                    ]
                      .filter(Boolean)
                      .join("  |  ")}
                  </div>

                  <div className="quotation-company-ids">
                    {[
                      company.iec
                        ? `IEC: ${company.iec}`
                        : "",
                      company.gstin
                        ? `GSTIN: ${company.gstin}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join("  |  ")}
                  </div>
                </div>
              </div>

              <div className="quotation-title-block">
                <div className="quotation-title-small">
                  International Trade
                </div>

                <div className="quotation-title">
                  EXPORT
                </div>

                <div className="quotation-title-sub">
                  QUOTATION
                </div>

                <div className="quotation-title-line" />
              </div>
            </div>

            {/* =========================
                QUOTATION DETAILS
            ========================= */}

            <div className="quotation-section-heading">
              <div className="quotation-section-heading-title">
                Quotation Details
              </div>

              <div className="quotation-section-heading-note">
                Commercial Offer
              </div>
            </div>

            <div className="quotation-meta">
              <div className="quotation-meta-item">
                <div className="quotation-label">
                  Quotation No.
                </div>

                <div className="quotation-value">
                  {quotation.quotationNo}
                </div>
              </div>

              <div className="quotation-meta-item">
                <div className="quotation-label">
                  Quotation Date
                </div>

                <div className="quotation-value">
                  {formatDate(
                    quotation.quotationDate
                  )}
                </div>
              </div>

              <div className="quotation-meta-item">
                <div className="quotation-label">
                  Enquiry Reference
                </div>

                <div className="quotation-value">
                  {quotation.enquiryNo || "-"}
                </div>
              </div>

              <div className="quotation-meta-item">
                <div className="quotation-label">
                  Valid Until
                </div>

                <div className="quotation-value">
                  {formatDate(
                    quotation.validityDate
                  )}
                </div>
              </div>
            </div>

            {/* =========================
                BUYER + COMMERCIAL
            ========================= */}

            <div className="quotation-info-grid">
              <div className="quotation-info-box">
                <div className="quotation-section-title">
                  Buyer / Consignee
                </div>

                <div className="quotation-buyer-name">
                  {quotation.customerName || "-"}
                </div>

                <div className="quotation-small-line">
                  <strong>Customer Code:</strong>{" "}
                  {quotation.customerCode || "-"}
                </div>

                <div className="quotation-small-line">
                  <strong>Contact:</strong>{" "}
                  {quotation.contactPerson || "-"}
                </div>

                <div className="quotation-small-line">
                  <strong>Country:</strong>{" "}
                  {quotation.country || "-"}
                </div>
              </div>

              <div className="quotation-info-box">
                <div className="quotation-section-title">
                  Commercial Terms
                </div>

                <div className="quotation-commercial-grid">
                  <div>
                    <div className="quotation-commercial-label">
                      Currency
                    </div>

                    <div className="quotation-commercial-value">
                      {currency}
                    </div>
                  </div>

                  <div>
                    <div className="quotation-commercial-label">
                      Incoterm
                    </div>

                    <div className="quotation-commercial-value">
                      {incoterm}
                    </div>
                  </div>

                  <div>
                    <div className="quotation-commercial-label">
                      Payment Terms
                    </div>

                    <div className="quotation-commercial-value">
                      {paymentTerms}
                    </div>
                  </div>

                  <div>
                    <div className="quotation-commercial-label">
                      Shipment Mode
                    </div>

                    <div className="quotation-commercial-value">
                      {shipmentMode}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =========================
                SHIPPING INFORMATION
            ========================= */}

            <div className="quotation-shipping-grid">
              <div className="quotation-shipping-item">
                <div className="quotation-shipping-label">
                  Country of Origin
                </div>

                <div className="quotation-shipping-value">
                  {countryOfOrigin}
                </div>
              </div>

              <div className="quotation-shipping-item">
                <div className="quotation-shipping-label">
                  Port of Loading
                </div>

                <div className="quotation-shipping-value">
                  {portOfLoading}
                </div>
              </div>

              <div className="quotation-shipping-item">
                <div className="quotation-shipping-label">
                  Offer Status
                </div>

                <div className="quotation-shipping-value">
                  {quotation.status || "-"}
                </div>
              </div>
            </div>

            {/* =========================
                PRODUCTS
            ========================= */}

            <div className="quotation-products">
              <div className="quotation-products-title">
                Products & Commercial Offer
              </div>

              <table className="quotation-table">
                <thead>
                  <tr>
                    <th>Sr.</th>
                    <th>Product Description</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {quotation.items.map(
                    (item, index) => {
                      const amount =
                        Number(item.qty || 0) *
                        Number(
                          item.unitPrice || 0
                        );

                      return (
                        <tr
                          key={`${quotation.id}-${item.productCode}-${index}`}
                        >
                          <td>{index + 1}</td>

                          <td>
                            <div className="quotation-product-name">
                              {item.productName ||
                                "-"}
                            </div>

                            {item.productCode && (
                              <div className="quotation-product-code">
                                Product Code:{" "}
                                {item.productCode}
                              </div>
                            )}

                            {item.customerRequirement && (
                              <div className="quotation-requirement">
                                Requirement:{" "}
                                {
                                  item.customerRequirement
                                }
                              </div>
                            )}
                          </td>

                          <td>
                            {formatNumber(
                              item.qty
                            )}
                          </td>

                          <td>
                            {item.unit || "-"}
                          </td>

                          <td>
                            {formatNumber(
                              item.unitPrice
                            )}
                          </td>

                          <td>
                            <strong>
                              {formatNumber(
                                amount
                              )}
                            </strong>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* =========================
                SUMMARY
            ========================= */}

            <div className="quotation-summary-grid">
              <div className="quotation-remarks-box">
                <div className="quotation-section-title">
                  Offer Remarks
                </div>

                <div className="quotation-remarks-text">
                  {quotation.remarks ||
                    "We are pleased to submit our commercial offer for the above products. Final transaction terms shall be confirmed mutually before order acceptance."}
                </div>
              </div>

              <div className="quotation-totals">
                <div className="quotation-total-row">
                  <span>Goods Value</span>

                  <span>
                    {formatMoney(
                      totals.goodsValue,
                      currency
                    )}
                  </span>
                </div>

                <div className="quotation-total-row">
                  <span>Freight</span>

                  <span>
                    {formatMoney(
                      totals.freight,
                      currency
                    )}
                  </span>
                </div>

                <div className="quotation-total-row">
                  <span>Insurance</span>

                  <span>
                    {formatMoney(
                      totals.insurance,
                      currency
                    )}
                  </span>
                </div>

                <div className="quotation-total-row">
                  <span>Other Charges</span>

                  <span>
                    {formatMoney(
                      totals.otherCharges,
                      currency
                    )}
                  </span>
                </div>

                <div className="quotation-grand-total">
                  <span className="quotation-grand-total-label">
                    Total Offer Value
                  </span>

                  <span className="quotation-grand-total-value">
                    {formatMoney(
                      totals.total,
                      currency
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* =========================
                EXPORT COMMERCIAL TERMS
            ========================= */}

            <div className="quotation-commercial-terms">
              <div className="quotation-commercial-terms-container">
                <div className="quotation-commercial-terms-header">
                  Export Commercial Terms
                </div>

                <div className="quotation-commercial-terms-grid">
                  <div className="quotation-commercial-term">
                    <div className="quotation-commercial-term-label">
                      Currency
                    </div>

                    <div className="quotation-commercial-term-value">
                      {currency}
                    </div>
                  </div>

                  <div className="quotation-commercial-term">
                    <div className="quotation-commercial-term-label">
                      Price Basis
                    </div>

                    <div className="quotation-commercial-term-value">
                      {incoterm}
                    </div>
                  </div>

                  <div className="quotation-commercial-term">
                    <div className="quotation-commercial-term-label">
                      Payment
                    </div>

                    <div className="quotation-commercial-term-value">
                      {paymentTerms}
                    </div>
                  </div>

                  <div className="quotation-commercial-term">
                    <div className="quotation-commercial-term-label">
                      Shipment Mode
                    </div>

                    <div className="quotation-commercial-term-value">
                      {shipmentMode}
                    </div>
                  </div>

                  <div className="quotation-commercial-term">
                    <div className="quotation-commercial-term-label">
                      Origin
                    </div>

                    <div className="quotation-commercial-term-value">
                      {countryOfOrigin}
                    </div>
                  </div>

                  <div className="quotation-commercial-term">
                    <div className="quotation-commercial-term-label">
                      Port of Loading
                    </div>

                    <div className="quotation-commercial-term-value">
                      {portOfLoading}
                    </div>
                  </div>

                  <div className="quotation-commercial-term">
                    <div className="quotation-commercial-term-label">
                      Validity
                    </div>

                    <div className="quotation-commercial-term-value">
                      Until{" "}
                      {formatDate(
                        quotation.validityDate
                      )}
                    </div>
                  </div>

                  <div className="quotation-commercial-term">
                    <div className="quotation-commercial-term-label">
                      Delivery
                    </div>

                    <div className="quotation-commercial-term-value">
                      As mutually agreed
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =========================
                TERMS & CONDITIONS
            ========================= */}

            <div className="quotation-terms-box">
              <div className="quotation-terms-container">
                <div className="quotation-terms-header">
                  Terms & Conditions of Export Quotation
                </div>

                <ol className="quotation-terms-list">
                  <li>
                    <strong>Validity:</strong>{" "}
                    This quotation is valid until{" "}
                    {formatDate(
                      quotation.validityDate
                    )}
                    . Prices and commercial terms
                    may be revised after the validity
                    period.
                  </li>

                  <li>
                    <strong>Order Confirmation:</strong>{" "}
                    This quotation is a commercial
                    offer. The transaction becomes
                    binding upon written order
                    confirmation and mutual acceptance
                    of the final commercial terms.
                  </li>

                  <li>
                    <strong>Payment:</strong>{" "}
                    Payment shall be made according
                    to the agreed payment terms.
                    Order processing and shipment may
                    be subject to receipt of the agreed
                    advance or acceptable banking
                    instrument.
                  </li>

                  <li>
                    <strong>Price Basis:</strong>{" "}
                    Prices are quoted on the stated
                    Incoterm basis. Costs outside the
                    stated scope shall be borne as
                    mutually agreed.
                  </li>

                  <li>
                    <strong>Freight & Insurance:</strong>{" "}
                    Freight and insurance are included
                    only to the extent specifically
                    mentioned in this quotation.
                  </li>

                  <li>
                    <strong>Packing:</strong>{" "}
                    Standard export packing is included
                    unless otherwise specified.
                    Special or customized packing may
                    be charged separately.
                  </li>

                  <li>
                    <strong>Taxes & Duties:</strong>{" "}
                    Destination-country import duties,
                    taxes, customs charges and local
                    destination expenses shall be borne
                    by the buyer unless otherwise agreed.
                  </li>

                  <li>
                    <strong>Shipment & Delivery:</strong>{" "}
                    Shipment schedule is estimated and
                    remains subject to product
                    availability, payment realization,
                    documentation, carrier availability
                    and logistics conditions.
                  </li>

                  <li>
                    <strong>Documents & Certificates:</strong>{" "}
                    Export documents and certificates
                    shall be provided as mutually agreed
                    and subject to applicable requirements
                    and availability.
                  </li>

                  <li>
                    <strong>Force Majeure:</strong>{" "}
                    Delivery and performance commitments
                    are subject to circumstances beyond
                    reasonable control, including natural
                    events, war, strikes, government
                    restrictions, transport disruption
                    or other force majeure conditions.
                  </li>

                  <li>
                    <strong>Partial Shipment / Transshipment:</strong>{" "}
                    Partial shipment or transshipment
                    shall be subject to the mutually
                    agreed shipment arrangement.
                  </li>

                  <li>
                    <strong>Final Confirmation:</strong>{" "}
                    Product specifications, quantities,
                    packing, shipment schedule and other
                    commercial conditions shall be finally
                    confirmed before order execution.
                  </li>
                </ol>
              </div>
            </div>

            {/* =========================
                BANK / PAYMENT
            ========================= */}

            <div className="quotation-bank-section">
              <div className="quotation-bank-container">
                <div className="quotation-bank-header">
                  Bank / Payment Information
                </div>

                <div className="quotation-bank-grid">
                  <div className="quotation-bank-item">
                    <div className="quotation-bank-label">
                      Export Account
                    </div>

                    <div className="quotation-bank-value">
                      {bankAccount ||
                        "To be confirmed"}
                    </div>
                  </div>

                  <div className="quotation-bank-item">
                    <div className="quotation-bank-label">
                      SWIFT / BIC
                    </div>

                    <div className="quotation-bank-value">
                      {swiftBic ||
                        "To be confirmed"}
                    </div>
                  </div>

                  <div className="quotation-bank-item">
                    <div className="quotation-bank-label">
                      AD Code
                    </div>

                    <div className="quotation-bank-value">
                      {adCode ||
                        "To be confirmed"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =========================
                COMPANY IDENTIFIERS
            ========================= */}

            <div className="quotation-identifiers">
              {[
                company.iec
                  ? `IEC: ${company.iec}`
                  : "",
                company.gstin
                  ? `GSTIN: ${company.gstin}`
                  : "",
                international.pan
                  ? `PAN: ${international.pan}`
                  : "",
                company.fssai
                  ? `FSSAI: ${company.fssai}`
                  : "",
                international.udyam
                  ? `Udyam: ${international.udyam}`
                  : "",
              ]
                .filter(Boolean)
                .join("  |  ")}
            </div>

            {/* =========================
                SIGNATURE
            ========================= */}

            <div className="quotation-signature">
              <div className="quotation-signature-box">
                <div className="quotation-signature-title">
                  Customer Acceptance
                </div>

                <div className="quotation-signature-line">
                  Name / Signature / Date
                </div>
              </div>

              <div className="quotation-signature-box quotation-signature-right">
                <div className="quotation-signature-title">
                  For {companyName}
                </div>

                <div className="quotation-signature-line">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>

          {/* =========================
              FOOTER
          ========================= */}

          <div className="quotation-footer">
            <div className="quotation-footer-company">
              {companyName}
            </div>

            <div className="quotation-footer-details">
              {[
                company.address,
                company.mobile,
                company.email,
                website,
              ]
                .filter(Boolean)
                .join("  |  ")}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}