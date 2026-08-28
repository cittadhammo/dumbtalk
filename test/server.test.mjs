import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("CloudPhone source page avoids inline scripts and styles", async () => {
  const html = await readFile(new URL("../src/client/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/i);
  assert.doesNotMatch(html, /<style/i);
  assert.doesNotMatch(html, /\son(?:click|error|load)=/i);
});

test("compose is reachable for first-run LAN setup by default", async () => {
  const compose = await readFile(new URL("../compose.yaml", import.meta.url), "utf8");
  assert.match(compose, /\$\{BIND_ADDRESS:-0\.0\.0\.0\}:\$\{HOST_PORT:-8787\}:8080/);
  assert.match(compose, /image: samtate96\/dumbtalk:latest/);
  assert.match(compose, /pull_policy: always/);
  assert.doesNotMatch(compose, /build:/);
});

test("production image includes the Fastify server modules", async () => {
  const dockerfile = await readFile(new URL("../Dockerfile", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(dockerfile, /COPY src\/server \.\/src\/server/);
  assert.ok(packageJson.dependencies.fastify, "Fastify must be installed in the production image");
});

test("requested messaging and conversation backend features remain wired", async () => {
  const server = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
  for (const route of [
    "/api/message/reaction",
    "/api/conversation/archive",
    "/api/conversation/expiration",
    "/api/group/create",
    "/api/settings",
    "/api/avatar/",
    "/api/voice",
    "/api/poll/create",
    "/api/message/pin",
    "/api/identity/",
    "/api/group/update",
    "/api/attachment/send",
    "/api/message/forward",
    "/api/sticker/send",
  ]) {
    assert.match(server, new RegExp(route.replaceAll("/", "\\/")));
  }
  for (const feature of [
    "quoteTimestamp",
    "receiptMessage",
    "typingMessage",
    "reactions",
    "previews",
    "expiresAt",
    "forwardedFrom",
    "listStickerPacks",
  ]) {
    assert.match(server, new RegExp(feature));
  }
  assert.match(server, /function normalizedMentions\(items\)/);
  assert.match(server, /function displayIdentity\(value, fallback = "Unknown"\)/);
  assert.match(server, /Unknown member/);
  assert.match(
    server,
    /enriched\.quote = \{ \.\.\.item\.quote, author: displayIdentity\(item\.quote\.author/,
  );
  assert.ok(
    server.indexOf("await persistState();", server.indexOf('url.pathname === "/api/read"'))
      < server.indexOf('await rpc("sendReceipt"', server.indexOf('url.pathname === "/api/read"')),
    "local read state must persist before outbound receipts",
  );
  assert.match(
    server,
    /item\.timestamp > previousReadThrough/,
    "unread repair must use the conversation timestamp rather than stale message status",
  );
});

test("widget authentication supports first-run claiming and avoids URL token leakage", async () => {
  const server = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
  const security = await readFile(new URL("../src/server/http/security.mjs", import.meta.url), "utf8");
  const compose = await readFile(new URL("../compose.yaml", import.meta.url), "utf8");
  const client = await readFile(new URL("../src/client/api/client.ts", import.meta.url), "utf8");
  assert.match(server, /randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(server, /data\/app|CONFIG_PATH/);
  assert.match(server, /url\.pathname === "\/api\/setup\/claim"/);
  assert.match(server, /requestTokenMatches\(req, widgetToken\)/);
  assert.match(security, /timingSafeEqual\(actual, expected\)/);
  assert.match(server, /return json\(res, 404, \{ error: "Not found" \}\)/);
  assert.match(server, /url\.pathname === "\/api\/mindful"/);
  assert.doesNotMatch(server, /ADMIN_PASSWORD/);
  assert.doesNotMatch(server, /signal_session/);
  assert.match(compose, /WIDGET_TOKEN: \$\{WIDGET_TOKEN:-\}/);
  assert.doesNotMatch(compose, /ADMIN_PASSWORD|SESSION_SECRET/);
  assert.match(client, /window\.location\.hash\.slice\(1\)/);
  assert.match(client, /claimInstallation/);
  assert.match(client, /authorization: `Bearer \$\{widgetToken\(\)\}`/);
  assert.doesNotMatch(client, /\/api\/login/);
});

test("automatic signal-cli updater keeps validation and rollback safeguards", async () => {
  const updater = await readFile(new URL("../signal-cli-updater.mjs", import.meta.url), "utf8");
  for (const safeguard of [
    "asset.digest",
    "checksum mismatch",
    "minimumAge",
    "previousBinary",
    "rollBackSignalCli",
    "--version",
  ]) {
    assert.match(updater, new RegExp(safeguard.replaceAll("-", "\\-")));
  }
});
