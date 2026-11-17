import "server-only";

const PRODUCT_COLUMNS = `
  id,
  company_id,
  code,
  name,
  category,
  hsn,
  gst,
  unit,
  net_weight,
  stock_base_code,
  purchase,
  sale,
  mrp,
  base_cost,
  packing_cost,
  other_charges,
  total_cost,
  stock,
  minimum_stock,
  active`;

const PRODUCT_UNITS = new Set(["Gram", "KG", "Pkt"]);
const PRODUCT_FIELDS = new Set([
  "id",
  "code",
  "name",
  "category",
  "hsn",
  "gst",
  "unit",
  "netWeight",
  "stockBaseCode",
  "purchase",
  "sale",
  "mrp",
  "baseCost",
  "packingCost",
  "otherCharges",
  "totalCost",
  "stock",
  "minimumStock",
  "active",
]);

export class ProductRequestError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProductRequestError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ProductRequestError(code, message);
}

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    hsn: row.hsn,
    gst: row.gst,
    unit: row.unit,
    netWeight: Number(row.net_weight),
    stockBaseCode: row.stock_base_code ?? undefined,
    purchase: Number(row.purchase),
    sale: Number(row.sale),
    mrp: Number(row.mrp),
    baseCost: Number(row.base_cost),
    packingCost: Number(row.packing_cost),
    otherCharges: Number(row.other_charges),
    totalCost: Number(row.total_cost),
    stock: Number(row.stock),
    minimumStock: Number(row.minimum_stock),
    active: row.active,
  };
}

function validateProduct(input, { creating }) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("INVALID_PRODUCT", "Product data must be an object.");
  }

  if (Object.keys(input).some((field) => !PRODUCT_FIELDS.has(field))) {
    fail("INVALID_PRODUCT", "Product data contains an unsupported field.");
  }

  const requiredStrings = ["code", "name", "category", "hsn", "gst", "unit"];
  for (const field of requiredStrings) {
    if (typeof input[field] !== "string") {
      fail("INVALID_PRODUCT", `Product ${field} must be text.`);
    }
  }

  if (!input.code.trim()) fail("INVALID_PRODUCT", "Product code is required.");
  if (!input.name.trim()) fail("INVALID_PRODUCT", "Product name is required.");
  if (!input.hsn.trim()) fail("INVALID_PRODUCT", "HSN code is required.");
  if (!PRODUCT_UNITS.has(input.unit)) fail("INVALID_PRODUCT", "Product unit is invalid.");
  if (typeof input.gst !== "string") fail("INVALID_PRODUCT", "GST must be text.");
  if (typeof input.stockBaseCode !== "undefined"
    && input.stockBaseCode !== null
    && typeof input.stockBaseCode !== "string") {
    fail("INVALID_PRODUCT", "Stock base code must be text.");
  }
  if (input.unit === "Pkt" && !String(input.stockBaseCode ?? "").trim()) {
    fail("INVALID_PRODUCT", "Packet products require a stock base code.");
  }

  const numericFields = [
    "netWeight",
    "purchase",
    "sale",
    "mrp",
    "baseCost",
    "packingCost",
    "otherCharges",
    "minimumStock",
  ];
  if (creating) numericFields.push("stock");
  for (const field of numericFields) {
    if (typeof input[field] !== "number" || !Number.isFinite(input[field]) || input[field] < 0) {
      fail("INVALID_PRODUCT", `Product ${field} must be a finite, non-negative number.`);
    }
  }

  if (input.sale <= 0) fail("INVALID_PRODUCT", "Sale price must be greater than zero.");
  if (input.mrp < input.sale) fail("INVALID_PRODUCT", "MRP must not be less than sale price.");
  if (typeof input.active !== "boolean") fail("INVALID_PRODUCT", "Product active status must be boolean.");

  if (creating && (typeof input.id !== "string" || !input.id.trim())) {
    fail("INVALID_PRODUCT", "Product ID is required.");
  }
  if (creating && input.id.length > 200) fail("INVALID_PRODUCT", "Product ID is too long.");

  const baseCost = input.baseCost;
  const packingCost = input.packingCost;
  const otherCharges = input.otherCharges;
  return {
    id: creating ? input.id : undefined,
    code: input.code,
    name: input.name,
    category: input.category,
    hsn: input.hsn,
    gst: input.gst,
    unit: input.unit,
    netWeight: input.netWeight,
    stockBaseCode: input.stockBaseCode || null,
    purchase: input.purchase,
    sale: input.sale,
    mrp: input.mrp,
    baseCost,
    packingCost,
    otherCharges,
    totalCost: baseCost + packingCost + otherCharges,
    ...(creating ? { stock: input.stock } : {}),
    minimumStock: input.minimumStock,
    active: input.active,
  };
}

function validateProductId(id) {
  if (typeof id !== "string" || !id.trim() || id.length > 200) {
    fail("INVALID_PRODUCT_ID", "Product ID is invalid.");
  }
}

