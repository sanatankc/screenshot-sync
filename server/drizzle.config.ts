import { defineConfig } from "drizzle-kit";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "replace-with-account-id";
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID ?? "replace-with-d1-id";
const token = process.env.CLOUDFLARE_API_TOKEN ?? "replace-with-api-token";

export default defineConfig({
  out: "./drizzle",
  schema: "../packages/db-schema/src/index.ts",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId,
    databaseId,
    token,
  },
});
