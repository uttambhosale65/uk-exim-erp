import type { Supplier } from "../../components/supplier/SupplierTypes";

type SupplierDatabase = {
  query: (sql: string, parameters?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  connect: () => Promise<{
    query: (sql: string, parameters?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
    release: () => void;
  }>;
};

type OwnerContext = { company?: { company_id?: string } } | null;

export class SupplierRequestError extends Error {
  code: string;
}

export function createSupplierDAL(options: {
  getOwnerContext: () => Promise<OwnerContext>;
  database: SupplierDatabase;
  idFactory?: () => string;
}): {
  listSuppliers: (options?: { q?: string; status?: string | null; limit?: number; offset?: number }) => Promise<{ suppliers: Supplier[]; nextCode: string }>;
  getSupplier: (id: string) => Promise<Supplier | null>;
  checkDuplicateWarnings: (input: unknown, excludeId?: string | null) => Promise<string[]>;
  createSupplier: (input: unknown) => Promise<Supplier>;
  updateSupplier: (id: string, input: unknown) => Promise<Supplier | null>;
  setSupplierStatus: (id: string, status: "Active" | "Inactive") => Promise<Supplier | null>;
};
