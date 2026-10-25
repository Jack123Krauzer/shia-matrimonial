import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma generation/diff use the SQLite schema. Hosted setup uses db:setup.
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});
