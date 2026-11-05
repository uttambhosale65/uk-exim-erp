# UK EXIM ERP – VERSION 1.0
## CLOUD DATABASE ARCHITECTURE & MIGRATION – MASTER CONTINUATION PROMPT

आपण UK EXIM ENTERPRISES साठी UK EXIM ERP Version 1.0 विकसित करत आहोत.

या Project चे पुढील उद्दिष्ट म्हणजे सध्याच्या LocalStorage-Based ERP ला सुरक्षित, Professional, Multi-Tenant Cloud SaaS ERP मध्ये रूपांतरित करण्यासाठी Database Architecture, Data Dictionary, Migration Plan आणि Backend Architecture तयार करणे.

### 1. BUSINESS & PRODUCT DIRECTION

- Brand: UK EXIM ERP
- Business: UK EXIM ENTERPRISES
- Target Market: India First
- Deployment: Cloud SaaS
- Target Customers: Trading, Wholesale, Distribution, Export-Import आणि Manufacturing Businesses.
- Positioning: Mid-Range Premium.
- Platform: एक Multi-Tenant Cloud ERP Platform.
- प्रत्येक Company चा Data पूर्णपणे स्वतंत्र आणि सुरक्षित असला पाहिजे.

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

**Documentation reconciliation completed against the current repository checkout (`29db49d`):** the Data Dictionary now lists the 22 source-defined LocalStorage keys, records that all 22 are in the current `ERPBackup.ts` allowlist, and points the Export Reservation key to its actual storage file. The Product Master Cloud Mapping now records source-supported fields and code-level relationships and identifies unresolved behavior. These documents do not establish that a backup was run or tested, and do not establish a cloud database, authentication, multi-tenancy, or migration implementation.

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

### 8. NEXT AUDIT TASKS

आधीची खालील audit list ही ऐतिहासिक pending list आहे; तिच्यातील प्रत्येक मुद्दा पूर्ण झाला आहे असे या दस्तऐवजीકરણ reconciliation वरून गृहीत धरू नये. पूर्ण Data Flow आणि सर्व migration-relevant behavior स्वतंत्र source review मधूनच निश्चित करायचे आहे.

विशेषतः:
- Purchase Master – Save, Edit, Delete आणि Stock Rebuild.
- Sales Parent Component – Save, Edit, Delete आणि Stock Rebuild.
- Stock Opening Balance Entry.
- Customer आणि Supplier Data Structures.
- Invoice आणि Company Settings.
- Reports आणि Export Module मधील संबंधित Data Structures.

आधीच दिलेल्या फाइल्स पुन्हा मागू नयेत. Product Master documentation review साठी actual source files तपासले गेले; याचा अर्थ इतर listed data-flow audit tasks पूर्ण झाले असा नाही.

### 9. CLOUD DATABASE DESIGN

Source Audit पूर्ण झाल्यानंतर खालील गोष्टी तयार करायच्या आहेत:

1. Final Cloud Database Data Dictionary.
2. Complete Entity Relationship Diagram (ERD).
3. PostgreSQL Database Schema.
4. Multi-Tenant Company Architecture.
5. Company-wise Data Isolation.
6. User Authentication आणि Role-Based Access.
7. Products, Customers, Suppliers Tables.
8. Purchase आणि Purchase Items Tables.
9. Sales आणि Sales Items Tables.
10. Stock Ledger आणि Stock Balance Architecture.
11. Invoice आणि Payment Tables.
12. Company Settings आणि Bank Settings.
13. Audit Logs.
14. Created At / Updated At / Created By / Updated By Fields.
15. Database Indexing आणि Constraints.
16. Backup आणि Recovery Architecture.

प्रत्येक Table मध्ये आवश्यकतेनुसार `company_id` वापरून Tenant Isolation सुनिश्चित करायचे आहे.

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

### 12. IMMEDIATE NEXT OBJECTIVE

**Completed in this documentation-only step:** reconciled the Data Dictionary against current source for LocalStorage inventory and `ERPBackup.ts` allowlist; corrected the Export Reservation storage path; recorded current repository baseline; and created a source-bounded Product Master Cloud Mapping with unresolved questions clearly identified.

**Still pending:** complete the remaining source-code/data-flow audit before approving a cloud schema or migration plan.

त्यानंतर Final Cloud Database Architecture आणि Migration Plan तयार करायचा.

अजून कोणतेही Production Database किंवा Cloud Deployment सुरू करू नये.

आपली प्राथमिकता:

**Reliability > Data Safety > Correct Calculations > Ease of Use > Professional UI**

UK EXIM ERP चे ध्येय:

**Built for Business. Designed for Trust.**

आता या Master Continuation Prompt नुसार मागील काम पुढे सुरू करा. आधी पूर्ण झालेल्या कामाची पुनरावृत्ती करू नका आणि पुढचा एकच आवश्यक Step द्या.

### 13. VERIFIED IMPLEMENTATION BOUNDARY AND RECONCILIATION STATUS (2026-11-05)

- The current repository source defines 22 LocalStorage keys; `app/utils/ERPBackup.ts` currently lists all 22 in `BACKUP_KEYS`. This is source inspection only. The owner's live Google Chrome LocalStorage remains the business data source and was not accessed, exported, cleared, or modified.
- The backup implementation's code paths were inspected but backup and restore were not run. Runtime reliability, recovery procedures, and actual browser data contents are unverified.
- The Data Dictionary and Product Master Cloud Mapping are source-derived planning documents, not an approved SQL schema. Existing cloud table and field proposals remain proposals.
- No database connection, authentication system, multi-tenant enforcement, cloud deployment, or migration has been verified by this reconciliation. These remain pending design, owner decisions, and separate implementation/review.
- The Product Master source contains 19 `Product` fields. `app/product/page.tsx` and `app/product/components/ProductMaster.tsx` have differing save behavior for packet `stockBaseCode`; the authoritative UI path must be resolved before treating that behavior as a settled business rule.
- Product cloud mapping unresolved items include product-code uniqueness scope, `stockBaseCode` integrity, `Product.stock` versus live stock meaning, and price/tax currency and precision policies.

The next safe work is to continue the source-code audit and resolve these questions from source and owner decisions. Do not inspect or manipulate the owner's live Chrome LocalStorage as part of that work.
