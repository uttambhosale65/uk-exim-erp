import "server-only";

import { createAuthInstance } from "./auth/factory.mjs";
import { getAuthDatabasePool } from "./db/pool";

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL;

if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
  throw new Error("BETTER_AUTH_SECRET must be configured with at least 32 bytes.");
}
if (!baseURL) throw new Error("BETTER_AUTH_URL must be configured explicitly.");

export const auth = createAuthInstance({
  database: getAuthDatabasePool(),
  secret,
  baseURL,
});
