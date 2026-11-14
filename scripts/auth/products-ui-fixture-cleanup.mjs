import { verifyProductsUiTestDatabase } from "../../app/lib/db/products-ui-test.mjs";
import { validateProductsUiFixtureManifest } from "../../app/product/server/products-ui-test-manifest.mjs";

function sameIds(actual, expected, label) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  if (actualSet.size !== actual.length || expectedSet.size !== expected.length
    || actualSet.size !== expectedSet.size || [...actualSet].some((id) => !expectedSet.has(id))) {
    throw new Error(`Fixture ${label} identifiers do not exactly match the manifest; cleanup refused.`);
  }
}

export async function captureProductsUiFixtureArtifactIds(client, manifest) {
  const checked = validateProductsUiFixtureManifest(manifest);
  await verifyProductsUiTestDatabase(client);
  const [accounts, sessions, verifications] = await Promise.all([
    client.query('/* fixture:accounts */ SELECT id FROM auth."account" WHERE "userId" = $1 ORDER BY id', [checked.userId]),
    client.query('/* fixture:sessions */ SELECT id FROM auth."session" WHERE "userId" = $1 ORDER BY id', [checked.userId]),
    client.query('/* fixture:verifications */ SELECT id FROM auth."verification" WHERE identifier = ANY($1::text[]) ORDER BY id', [[checked.userEmail, checked.userId]]),
  ]);
  return {
    accountIds: accounts.rows.map((row) => row.id),
    sessionIds: sessions.rows.map((row) => row.id),
    verificationIds: verifications.rows.map((row) => row.id),
    // Better Auth rate-limit rows are shared IP/path buckets, not user-owned fixture records.
    rateLimitIds: [],
  };
}

