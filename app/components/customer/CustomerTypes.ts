export type Customer = {
  id: string;
  code: string;

  // Basic Details
  name: string;
  contactPerson: string;
  mobile: string;
  email: string;

  // Tax Details
  gst: string;
  pan: string;

  // Address
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;

  // Financial
  openingBalance: number;
  creditLimit: number;

  // Status
  status: "Active" | "Inactive";

  // Optional (Recommended)
  whatsapp?: string;
  paymentTerms?: string;
  remarks?: string;
};