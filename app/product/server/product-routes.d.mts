type ProductDAL = {
  listProducts: () => Promise<unknown[]>;
  getProduct: (id: string) => Promise<unknown | null>;
  createProduct: (input: unknown) => Promise<unknown>;
  updateProduct: (id: string, input: unknown) => Promise<unknown | null>;
  deactivateProduct: (id: string) => Promise<unknown | null>;
};

export function createProductRouteHandlers(productDAL: ProductDAL): {
  list: (request: Request) => Promise<Response>;
  create: (request: Request) => Promise<Response>;
  get: (request: Request, id: string) => Promise<Response>;
  update: (request: Request, id: string) => Promise<Response>;
  deactivate: (request: Request, id: string) => Promise<Response>;
};