function mapDatabaseError(error) {
  if (error?.code === "23505") {
    fail("PRODUCT_CONFLICT", "A product with this ID or code already exists.");
  }
  throw error;
}

async function withTransaction(database, operation) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    mapDatabaseError(error);
  } finally {
    client.release();
  }
}

export function createProductDAL({ getOwnerContext, database, onProductCreate }) {
  if (typeof getOwnerContext !== "function" || typeof database?.connect !== "function") {
    throw new Error("Product DAL requires server authorization and a PostgreSQL pool.");
  }

  async function ownerCompanyId() {
    const owner = await getOwnerContext();
    const companyId = owner?.company?.company_id;
    if (!companyId) fail("UNAUTHENTICATED", "Sign in is required.");
    return companyId;
  }

  return {
    async listProducts() {
      const companyId = await ownerCompanyId();
      const result = await database.query(
        `SELECT ${PRODUCT_COLUMNS}
         FROM public.products
         WHERE company_id = $1
         ORDER BY NULLIF(to_jsonb(products)->>'created_at', '')::timestamptz DESC NULLS LAST, code DESC, id DESC`,
        [companyId],
      );
      return result.rows.map(mapProduct);
    },

    async getProduct(id) {
      validateProductId(id);
      const companyId = await ownerCompanyId();
      const result = await database.query(
        `SELECT ${PRODUCT_COLUMNS}
         FROM public.products
         WHERE company_id = $1 AND id = $2
         LIMIT 1`,
        [companyId, id],
      );
      return mapProduct(result.rows[0]);
    },

    async createProduct(input) {
      const product = validateProduct(input, { creating: true });
      const companyId = await ownerCompanyId();
      return withTransaction(database, async (client) => {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended('products:' || $1::text, 0))",
          [companyId],
        );
        const duplicate = await client.query(
          `SELECT 1 FROM public.products
           WHERE company_id = $1 AND code = $2
           LIMIT 1`,
          [companyId, product.code],
        );
        if (duplicate.rowCount > 0) {
          fail("PRODUCT_CODE_CONFLICT", "A product with this code already exists in this company.");
        }
        if (onProductCreate) await onProductCreate(product.id, companyId);

        const result = await client.query(
          `INSERT INTO public.products (
             id, company_id, code, name, category, hsn, gst, unit, net_weight,
             stock_base_code, purchase, sale, mrp, base_cost, packing_cost,
             other_charges, total_cost, stock, minimum_stock, active
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
           )
           RETURNING ${PRODUCT_COLUMNS}`,
          [
            product.id,
            companyId,
            product.code,
            product.name,
            product.category,
            product.hsn,
            product.gst,
            product.unit,
            product.netWeight,
            product.stockBaseCode,
            product.purchase,
            product.sale,
            product.mrp,
            product.baseCost,
            product.packingCost,
            product.otherCharges,
            product.totalCost,
            product.stock,
            product.minimumStock,
            product.active,
          ],
        );
        return mapProduct(result.rows[0]);
      });
    },

    async updateProduct(id, input) {
      validateProductId(id);
      const product = validateProduct(input, { creating: false });
      if (input.id !== id) fail("INVALID_PRODUCT", "Product ID cannot be changed.");
      const companyId = await ownerCompanyId();
      const current = await database.query(
        `SELECT code FROM public.products WHERE company_id = $1 AND id = $2 LIMIT 1`,
        [companyId, id],
      );
      if (current.rowCount === 0) return null;
      if (current.rows[0].code !== product.code) {
        fail("PRODUCT_CODE_IMMUTABLE", "Product code cannot be changed after creation.");
      }
      const result = await database.query(
        `UPDATE public.products
         SET name = $3,
             category = $4,
             hsn = $5,
             gst = $6,
             unit = $7,
             net_weight = $8,
             stock_base_code = $9,
             purchase = $10,
             sale = $11,
             mrp = $12,
             base_cost = $13,
             packing_cost = $14,
             other_charges = $15,
             total_cost = $16,
             minimum_stock = $17,
             active = $18
         WHERE company_id = $1 AND id = $2 AND code = $19
         RETURNING ${PRODUCT_COLUMNS}`,
        [
          companyId,
          id,
          product.name,
          product.category,
          product.hsn,
          product.gst,
          product.unit,
          product.netWeight,
          product.stockBaseCode,
          product.purchase,
          product.sale,
          product.mrp,
          product.baseCost,
          product.packingCost,
          product.otherCharges,
          product.totalCost,
          product.minimumStock,
          product.active,
          product.code,
        ],
      );
      return mapProduct(result.rows[0]);
    },

    async deactivateProduct(id) {
      validateProductId(id);
      const companyId = await ownerCompanyId();
      const result = await database.query(
        `UPDATE public.products
         SET active = false
         WHERE company_id = $1 AND id = $2
         RETURNING ${PRODUCT_COLUMNS}`,
        [companyId, id],
      );
      return mapProduct(result.rows[0]);
    },
  };
}
