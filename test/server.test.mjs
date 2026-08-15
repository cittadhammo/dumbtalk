import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("CloudPhone assets avoid inline scripts and styles", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/i);
  assert.doesNotMatch(html, /<style/i);
  assert.doesNotMatch(app, /\son(?:click|error|load)=/i);
});

test("compose binds the public service to loopback by default", async () => {
  const compose = await readFile(new URL("../compose.yaml", import.meta.url), "utf8");
  assert.match(compose, /\$\{BIND_ADDRESS:-127\.0\.0\.1\}:\$\{HOST_PORT:-8787\}:8080/);
});

test("requested messaging and conversation features remain wired", async () => {
  const server = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
  const client = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
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
  ]) assert.match(server, new RegExp(route.replaceAll("/", "\\/")));
  for (const feature of ["quoteTimestamp", "receiptMessage", "typingMessage", "reactions", "previews", "expiresAt"]) assert.match(server, new RegExp(feature));
  assert.match(server, /function normalizedMentions\(items\)/);
  assert.match(server, /function displayIdentity\(value, fallback = "Unknown"\)/);
  assert.match(server, /enriched\.quote = \{ \.\.\.item\.quote, author: displayIdentity\(item\.quote\.author/);
  assert.match(client, /function plainMentionText\(value, mentions = \[\]\)/);
  assert.match(client, /activeMention \? `@\$\{mentionLabel\(activeMention\)\}`/);
  assert.ok(server.indexOf("await persistState();", server.indexOf('url.pathname === "/api/read"')) < server.indexOf('await rpc("sendReceipt"', server.indexOf('url.pathname === "/api/read"')), "local read state must persist before outbound receipts");
  assert.match(server, /item\.timestamp > previousReadThrough/, "unread repair must use the conversation timestamp rather than stale message status");
  for (const label of ["Menu", "Compose", "New group", "Archived chats", "Reply", "Disappearing messages", "Message details", "Reactions", "Delivery", "Choose reaction", "Note to Self"]) assert.match(client, new RegExp(label));
  assert.doesNotMatch(client, /custom-reaction|custom-emoji|Any emoji/);
  assert.match(client, /receiptTime\(item\.at\)/);
  assert.match(client, /function moveEmoji\(horizontal, vertical\)/);
  assert.match(client, /vertical \* columns/);
  assert.match(client, /function focusOutsideEmojiGrid\(grid, direction\)/);
  assert.match(client, /vertical < 0 && row === 0/);
  assert.match(client, /vertical > 0 && row === lastRow/);
  assert.match(client, /item\.author \|\| item\.authorId/);
  assert.match(client, /state\.view = "linking"/);
  assert.doesNotMatch(client, /id="cancel"/);
  assert.match(client, /function scrollFocusedMessage\(direction\)/);
  assert.match(client, /state\.view = "image-viewer"/);
  assert.match(client, /state\.view = "video-viewer"/);
  assert.match(client, /openVideoViewer\(video\.dataset\.videoSrc\)/);
  assert.match(client, /video-viewer"><video[^>]* controls/);
  assert.match(client, /<video class="media"/);
  assert.match(client, /video\.currentTime.*ArrowLeft/);
  assert.match(client, /<h1>SigDumb<\/h1>/);
  assert.match(client, /setSoftkeys\("Sign in", "", "Exit"\)/);
  assert.match(client, /state\.view === "login".*requestSubmit/);
  assert.match(client, /class="room-typing"/);
  assert.match(client, /recorder\.start\(\)/);
  assert.match(client, /getUserMedia\(\{ audio: true \}\)/);
  assert.match(client, /navigator\.hasFeature\("AudioCapture"\)/);
  assert.match(client, /Microphone did not respond/);
  assert.match(client, /accept="audio\/\*" capture="microphone"/);
  assert.match(client, /showRecordingReady\(file\)/);
  assert.match(client, /message \? "Message" : "Options"/);
  assert.match(client, /state\.returnFocusTimestamp = timestamp/);
  assert.match(client, /returnTarget\.focus\(\{ preventScroll: true \}\)/);
  for (const feature of ["voiceRecorderScreen", "pinnedMessages", "pollComposer", "safetyNumberScreen", "groupSettingsScreen", "searchScreen", "draftKey"]) assert.match(client, new RegExp(feature));
  assert.doesNotMatch(client, /setSoftkeys\([^\n]*"Refresh"/);
});

test("automatic signal-cli updater keeps validation and rollback safeguards", async () => {
  const updater = await readFile(new URL("../signal-cli-updater.mjs", import.meta.url), "utf8");
  for (const safeguard of ["asset.digest", "checksum mismatch", "minimumAge", "previousBinary", "rollBackSignalCli", "--version"]) assert.match(updater, new RegExp(safeguard.replaceAll("-", "\\-")));
});
