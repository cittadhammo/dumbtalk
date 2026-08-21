import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonFile } from "../dist/server/repositories/json-file.js";

test("JsonFile serializes concurrent atomic writes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sigdumb-json-"));
  const path = join(directory, "state.json");
  const store = new JsonFile(path, { value: 0 });
  await Promise.all([...Array(25)].map((_, value) => store.write({ value })));
  const parsed = JSON.parse(await readFile(path, "utf8"));
  assert.equal(typeof parsed.value, "number");
});
