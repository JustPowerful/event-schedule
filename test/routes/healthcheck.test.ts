import { test } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper.js";
import { db } from "../../src/db/index.js";

test("healthcheck reports healthy database state", async (t) => {
  const app = await build(t);

  t.mock.method(
    db as unknown as { execute: typeof db.execute },
    "execute",
    async () => {
      return { rows: [{ result: 1 }] } as unknown;
    }
  );

  const res = await app.inject({
    url: "/healthcheck",
  });

  t.mock.reset();

  assert.strictEqual(res.statusCode, 200);
  const payload = JSON.parse(res.payload);
  assert.strictEqual(payload.success, true);
  assert.strictEqual(payload.api.status, "up");
  assert.strictEqual(payload.database.status, "up");
  assert.ok(typeof payload.database.latencyMs === "number");
  assert.ok(payload.timestamp);
});

test("healthcheck reports unhealthy database state when query fails", async (t) => {
  const app = await build(t);

  t.mock.method(
    db as unknown as { execute: typeof db.execute },
    "execute",
    async () => {
      throw new Error("connection failed");
    }
  );

  const res = await app.inject({
    url: "/healthcheck",
  });

  t.mock.reset();

  assert.strictEqual(res.statusCode, 503);
  const payload = JSON.parse(res.payload);
  assert.strictEqual(payload.success, false);
  assert.strictEqual(payload.api.status, "up");
  assert.strictEqual(payload.database.status, "down");
  assert.ok(payload.database.error);
  assert.ok(payload.timestamp);
});
