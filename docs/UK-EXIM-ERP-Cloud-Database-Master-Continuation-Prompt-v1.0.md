# UK EXIM ERP – VERSION 1.0
## CLOUD DATABASE ARCHITECTURE & MIGRATION – MASTER CONTINUATION PROMPT

आपण UK EXIM ENTERPRISES साठी UK EXIM ERP Version 1.0 विकसित करत आहोत.

**Current approved priority (2026-11-07):** प्रथम विद्यमान ERP सुरक्षित server-side persistence सह फक्त UK EXIM ENTERPRISES साठी Online करणे. Commercial multi-tenant SaaS, subscriptions आणि licensing हे नंतरचे टप्पे आहेत; सध्या ते implement करू नयेत. भविष्यात विस्तार शक्य राहावा म्हणून company ownership boundary प्रस्तावित करता येईल.

### 1. BUSINESS & PRODUCT DIRECTION

- Brand: UK EXIM ERP
- Business: UK EXIM ENTERPRISES
- Initial user: UK EXIM ENTERPRISES only.
- Immediate objective: secure online use across owner-approved devices.
- Future market, commercial SaaS, subscriptions, pricing and licensing are deferred and not authorized by Stage 0.
- Add a company ownership boundary as a future-proof data-model proposal; do not implement SaaS control-plane features now.

### 2. CURRENT TECHNOLOGY

- Next.js 16.2.9
- React / React DOM 19.2.4
- TypeScript (declared as `^5` in `package.json`)
- Current Storage: Browser LocalStorage
- Development Environment: Windows 11 Pro + VS Code

The versions above are verified from the current repository package manifest and lockfile. This describes the checked-in project; it does not establish production deployment configuration.

### 3. EXISTING ERP MODULES

1. Dashboard
2. Product Master
3. Customer Master
4. Supplier Master
5. Purchase / GRN
6. Sales / Issue
7. Stock / Inventory
8. Invoice
9. Reports
10. Company Settings
11. Bank / Payment Settings
12. Export Management

Import Management आणि Advanced Manufacturing Features पुढील टप्प्यांमध्ये विकसित करायचे आहेत.

### 4. ALREADY CREATED DOCUMENTS

Project च्या `docs` Folder मध्ये खालील Documents उपलब्ध आहेत:

- UK-EXIM-ERP-Cloud-Database-Data-Dictionary-v1.0.md
- UK-EXIM-ERP-Product-Master-Cloud-Mapping-v1.0.md

या Documents चा अभ्यास करून त्यांना प्रत्यक्ष Source Code Audit नुसार Update करायचे आहे.

**Earlier documentation reconciliation (historical):** previous documents referenced commit `29db49d` and 22 LocalStorage keys. Those values are superseded by the verified Stage 0 source inventory below.

### 5. SOURCE CODE AUDIT – COMPLETED FILES

खालील Source Files आधीच तपासलेल्या आहेत. त्या पुन्हा मागू नयेत.

**Product Master**
- app/product/components/ProductStorage.ts
- app/product/components/ProductTypes.ts
- app/product/components/ProductForm.tsx
- app/product/components/ProductMaster.tsx
- app/product/components/ProductTable.tsx

**Stock**
- app/components/stock/StockStorage.ts
- app/components/stock/StockTypes.ts

**Purchase / GRN**
- app/components/customer/purchase/PurchaseStorage.ts
- app/components/customer/purchase/PurchaseTypes.ts
- app/components/customer/purchase/PurchaseForm.tsx

**Sales**
- app/components/customer/sales/SalesStorage.ts
- app/components/customer/sales/SalesTypes.ts
- app/components/customer/sales/SalesForm.tsx
- app/components/customer/sales/SalesMaster.tsx

### 6. IMPORTANT SOURCE CODE FINDINGS

**Product Master**
- Product Unit: Gram, KG, Pkt.
- Product type मध्ये 19 fields आहेत (`app/product/components/ProductTypes.ts`); प्रत्यक्ष product save paths मधील काही फरक खालील reconciliation status मध्ये नोंदवले आहेत.
- `stockBaseCode` Optional आहे.
- Packet Products साठी Base Product निवडता येतो.
- `netWeight` द्वारे Packet चे KG मध्ये Conversion होते.
- Product Master मधील `stock` आणि Stock Module मधील Live Stock यांचा संबंध अजून पूर्ण तपासायचा आहे.

