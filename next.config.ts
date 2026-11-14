import type { NextConfig } from "next";

const disposableE2E = process.env.NODE_ENV === "development" && process.env.UKEXIM_E2E_DISPOSABLE_MODE === "1";
const e2eRunId = process.env.UKEXIM_E2E_RUN_ID ?? "";
const isolatedAuthBuild = process.env.NODE_ENV === "production" && process.env.UKEXIM_AUTH_CHECK_BUILD === "1";
const authBuildId = process.env.UKEXIM_AUTH_CHECK_BUILD_ID ?? "";
if (disposableE2E && !/^\d{14}_[a-f0-9]{8}$/.test(e2eRunId)) {
  throw new Error("Disposable E2E mode requires the run ID from the verified TEST manifest.");
}
if (isolatedAuthBuild && !/^\d{14}_[a-f0-9]{8}$/.test(authBuildId)) {
  throw new Error("Isolated auth verification build requires a unique run ID.");
}

const nextConfig: NextConfig = {
  // Give each explicit TEST app its own Next.js lock/cache directory. Next.js
  // owns distDir contents, so a disposable E2E process must never share output
  // with the earlier Products UI TEST server or normal DEV server.
  distDir: disposableE2E
    ? `.next-e2e-disposable-${e2eRunId}`
    : isolatedAuthBuild
      ? `.next-auth-check-${authBuildId}`
    : process.env.NODE_ENV === "development" && process.env.UKEXIM_PRODUCTS_UI_TEST_MODE === "1"
      ? ".next-products-ui-test"
      : ".next",
  // Prevent development request logs from recording sensitive URL query values.
  logging: { incomingRequests: false },
};

export default nextConfig;
