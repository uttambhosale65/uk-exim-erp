import "server-only";
import { isTaxConfigurationApproved } from "../india-gst-engine.mjs";

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const MAX_BYTES = 96 * 1024;

function validateDraft(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("INVALID_TAX_CONFIGURATION", "Tax configuration must be a JSON object.");
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > MAX_BYTES) fail("INVALID_TAX_CONFIGURATION", "Tax configuration exceeds the allowed size.");
  const scan = (item) => {
    if (Array.isArray(item)) return item.forEach(scan);
    if (item && typeof item === "object") {
      for (const [key, nested] of Object.entries(item)) {
        if (key.toLowerCase() === "company_id") fail("INVALID_TAX_CONFIGURATION", "Company scope cannot be supplied in tax configuration.");
        scan(nested);
      }
    }
  };
  scan(value);
  if (value.version !== 1 || !value.seller || !Array.isArray(value.productClassifications) || !value.export || !value.approval) {
    fail("INVALID_TAX_CONFIGURATION", "Tax configuration fields are incomplete or unsupported.");
  }
  if (value.productClassifications.length > 1000) fail("INVALID_TAX_CONFIGURATION", "Too many product classifications were supplied.");
  return value;
}

export function createTaxConfigurationDAL({ getOwnerContext, database, clock = () => new Date() }) {
  if (typeof getOwnerContext !== "function" || !database?.query || !database?.connect) {
    throw new Error("Tax configuration DAL requires owner authorization and PostgreSQL.");
  }

  async function ownerScope() {
    const owner = await getOwnerContext();
    if (!owner?.company?.company_id || !owner?.session?.user?.id) fail("UNAUTHENTICATED", "Owner sign-in is required.");
    return { companyId: owner.company.company_id, ownerId: owner.session.user.id };
  }

  async function ensureSchema() {
    try { await database.query("SELECT 1 FROM public.company_tax_configurations LIMIT 0"); }
    catch { fail("SCHEMA_PENDING", "Tax configuration storage is unavailable until migration 014 is applied."); }
  }

  return {
    async get() {
      const { companyId } = await ownerScope();
      await ensureSchema();
      const { rows } = await database.query(
        `SELECT configuration,approval_status,revision,approved_at,updated_at
         FROM public.company_tax_configurations WHERE company_id=$1`, [companyId],
      );
      const row = rows[0];
      return row ? {
        configuration: row.configuration,
        approvalStatus: row.approval_status,
        revision: row.revision,
        approvedAt: row.approved_at,
        updatedAt: row.updated_at,
      } : null;
    },

    async save(input) {
      const { companyId, ownerId } = await ownerScope();
      await ensureSchema();
      const configuration = validateDraft(input);
      const approved = isTaxConfigurationApproved(configuration);
      if (configuration.approval.status === "approved" && !approved) {
        fail("TAX_CONFIGURATION_INCOMPLETE", "Domestic approval requires verified seller registration, at least one effective product classification, owner attestation, and accountant review.");
      }
      const approvalStatus = approved ? "approved" : "draft";
      const savedConfiguration = {
        ...configuration,
        approval: {
          ...configuration.approval,
          status: approvalStatus,
          approvedAt: approved ? clock().toISOString() : null,
          approvedBy: approved ? ownerId : null,
        },
      };
      const client = await database.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query(
          `INSERT INTO public.company_tax_configurations(company_id,configuration,approval_status,approved_at,approved_by)
           VALUES($1,$2::jsonb,$3,$4,$5)
           ON CONFLICT(company_id) DO UPDATE SET
             configuration=EXCLUDED.configuration,
             approval_status=EXCLUDED.approval_status,
             approved_at=EXCLUDED.approved_at,
             approved_by=EXCLUDED.approved_by,
             revision=public.company_tax_configurations.revision+1,
             updated_at=now()
           RETURNING configuration,approval_status,revision,approved_at,updated_at`,
          [companyId, JSON.stringify(savedConfiguration), approvalStatus, savedConfiguration.approval.approvedAt, savedConfiguration.approval.approvedBy],
        );
        await client.query("COMMIT");
        const row = rows[0];
        return { configuration: row.configuration, approvalStatus: row.approval_status, revision: row.revision, approvedAt: row.approved_at, updatedAt: row.updated_at };
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        if (error?.code === "42P01" || error?.code === "42703") fail("SCHEMA_PENDING", "Tax configuration storage is unavailable until migration 014 is applied.");
        throw error;
      } finally { client.release(); }
    },
  };
}

export { validateDraft as validateTaxConfigurationDraft };