**Purchase / GRN**
- Storage Key: `uk-exim-purchases`
- एका GRN मध्ये Multiple Products असतात.
- Purchase आणि Purchase Items Cloud Database मध्ये स्वतंत्र Tables मध्ये ठेवण्याची शक्यता तपासायची आहे.
- जुन्या Single Product GRN Structure चे Multi Product Structure मध्ये Normalization केले जाते.

**Sales**
- Storage Key: `uk-exim-sales`
- एका Sales मध्ये Multiple Products असू शकतात.
- Sales Item मध्ये Product, Unit, Quantity, Rate, GST आणि Amount संबंधित Fields आहेत.
- Sales Form मध्ये Quantity थेट घेतली जाते.
- Sales Form मधील Quantity आणि Stock Module मधील KG Conversion यांचा संबंध तपासायचा आहे.

**Stock**
- Storage Key: `uk-exim-stock`
- Stock हा Purchase आणि Sales Transactions वरून Rebuild केला जातो.
- Current Stock Formula:

  Opening Stock + Purchase Quantity - Sales Quantity

- Packet Conversion:

  Packet Quantity × Net Weight (g) ÷ 1000

- Gram Conversion:

  Gram Quantity ÷ 1000

- KG Conversion:

  Quantity तशीच KG मध्ये.

- Stock हा फक्त Product Master मधील Field वर अवलंबून नसून Transaction Data वर आधारित आहे.
- `loadStock()` मध्ये Stock Rebuild होतो. Cloud Architecture मध्ये ही प्रक्रिया सुरक्षितपणे डिझाइन करणे आवश्यक आहे.

### 7. COMPLETED STOCK CONVERSION CORRECTION

Turmeric Powder च्या एका Packet Product मध्ये Net Weight 1018 g नोंदले होते. प्रत्यक्ष Net Weight 1000 g होते.

20 Packets विकल्यावर ERP ने 20.360 KG Stock कमी केला.

User ने:
- चुकीची Sales Entry Delete केली.
- Product Master मधील Net Weight 1000 g केले.
- आता ही समस्या दुरुस्त झाली आहे.

हा मुद्दा Closed आहे.

सध्याच्या Domestic ERP साठी Net Weight पुरेसे आहे. Gross Weight चे स्वतंत्र Field आत्ता आवश्यक नाही.

### 8. SOURCE AUDIT STATUS BEFORE STAGE 0

खालील audit list ऐतिहासिक आहे; Stage 0 मध्ये relevant source types, storage helpers, settings shapes, forms, writes, reports/calculations, backup code आणि stock movement flow यांचा पुनरावलोकन केला आहे. Actual saved records तपासलेले नाहीत.

Stage 0 मध्ये source-level वर खालील भाग तपासले गेले:
- Purchase/Sales storage, form/master posting paths, stock movement snapshots, edit/delete protections and reports.
- Stock baseline, legacy rebuild boundary, protected cutover, movement ledger and recovery journal source.
- Customer/Supplier/Product and export entity TypeScript structures and discovered storage helpers.
- Settings object shapes, backup allowlist and available backup/restore code paths.
- Export inventory, reservations, packing, shipments and document-number reference patterns.

Actual browser records, backup files and runtime recovery remain uninspected.

Source review म्हणजे production data validation नाही. कोणतेही browser values, runtime backup किंवा restore तपासलेले नाहीत.

### 9. ONLINE DATABASE DESIGN — SINGLE COMPANY FIRST

Source Audit पूर्ण झाल्यानंतर खालील गोष्टी तयार करायच्या आहेत:

1. Final Cloud Database Data Dictionary.
2. Complete Entity Relationship Diagram (ERD).
3. PostgreSQL Database Schema.
4. UK EXIM ENTERPRISES ownership boundary (`company_id` proposal); no SaaS subscription platform now.
5. Server-side company-scoped authorization.
6. User Authentication आणि Role-Based Access.
7. Products, Customers, Suppliers Tables.
8. Purchase आणि Purchase Items Tables.
9. Sales आणि Sales Items Tables.
10. Stock Ledger आणि Stock Balance Architecture.
11. Invoice records; a separate payment ledger only if approved after source/business review (none exists in current domestic types).
12. Company Settings आणि Bank Settings.
13. Audit Logs.
14. Created At / Updated At / Created By / Updated By Fields.
15. Database Indexing आणि Constraints.
16. Backup आणि Recovery Architecture.

