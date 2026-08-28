import test from "node:test";
import assert from "node:assert/strict";
import { createHttpApp } from "../src/server/http-app.mjs";

test("Fastify health endpoint reflects service readiness", async () => {
  let ready = false;
  const app = createHttpApp({
    health: () => ready,
    legacyHandler: () => assert.fail("health route reached compatibility handler"),
  });

  const starting = await app.inject({ method: "GET", url: "/healthz" });
  assert.equal(starting.statusCode, 503);
  assert.deepEqual(starting.json(), { ok: false });

  ready = true;
  const healthy = await app.inject({ method: "GET", url: "/healthz" });
  assert.equal(healthy.statusCode, 200);
  assert.deepEqual(healthy.json(), { ok: true });

  await app.close();
});

test("compatibility handler receives raw headers and request bodies", async () => {
  const app = createHttpApp({
    health: () => true,
    legacyHandler: async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      res.writeHead(201, { "content-type": "application/json" });
      res.end(JSON.stringify({
        authorization: req.headers.authorization,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    },
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/legacy",
    headers: { authorization: "Bearer example", "content-type": "application/json" },
    payload: JSON.stringify({ message: "hello" }),
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
    authorization: "Bearer example",
    body: JSON.stringify({ message: "hello" }),
  });

  await app.close();
});
