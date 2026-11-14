type CustomerDAL = {
  listCustomers: (options?: { q?: string; status?: string | null; limit?: number; offset?: number }) => Promise<unknown>;
  getCustomer: (id: string) => Promise<unknown | null>;
  createCustomer: (input: unknown) => Promise<unknown>;
  updateCustomer: (id: string, input: unknown) => Promise<unknown | null>;
  deactivateCustomer: (id: string) => Promise<unknown | null>;
  reactivateCustomer: (id: string) => Promise<unknown | null>;
  checkDuplicateWarnings: (input: unknown, excludeId?: string | null) => Promise<string[]>;
};

export function createCustomerRouteHandlers(customerDAL: CustomerDAL): {
  count: () => Promise<Response>;
  list: (request: Request) => Promise<Response>;
  create: (request: Request) => Promise<Response>;
  get: (request: Request, id: string) => Promise<Response>;
  update: (request: Request, id: string) => Promise<Response>;
  deactivate: (request: Request, id: string) => Promise<Response>;
  reactivate: (request: Request, id: string) => Promise<Response>;
  duplicateCheck: (request: Request) => Promise<Response>;
};
