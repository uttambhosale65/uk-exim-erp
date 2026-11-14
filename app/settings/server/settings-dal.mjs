import "server-only";

const ALLOWED_KEYS = new Set(["company", "invoice", "bank", "international"]);
const MAX_PAYLOAD_BYTES = 32 * 1024;

export class SettingsRequestError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SettingsRequestError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new SettingsRequestError(code, message);
}

function validatePayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_SETTINGS", "Settings must be a JSON object.");
  }
  if (Object.keys(value).some((key) => key.toLowerCase() === "company_id")) {
    fail("INVALID_SETTINGS", "Company scope cannot be supplied in settings data.");
  }
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    fail("INVALID_SETTINGS", "Settings data is not valid JSON.");
  }
  if (Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES) {
    fail("INVALID_SETTINGS", "Settings data exceeds the allowed size.");
  }
  return value;
}

export function createSettingsDAL({ getOwnerContext, database }) {
  if (typeof getOwnerContext !== "function" || !database?.query || !database?.connect) {
    throw new Error("Settings DAL requires owner authorization and a PostgreSQL pool.");
  }

  async function companyId() {
    const context = await getOwnerContext();
    if (!context?.company?.company_id) fail("UNAUTHENTICATED", "Sign in is required.");
    return context.company.company_id;
  }

  async function ensureSchema() {
    try {
      await database.query("SELECT 1 FROM public.company_settings LIMIT 0");
    } catch {
      fail("SCHEMA_PENDING", "Company settings storage is not available until its database migration is applied.");
    }
  }

  return {
    async list() {
      const id = await companyId();
      await ensureSchema();
      const { rows } = await database.query(
        "SELECT setting_key,payload,revision,updated_at FROM public.company_settings WHERE company_id=$1 ORDER BY setting_key",
        [id],
      );
      return rows.map((row) => ({
        key: row.setting_key,
        value: row.payload,
        revision: row.revision,
        updatedAt: row.updated_at,
      }));
    },

    async get(key) {
      if (!ALLOWED_KEYS.has(key)) fail("INVALID_SETTINGS", "Settings category is invalid.");
      const id = await companyId();
      await ensureSchema();
      const { rows } = await database.query(
        "SELECT setting_key,payload,revision,updated_at FROM public.company_settings WHERE company_id=$1 AND setting_key=$2",
        [id, key],
      );
      const row = rows[0];
      return row ? { key: row.setting_key, value: row.payload, revision: row.revision, updatedAt: row.updated_at } : null;
    },

    async save(key, input) {
      if (!ALLOWED_KEYS.has(key)) fail("INVALID_SETTINGS", "Settings category is invalid.");
      const value = validatePayload(input);
      const id = await companyId();
      await ensureSchema();
      const client = await database.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query(
          `INSERT INTO public.company_settings(company_id,setting_key,payload,source_record)
           VALUES($1,$2,$3::jsonb,$3::jsonb)
           ON CONFLICT(company_id,setting_key) DO UPDATE SET
             payload=EXCLUDED.payload,
             source_record=EXCLUDED.source_record,
             revision=public.company_settings.revision+1,
             updated_at=now()
           RETURNING setting_key,payload,revision,updated_at`,
          [id, key, JSON.stringify(value)],
        );
        await client.query("COMMIT");
        const row = rows[0];
        return { key: row.setting_key, value: row.payload, revision: row.revision, updatedAt: row.updated_at };
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
