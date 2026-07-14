export type Supplier = {
  id: string;
  code: string;

  name: string;
  contactPerson: string;

  mobile: string;
  email: string;

  gst: string;
  pan: string;

  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;

  openingBalance: number;
  creditLimit: number;

  status: "Active" | "Inactive";
};