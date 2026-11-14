import pgConnectionString from "pg-connection-string";

const verifiedPools = new WeakMap();
const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

/** Parse a PostgreSQL URL whose effective driver target must be local and exact. */
export function parseLocalPostgresUrl(connectionString, expectedDatabase, label = "Database URL") {
  if (typeof connectionString !== "string" || !connectionString || connectionString !== connectionString.trim()) {
    throw new Error(`${label} is missing or malformed.`);
  }

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(`${label} is malformed.`);
  }

  // pg-connection-string accepts libpq-style query options such as host, hostaddr,
  // port, dbname and options. Reject all query/fragment forms before parsing so
  // the effective driver destination cannot differ from the visible URL target.
  if (connectionString.includes("?") || connectionString.includes("#") || url.search || url.hash) {
    throw new Error(`${label} must not contain query parameters or fragments.`);
  }

  if (!POSTGRES_PROTOCOLS.has(url.protocol)
    || url.hostname !== "127.0.0.1"
    || url.port !== "5432"
    || url.pathname !== `/${expectedDatabase}`) {
    throw new Error(`${label} must target exactly 127.0.0.1:5432/${expectedDatabase}.`);
  }

  let effective;
  try {
    effective = pgConnectionString.parseIntoClientConfig(url.toString());
  } catch {
    throw new Error(`${label} has unsupported PostgreSQL connection settings.`);
  }
  if (effective.host !== "127.0.0.1"
    || Number(effective.port) !== 5432
    || effective.database !== expectedDatabase
    || (effective.hostaddr !== undefined && effective.hostaddr !== "127.0.0.1")) {
    throw new Error(`${label} effective target must be exactly 127.0.0.1:5432/${expectedDatabase}.`);
  }

  return url;
}

export async function verifyLocalPostgresConnection(client, expectedDatabase) {
  const result = await client.query(
    `SELECT current_database() AS database,
            host(inet_server_addr()) AS address,
            inet_server_port() AS port,
            current_setting('server_version') AS version`,
  );
  const identity = result.rows[0];
  if (identity?.database !== expectedDatabase
    || identity?.address !== "127.0.0.1"
    || Number(identity?.port) !== 5432) {
    throw new Error(`Connected PostgreSQL identity must be exactly 127.0.0.1:5432/${expectedDatabase}.`);
  }
  return {
    database: identity.database,
    address: identity.address,
    port: Number(identity.port),
    version: identity.version,
  };
}

/** Verify a pool's actual server once before protected operations use it. */
export function verifyLocalPostgresPool(pool, expectedDatabase) {
  if (!pool || typeof pool.connect !== "function") {
    return Promise.reject(new TypeError("A PostgreSQL pool is required."));
  }
  const cached = verifiedPools.get(pool);
  if (cached) return cached;

  const verification = (async () => {
    const client = await pool.connect();
    try {
      return await verifyLocalPostgresConnection(client, expectedDatabase);
    } finally {
      client.release();
    }
  })();
  verifiedPools.set(pool, verification);
  verification.catch(() => verifiedPools.delete(pool));
  return verification;
}