export async function cleanupProductsUiFixture(client, manifest, { allowIncomplete = false } = {}) {
  const checked = validateProductsUiFixtureManifest(manifest);
  await verifyProductsUiTestDatabase(client);
  await client.query("BEGIN");
  try {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('products:' || $1::text, 0))",
      [checked.companyId],
    );

    const [companies, users, memberships, accounts, sessions, verifications, products, rateLimits, unattributedRateLimits] = await Promise.all([
      client.query("/* fixture:company */ SELECT id, name FROM public.companies WHERE id = $1", [checked.companyId]),
      client.query('/* fixture:user */ SELECT id, name, email, username FROM auth."user" WHERE id = $1 FOR UPDATE', [checked.userId]),
      client.query("/* fixture:membership */ SELECT company_id::text, role FROM auth.company_memberships WHERE user_id = $1", [checked.userId]),
      client.query('/* fixture:accounts */ SELECT id, "userId" FROM auth."account" WHERE "userId" = $1 ORDER BY id', [checked.userId]),
      client.query('/* fixture:sessions */ SELECT id, "userId" FROM auth."session" WHERE "userId" = $1 OR id = ANY($2::text[]) ORDER BY id', [checked.userId, checked.sessionIds]),
      client.query('/* fixture:verifications */ SELECT id, identifier FROM auth."verification" WHERE identifier = ANY($1::text[]) ORDER BY id', [[checked.userEmail, checked.userId]]),
      client.query("/* fixture:products */ SELECT id, company_id::text FROM public.products WHERE company_id = $1 OR id = ANY($2::text[])", [checked.companyId, checked.productIds]),
      client.query('/* fixture:ratelimits */ SELECT id FROM auth."rateLimit" WHERE id = ANY($1::text[]) ORDER BY id', [checked.rateLimitIds]),
      client.query('/* fixture:unattributed-ratelimits */ SELECT count(*)::int AS count FROM auth."rateLimit" WHERE id <> ALL($1::text[])', [checked.rateLimitIds]),
    ]);

    const alreadyAbsent = companies.rows.length === 0 && users.rows.length === 0
      && memberships.rows.length === 0 && accounts.rows.length === 0 && sessions.rows.length === 0
      && verifications.rows.length === 0 && products.rows.length === 0 && rateLimits.rows.length === 0;
    if (alreadyAbsent) {
      await client.query("COMMIT");
      return { alreadyAbsent: true, preservedUnattributedRateLimitCount: unattributedRateLimits.rows[0].count };
    }
    if (checked.status === "ready" && !allowIncomplete && !alreadyAbsent
      && (companies.rows.length !== 1 || users.rows.length !== 1 || memberships.rows.length !== 1)) {
      throw new Error("Ready fixture core records are incomplete; cleanup refused.");
    }
    if (companies.rows.some((row) => row.name !== checked.companyName)
      || users.rows.some((row) => row.id !== checked.userId || row.name !== "Synthetic Products UI Owner"
        || row.email !== checked.userEmail || row.username !== checked.username)
      || memberships.rows.some((row) => row.company_id !== checked.companyId || row.role !== "owner")) {
      throw new Error("Fixture identity or membership differs from the manifest; cleanup refused.");
    }

    sameIds(accounts.rows.map((row) => row.id), checked.accountIds, "account");
    if (sessions.rows.some((row) => row.userId !== checked.userId)) {
      throw new Error("A manifest-listed session belongs to a different user; cleanup refused.");
    }
    const ownedSessionIds = sessions.rows.map((row) => row.id);
    sameIds(verifications.rows.map((row) => row.id), checked.verificationIds, "verification");
    if (products.rows.some((row) => row.company_id !== checked.companyId || !checked.productIds.includes(row.id))) {
      throw new Error("A fixture company or product has an unrecorded ID; cleanup refused.");
    }

    await client.query("DELETE FROM public.products WHERE company_id = $1 AND id = ANY($2::text[])", [checked.companyId, checked.productIds]);
    if (ownedSessionIds.length) {
      await client.query('DELETE FROM auth."session" WHERE "userId" = $1 AND id = ANY($2::text[])', [checked.userId, ownedSessionIds]);
    }
    await client.query('DELETE FROM auth."verification" WHERE id = ANY($1::text[])', [checked.verificationIds]);
    if (checked.rateLimitIds.length) {
      await client.query('DELETE FROM auth."rateLimit" WHERE id = ANY($1::text[])', [checked.rateLimitIds]);
    }
    await client.query("DELETE FROM auth.company_memberships WHERE company_id = $1 AND user_id = $2 AND role = 'owner'", [checked.companyId, checked.userId]);
    await client.query('DELETE FROM auth."user" WHERE id = $1', [checked.userId]);
    await client.query("DELETE FROM public.companies WHERE id = $1 AND name = $2", [checked.companyId, checked.companyName]);

    const [remainingCompany, remainingUser, remainingMembership, remainingAccount, remainingSession,
      remainingVerification, remainingProducts, remainingRateLimits] = await Promise.all([
      client.query("/* verify:company */ SELECT id FROM public.companies WHERE id = $1", [checked.companyId]),
      client.query('/* verify:user */ SELECT id FROM auth."user" WHERE id = $1', [checked.userId]),
      client.query("/* verify:membership */ SELECT user_id FROM auth.company_memberships WHERE user_id = $1", [checked.userId]),
      client.query('/* verify:accounts */ SELECT id FROM auth."account" WHERE "userId" = $1 OR id = ANY($2::text[])', [checked.userId, checked.accountIds]),
      client.query('/* verify:sessions */ SELECT id FROM auth."session" WHERE "userId" = $1 OR id = ANY($2::text[])', [checked.userId, checked.sessionIds]),
      client.query('/* verify:verifications */ SELECT id FROM auth."verification" WHERE identifier = ANY($1::text[]) OR id = ANY($2::text[])', [[checked.userEmail, checked.userId], checked.verificationIds]),
      client.query("/* verify:products */ SELECT id FROM public.products WHERE id = ANY($1::text[])", [checked.productIds]),
      client.query('/* verify:ratelimits */ SELECT id FROM auth."rateLimit" WHERE id = ANY($1::text[])', [checked.rateLimitIds]),
    ]);
    if ([remainingCompany, remainingUser, remainingMembership, remainingAccount, remainingSession,
      remainingVerification, remainingProducts, remainingRateLimits].some((result) => result.rows.length !== 0)) {
      throw new Error("Fixture cleanup verification failed; manifest must be retained.");
    }
    await client.query("COMMIT");
    return { alreadyAbsent, preservedUnattributedRateLimitCount: unattributedRateLimits.rows[0].count };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

export async function cleanupFailedProductsUiFixture(pool, manifest, removeManifest) {
  const client = await pool.connect();
  try {
    await cleanupProductsUiFixture(client, manifest, { allowIncomplete: true });
    await removeManifest();
  } finally {
    client.release();
  }
}
