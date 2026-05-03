import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "../packages/db-schema/src/index.ts",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: "replace-with-account-id",
    databaseId: "replace-with-d1-id",
    token: "replace-with-api-token"
  }
});
