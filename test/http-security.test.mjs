import test from "node:test";
import assert from "node:assert/strict";
import { InvalidTokenLimiter, requireSameOrigin, tokenMatches } from "../src/server/http/security.mjs";

function request(headers = {}, remoteAddress = "192.0.2.1") {
  return { headers, socket: { remoteAddress, encrypted: false } };
}

test("bearer tokens require a constant-length exact match", () => {
  const token = "a".repeat(43);
  assert.equal(tokenMatches(request({ authorization: `Bearer ${token}` }), token), true);
  assert.equal(tokenMatches(request({ authorization: `Bearer ${"b".repeat(43)}` }), token), false);
  assert.equal(tokenMatches(request({ authorization: "Bearer short" }), token), false);
  assert.equal(tokenMatches(request(), token), false);
});

test("invalid-token limiter separates callers and resets its window", () => {
  const limiter = new InvalidTokenLimiter({ limit: 2, windowMs: 100 });
  const first = request({}, "192.0.2.10");
  const second = request({}, "192.0.2.11");
  assert.equal(limiter.allow(first, 0), true);
  assert.equal(limiter.allow(first, 1), true);
  assert.equal(limiter.allow(first, 2), false);
  assert.equal(limiter.allow(second, 2), true);
  assert.equal(limiter.allow(first, 101), true);
});

test("same-origin checks support direct and reverse-proxied requests", () => {
  assert.equal(requireSameOrigin(request()), true);
  assert.equal(requireSameOrigin(request({ origin: "http://chat.test", host: "chat.test" })), true);
  assert.equal(requireSameOrigin(request({
    origin: "https://chat.example.com",
    host: "127.0.0.1:8080",
    "x-forwarded-host": "chat.example.com",
    "x-forwarded-proto": "https",
  })), true);
  assert.equal(requireSameOrigin(request({ origin: "https://evil.example", host: "chat.test" })), false);
});
