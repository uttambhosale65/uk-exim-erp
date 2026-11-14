import "server-only";

const headers = { "Cache-Control": "no-store, private" };
const json = (body, status = 200) => Response.json(body, { status, headers });
function errorResponse(error) {
  const known = {
    UNAUTHENTICATED: [401, "Owner sign-in is required."],
    INVALID_TAX_CONFIGURATION: [400, "Tax configuration is invalid."],
    TAX_CONFIGURATION_INCOMPLETE: [400, "Required tax evidence and review are incomplete."],
    SCHEMA_PENDING: [503, "Tax configuration storage is unavailable until migration 014 is applied."],
  }[error?.code];
  return known ? json({ error: known[1] }, known[0]) : json({ error: "Tax configuration request could not be completed." }, 500);
}
function sameOrigin(request) {
  try { return Boolean(request.headers.get("origin")) && new URL(request.headers.get("origin")).origin === new URL(request.url).origin; }
  catch { return false; }
}
async function readBody(request) {
  try { return await request.json(); }
  catch { throw Object.assign(new Error("Request body must be valid JSON."), { code: "INVALID_TAX_CONFIGURATION" }); }
}

export function createTaxConfigurationRouteHandlers(dal) {
  return {
    async get() {
      try { return json({ taxConfiguration: await dal.get() }); }
      catch (error) { return errorResponse(error); }
    },
    async save(request) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin writes are not allowed." }, 403);
      try { return json({ taxConfiguration: await dal.save(await readBody(request)) }); }
      catch (error) { return errorResponse(error); }
    },
  };
}
