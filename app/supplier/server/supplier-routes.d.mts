export function createSupplierRouteHandlers(supplierDAL: {
  listSuppliers(options?: { q?: string; status?: string | null; limit?: number; offset?: number }): Promise<unknown>;
  getSupplier(id: string): Promise<unknown | null>;
  createSupplier(input: unknown): Promise<unknown>;
  updateSupplier(id: string, input: unknown): Promise<unknown | null>;
  setSupplierStatus(id: string, status: "Active" | "Inactive"): Promise<unknown | null>;
  checkDuplicateWarnings(input: unknown, excludeId?: string | null): Promise<string[]>;
}): {
  list(request: Request): Promise<Response>;
  create(request: Request): Promise<Response>;
  get(request: Request, id: string): Promise<Response>;
  update(request: Request, id: string): Promise<Response>;
  setStatus(request: Request, id: string, status: "Active" | "Inactive"): Promise<Response>;
  duplicateCheck(request: Request): Promise<Response>;
};
