
export type ExportCustomer = {
  id: string;
  code: string;

  // Basic Details
  name: string;
  contactPerson: string;
  mobile: string;
  email: string;

  // Business Details
  businessRole?:
    | "Importer"
    | "Exporter"
    | "Importer & Exporter"
    | "Manufacturer"
    | "Trader"
    | "Distributor"
    | "Agent/Broker"
    | "Service Provider"
    | "Other";

  industry?:
    | "Food & Agriculture"
    | "Spices"
    | "Engineering"
    | "Textiles & Garments"
    | "Chemicals"
    | "Pharmaceuticals"
    | "Packaging"
    | "Consumer Goods"
    | "Other";

  // International Details
  country: string;
  currency: string;

  // Address
  address: string;
  city: string;
  stateProvince: string;
  postalCode: string;

  // Tax / Registration
  taxRegistrationNo: string;

  // Commercial Terms
  paymentTerms: string;

  // Source / Event
  sourceEvent?: string;

  // Interested Products
  interestedProducts?: string;

  // Status
  status: "Active" | "Inactive";

  // Additional Information
  remarks: string;
};