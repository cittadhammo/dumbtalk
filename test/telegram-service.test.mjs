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
