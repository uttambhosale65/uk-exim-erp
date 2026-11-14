import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";

export function createAuthInstance({ database, secret, baseURL, allowSignUp = false, generateId = undefined }) {
  if (!database) throw new Error("Authentication database is not configured.");
  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 bytes.");
  }
  if (typeof baseURL !== "string" || !/^https?:\/\//.test(baseURL)) {
    throw new Error("BETTER_AUTH_URL must be an explicit HTTP or HTTPS origin.");
  }

  const secureCookies = baseURL.startsWith("https://");

  return betterAuth({
    appName: "UK EXIM ENTERPRISES",
    baseURL,
    secret,
    database,
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignUp,
      autoSignIn: false,
      requireEmailVerification: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    disabledPaths: [
      ...(allowSignUp ? [] : ["/sign-up/email"]),
      "/sign-in/email",
      "/is-username-available",
    ],
    plugins: [
      username({
        minUsernameLength: 4,
        maxUsernameLength: 50,
        immutableUsername: true,
        displayUsername: false,
      }),
    ],
    session: {
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 60,
      freshAge: 60 * 5,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 10,
      max: 100,
      customRules: {
        "/sign-in/username": { window: 60, max: 5 },
      },
    },
    advanced: {
      ...(generateId ? { database: { generateId } } : {}),
      useSecureCookies: secureCookies,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookies,
      },
    },
    logger: { disabled: true },
  });
}
