import "server-only";

import { settingsHandlers as handlers } from "@/app/settings/server/settings-api-runtime";

export const dynamic = "force-dynamic";
export const GET = handlers.list;
