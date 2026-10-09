import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { createDatabaseAdapter } from "./adapter";

const DATABASE_URL = "postgresql://user:password@localhost:5432/fasterfixes";

test("production defaults to standard PostgreSQL", () => {
  assert.ok(
    createDatabaseAdapter({ DATABASE_URL, NODE_ENV: "production" }) instanceof
      PrismaPg,
  );
});

test("Neon is explicitly selectable in any environment", () => {
  assert.ok(
    createDatabaseAdapter({
      DATABASE_URL,
      DATABASE_PROVIDER: "neon",
    }) instanceof PrismaNeon,
  );
});

test("builds can instantiate the adapter without a database connection", () => {
  assert.ok(createDatabaseAdapter({}) instanceof PrismaPg);
});

test("invalid provider fails clearly", () => {
  assert.throws(
    () => createDatabaseAdapter({ DATABASE_URL, DATABASE_PROVIDER: "unknown" }),
    /Unsupported database provider/,
  );
});
