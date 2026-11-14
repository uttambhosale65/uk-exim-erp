import "server-only";

export async function requireTradeSchema(database) {
  const { rows } = await database.query(
    "SELECT 1 FROM public._schema_migrations WHERE name = $1 LIMIT 1",
    ["008_verified_stock_baseline_gate.sql"],
  );
  if (rows.length !== 1) {
    throw Object.assign(
      new Error("Purchase, Sales, and Stock are not enabled yet: required local schema migrations are pending."),
      { code: "SCHEMA_PENDING" },
    );
  }
}
