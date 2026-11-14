import "../db/env.mjs";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";
import { Client, Pool } from "pg";
import { createAuthInstance } from "../../app/lib/auth/factory.mjs";
import {
  getProvisioningCompany,
  parseOwnerProvisioningDatabaseUrl,
  verifyOwnerProvisioningDatabaseConnection,
} from "./provisioning-guard.mjs";

const url = parseOwnerProvisioningDatabaseUrl(process.env.DATABASE_URL);
if (process.env.NODE_ENV === "production") {
  throw new Error("Owner provisioning is disabled in production.");
}
if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
  throw new Error("Owner provisioning requires an interactive local terminal.");
}
if (!process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_SECRET and BETTER_AUTH_URL must be configured locally.");
}

function ask(label) {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  return readline.question(label).then((answer) => {
    readline.close();
    return answer.trim();
  });
}

function askMasked(label) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    let value = "";
    let finished = false;
    const previousRawMode = input.isRaw;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      input.off("data", onData);
      input.setRawMode(Boolean(previousRawMode));
      input.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const character of String(chunk)) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Provisioning cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (character === "\u0008" || character === "\u007f") {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (character >= " ") {
          value += character;
          process.stdout.write("•");
        }
      }
    };
    emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
    process.stdout.write(label);
  });
}

async function main() {
  const client = new Client({ connectionString: url.toString() });
  const authPool = new Pool({
    connectionString: url.toString(),
    options: "-c search_path=auth,public",
    max: 2,
  });
  let createdUserId;
  let lockAcquired = false;

  try {
    await client.connect();
    await verifyOwnerProvisioningDatabaseConnection(client);
    const lock = await client.query("SELECT pg_try_advisory_lock(571015520, 271828) AS acquired");
    lockAcquired = lock.rows[0].acquired;
    if (!lockAcquired) throw new Error("Another owner provisioning operation is already running.");

    const companyId = await getProvisioningCompany(client);
    const name = await ask("Owner name: ");
    const email = await ask("Owner email: ");
    const username = await ask("Login ID: ");
    if (!name || !email || !/^[A-Za-z0-9_.]{4,50}$/.test(username)) {
      throw new Error("Name, email, or Login ID is invalid.");
    }
    const password = await askMasked("Password (hidden): ");
    const confirmation = await askMasked("Confirm password (hidden): ");
    if (password.length < 12 || password.length > 128 || password !== confirmation) {
      throw new Error("Passwords must match and contain 12 to 128 characters.");
    }

    const secret = process.env.BETTER_AUTH_SECRET;
    const baseURL = process.env.BETTER_AUTH_URL;
    const provisioningAuth = createAuthInstance({
      database: authPool,
      secret,
      baseURL,
      allowSignUp: true,
    });
    const result = await provisioningAuth.api.signUpEmail({
      body: { name, email, username, password },
    });
    createdUserId = result.user.id;

    try {
      await client.query("BEGIN");
      const membership = await client.query(
        `INSERT INTO auth.company_memberships (company_id, user_id, role)
         SELECT $1, $2, 'owner'
         WHERE EXISTS (
           SELECT 1 FROM public.companies WHERE id = $1 AND name = $3
         )
         RETURNING user_id`,
        [companyId, createdUserId, "UK EXIM ENTERPRISES"],
      );
      if (membership.rowCount !== 1) throw new Error("Company ownership relationship could not be created.");
      await client.query("COMMIT");
    } catch {
      await client.query("ROLLBACK").catch(() => {});
      await client.query("BEGIN");
      await client.query('DELETE FROM auth."session" WHERE "userId" = $1', [createdUserId]);
      await client.query('DELETE FROM auth."account" WHERE "userId" = $1', [createdUserId]);
      await client.query('DELETE FROM auth."user" WHERE id = $1', [createdUserId]);
      await client.query("COMMIT");
      createdUserId = undefined;
      throw new Error("Provisioning did not finish; the newly created account was rolled back.");
    }

    console.log("Owner account provisioned for UK EXIM ENTERPRISES.");
  } catch (error) {
    if (createdUserId) {
      await client.query("BEGIN").catch(() => {});
      await client.query('DELETE FROM auth."session" WHERE "userId" = $1', [createdUserId]).catch(() => {});
      await client.query('DELETE FROM auth."account" WHERE "userId" = $1', [createdUserId]).catch(() => {});
      await client.query('DELETE FROM auth."user" WHERE id = $1', [createdUserId]).catch(() => {});
      await client.query("COMMIT").catch(() => {});
    }
    process.stderr.write((error instanceof Error ? error.message : "Owner provisioning failed.") + "\n");
    process.exitCode = 1;
  } finally {
    if (lockAcquired) await client.query("SELECT pg_advisory_unlock(571015520, 271828)").catch(() => {});
    await client.end().catch(() => {});
    await authPool.end().catch(() => {});
  }
}

await main();
