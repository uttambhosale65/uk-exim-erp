export type ExportCustomer = {
  id: string;
  code: string;

  // Basic Details
  name: string;
  contactPerson: string;
  mobile: string;
  email: string;

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

  // Status
  status: "Active" | "Inactive";

  // Additional Information
  remarks: string;
};