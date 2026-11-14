import type { Customer } from "../../components/customer/CustomerTypes";

type CustomerDatabase = {
  query: (sql: string, parameters?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  connect: () => Promise<{
    query: (sql: string, parameters?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
    release: () => void;
  }>;
};

type OwnerContext = { company?: { company_id?: string } } | null;

export class CustomerRequestError extends Error {
  code: string;
}

export function createCustomerDAL(options: {
  getOwnerContext: () => Promise<OwnerContext>;
  database: CustomerDatabase;
  idFactory?: () => string;
}): {
  countCustomers: () => Promise<number>;
  listCustomers: (options?: { q?: string; status?: string | null; limit?: number; offset?: number }) => Promise<{ customers: Customer[]; nextCode: string }>;
  getCustomer: (id: string) => Promise<Customer | null>;
  checkDuplicateWarnings: (input: unknown, excludeId?: string | null) => Promise<string[]>;
  createCustomer: (input: unknown) => Promise<Customer>;
  updateCustomer: (id: string, input: unknown) => Promise<Customer | null>;
  deactivateCustomer: (id: string) => Promise<Customer | null>;
  reactivateCustomer: (id: string) => Promise<Customer | null>;
};