Company-owned tables साठी proposed `company_id` वापरायचा. This is a future-proof ownership boundary for the single-company release, not authorization to build a commercial multi-tenant control plane.

### 10. DATA MIGRATION PLAN

सध्याच्या LocalStorage मधील डेटा सुरक्षित ठेवून Cloud Database मध्ये Migration करण्याची योजना तयार करायची आहे.

- Existing IDs सुरक्षित ठेवणे.
- Existing Product Codes सुरक्षित ठेवणे.
- Existing GRN आणि Sales Numbers सुरक्षित ठेवणे.
- Opening Stock आणि Transaction History जतन करणे.
- Duplicate Records टाळणे.
- Purchase आणि Sales Totals तपासणे.
- Stock Balances Reconcile करणे.
- Migration आधी आणि नंतर Record Counts तपासणे.
- Migration Testing स्वतंत्र Environment मध्ये करणे.

Production Data वर थेट प्रयोग करू नयेत.

### 11. STRICT DEVELOPMENT RULES

- आधी Source Code समजून घ्यायचा.
- अंदाजाने Database Fields तयार करू नयेत.
- Existing Working Features बदलू नयेत.
- Existing Data Delete किंवा Overwrite करू नये.
- Restore वापरण्याची सूचना देऊ नये.
- Production SQL तयार करण्याआधी पूर्ण Data Structure तपासायची.
- एकावेळी एकच Step द्यायचा.
- प्रत्येक Step सोप्या मराठीत समजावून सांगायचा.
- आवश्यक असल्यास पूर्ण Updated File द्यायची.
- Code बदलण्याआधी Current File तपासायची.

### 12. STAGE 0 COMPLETION AND NEXT GATE

**Stage 0 documentation completed against repository commit `8eba53d2a76b68f9da6780b75b1f0e8449b97738`:** verified active source key inventory, type/field inventory, storage and transaction relationships, protected stock behavior, current financial calculation evidence, proposed PostgreSQL mapping and owner-controlled migration safeguards. Updated the Data Dictionary, Product Master mapping and this continuation document; added `UK-EXIM-ERP-PostgreSQL-Data-Model-Proposal-v1.0.md`.

**Next gate:** owner review and explicit approval. Do not start PostgreSQL implementation, authentication, database creation, paid service configuration, deployment or actual-data migration before approval and any separately required authorization.

आपली प्राथमिकता:

**Reliability > Data Safety > Correct Calculations > Ease of Use > Professional UI**

UK EXIM ERP चे ध्येय:

**Built for Business. Designed for Trust.**

आता या Master Continuation Prompt नुसार मागील काम पुढे सुरू करा. आधी पूर्ण झालेल्या कामाची पुनरावृत्ती करू नका आणि पुढचा एकच आवश्यक Step द्या.

### 13. VERIFIED IMPLEMENTATION BOUNDARY AND STAGE 0 STATUS (2026-11-07)

- The current repository source defines 23 active LocalStorage keys. `app/utils/ERPBackup.ts` lists these 23 plus backup-only legacy marker `uk-exim-sales-numbering-v2`, for 24 allowlist entries. This is source inspection only. The owner's live Google Chrome LocalStorage remains the business data source and was not accessed, exported, cleared, or modified.
- The backup implementation's code paths were inspected but backup and restore were not run. Runtime reliability, recovery procedures, and actual browser data contents are unverified.
- The Data Dictionary, Product Master Cloud Mapping and PostgreSQL Data Model Proposal are source-derived planning documents, not an approved production SQL schema.
- No database connection, authentication, online persistence, cloud deployment or migration has been verified. Those remain future implementation work requiring owner approval.
- The Product Master source contains 19 `Product` fields. `/product` (`app/product/page.tsx`) assigns P0006 to packet `stockBaseCode`; the dashboard reusable Product Master path saves the form mapping. Post-cutover stock movement code independently maps P0001–P0005 to P0006 and P0007 to itself. Preserve this distinction in the online implementation.
- Product cloud mapping unresolved items include product-code uniqueness scope, `stockBaseCode` integrity, `Product.stock` versus live stock meaning, and price/tax currency and precision policies.

Remaining unknowns concern actual saved records, duplicates/orphans, field validity, financial precision policy, numbering scope and owner decisions. Resolve these using only a separately approved owner-controlled export into isolated offline/staging validation. Do not inspect or manipulate the owner's live Chrome LocalStorage.
