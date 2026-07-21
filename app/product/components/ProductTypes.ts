export type Product = {
  id: string;

  code: string;
  name: string;
  category: string;

  hsn: string;
  gst: string;

  unit: "Gram" | "KG";
  netWeight: number;

  purchase: number;
  sale: number;
  mrp: number;

  stock: number;
  minimumStock: number;

  active: boolean;
};