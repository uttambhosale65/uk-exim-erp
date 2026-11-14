export type LocalPostgresIdentity = {
  database: string;
  address: "127.0.0.1";
  port: 5432;
  version: string;
};

export function parseLocalPostgresUrl(
  connectionString: string | undefined,
  expectedDatabase: string,
  label?: string,
): URL;

export function verifyLocalPostgresConnection(
  client: { query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }> },
  expectedDatabase: string,
): Promise<LocalPostgresIdentity>;

export function verifyLocalPostgresPool(
  pool: { connect: () => Promise<{ query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>; release: () => void }> },
  expectedDatabase: string,
): Promise<LocalPostgresIdentity>;
