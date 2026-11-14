import "server-only";

const headers = { "Cache-Control": "no-store, private" };
function json(data, status = 200) { return Response.json(data, { status, headers }); }
function statusFor(error) {
  return ({ UNAUTHENTICATED: 401, INVALID_SETTINGS: 400, SCHEMA_PENDING: 503 })[error?.code];
}
function errorResponse(error) {
  const status = statusFor(error);
  return status ? json({ error: error.message }, status) : json({ error: "Settings request could not be completed." }, 500);
}
function sameOrigin(request) {
  try {
    const origin = request.headers.get("origin");
    return Boolean(origin) && new URL(origin).origin === new URL(request.url).origin;
  } catch { return false; }
}
async function readBody(request) {
  try { return await request.json(); }
  catch { throw Object.assign(new Error("Request body must be valid JSON."), { code: "INVALID_SETTINGS" }); }
}

export function createSettingsRouteHandlers(dal) {
  return {
    async list() {
      try { return json({ settings: await dal.list() }); }
      catch (error) { return errorResponse(error); }
    },
    async get(_request, key) {
      try {
        const setting = await dal.get(key);
        return setting ? json({ setting }) : json({ error: "Settings category is not initialized." }, 404);
      } catch (error) { return errorResponse(error); }
    },
    async save(request, key) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin writes are not allowed." }, 403);
      try { return json({ setting: await dal.save(key, await readBody(request)) }); }
      catch (error) { return errorResponse(error); }
    },
  };
}
