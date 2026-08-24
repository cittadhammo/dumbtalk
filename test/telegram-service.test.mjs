import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TelegramService } from "../telegram-service.mjs";

test("Telegram remains optional when API credentials are absent", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dumbtalk-telegram-"));
  try {
    const service = new TelegramService({
      dataDir: directory,
      apiId: undefined,
      apiHash: undefined,
      log: () => {},
    });
    await service.initialize();
    assert.deepEqual(service.statusPayload(), {
      ready: false,
      connected: false,
      authStage: "phone",
      accountLabel: undefined,
      passwordHint: undefined,
      configured: false,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Telegram integration contains native auth, read, reaction, and media paths", async () => {
  const source = await readFile(new URL("../telegram-service.mjs", import.meta.url), "utf8");
  for (const feature of [
    "signInQr",
    "sendCode",
    "checkPassword",
    "lastReadIngoing",
    "lastReadOutgoing",
    "readHistory",
    "allowedReactions",
    "sendReaction",
    "forwardMessagesById",
    "downloadToFile",
    "archiveChats",
    "setChatTtl",
  ]) {
    assert.match(source, new RegExp(feature));
  }
  assert.match(source, /return String\(/);
});

function testService(log = () => {}) {
  const service = new TelegramService({
    dataDir: "/tmp/dumbtalk-telegram-test",
    apiId: 1,
    apiHash: "test",
    log,
  });
  service.me = { id: 99, firstName: "Me" };
  service.auth.stage = "authorized";
  return service;
}

test("Telegram dialog refreshes are cached and flood waits serve stale data", async () => {
  const service = testService();
  let calls = 0;
  service.client = {
    async *iterDialogs() {
      calls += 1;
      if (calls > 1) throw Object.assign(new Error("Telegram API error 420: FLOOD_WAIT_17"), {
        code: 420,
        text: "FLOOD_WAIT_%d",
        seconds: 17,
      });
      yield {
        peer: { id: 1, type: "user", firstName: "Alice" },
        unreadCount: 2,
      };
      yield {
        peer: { id: -100, type: "chat", chatType: "supergroup", title: "Friends" },
        unreadCount: 0,
      };
    },
  };

  const first = await service.dialogs();
  assert.equal(first[0].name, "Alice");
  assert.equal(first[1].kind, "group");
  assert.equal((await service.dialogs())[0].name, "Alice");
  assert.equal(calls, 1);

  service.dialogCache.at = 0;
  assert.equal((await service.dialogs())[0].name, "Alice");
  assert.equal(calls, 2);
  assert.ok(service.floodUntil > Date.now());
  assert.equal((await service.dialogs())[0].name, "Alice");
  assert.equal(calls, 2);
});

test("Telegram grouped media becomes one message with multiple attachments", () => {
  const service = testService();
  const chat = { id: -100, type: "group", title: "Photos" };
  const sender = { id: 1, firstName: "Alice" };
  const create = (id, media, text = "") => ({
    id,
    chat,
    sender,
    groupedIdUnique: "-100:album-1",
    media,
    text,
    date: new Date(id * 1_000),
  });
  const photo = (fileId) => ({
    type: "photo",
    fileId,
    fileSize: 100,
    width: 320,
    height: 240,
  });

  const messages = service.mergeGroupedMessages([
    service.normalizeMessage(create(1, photo("one"), "An album")),
    service.normalizeMessage(create(2, photo("two"))),
  ]);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].text, "An album");
  assert.equal(messages[0].attachments.length, 2);
  assert.equal(messages[0]._rawAttachments.length, 2);
  assert.equal(service.messageCache.get("-100:2"), messages[0]);
});
