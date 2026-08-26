import { createWriteStream, existsSync } from "node:fs";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const API = "https://api.github.com/repos/AsamK/signal-cli/releases/latest";

function run(command, args, timeout = 30_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", data => stdout += data);
    child.stderr.on("data", data => stderr += data);
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(`${command} timed out`)); }, timeout);
    child.on("error", reject);
    child.on("exit", code => { clearTimeout(timer); code === 0 ? resolve({ stdout: stdout.trim(), stderr: stderr.trim() }) : reject(new Error(stderr.trim() || `${command} exited ${code}`)); });
  });
}

async function metadata(path) { try { return JSON.parse(await readFile(path, "utf8")); } catch { return null; } }
async function save(path, value) { const tmp = `${path}.tmp`; await writeFile(tmp, JSON.stringify(value), { mode: 0o600 }); await rename(tmp, path); }

export async function prepareSignalCli({ dataDir, bundledBinary = "/usr/local/bin/signal-cli", log = () => {} }) {
  const runtime = join(dataDir, "signal-cli-runtime");
  const versions = join(runtime, "versions");
  const statePath = join(runtime, "current.json");
  await mkdir(versions, { recursive: true });
  const previous = await metadata(statePath);
  const previousBinary = previous?.format === "jvm" && previous?.binary && existsSync(previous.binary) ? previous.binary : bundledBinary;
  const result = { binary: previousBinary, fallback: bundledBinary, version: previous?.version || "bundled", update: "disabled" };
  if (process.env.SIGNAL_CLI_AUTO_UPDATE === "false") return result;
  result.update = "checking";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const response = await fetch(API, { headers: { accept: "application/vnd.github+json", "user-agent": "dumbtalk" }, signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`release check returned ${response.status}`);
    const release = await response.json();
    const version = String(release.tag_name || "").replace(/^v/, "");
    const asset = (release.assets || []).find(item => item.name === `signal-cli-${version}.tar.gz`);
    if (!version || !asset) throw new Error("latest release has no JVM asset");
    const minimumAge = Number(process.env.SIGNAL_CLI_UPDATE_MIN_AGE_HOURS || 24) * 3_600_000;
    if (Date.now() - new Date(release.published_at).getTime() < minimumAge) { result.update = "waiting"; return result; }
    if (previous?.format === "jvm" && previous?.version === version && existsSync(previousBinary)) { result.update = "current"; return result; }
    if (!String(asset.digest || "").startsWith("sha256:")) throw new Error("release asset has no trusted SHA-256 digest");
    const archive = join(runtime, `${version}.tar.gz.partial`);
    const download = await fetch(asset.browser_download_url, { headers: { "user-agent": "dumbtalk" } });
    if (!download.ok || !download.body) throw new Error(`download returned ${download.status}`);
    const hash = createHash("sha256");
    await pipeline(Readable.fromWeb(download.body), new Transform({ transform(chunk, encoding, callback) { hash.update(chunk); callback(null, chunk); } }), createWriteStream(archive, { mode: 0o600 }));
    const actual = hash.digest("hex");
    const expected = asset.digest.slice(7).toLowerCase();
    if (actual !== expected) { await rm(archive, { force: true }); throw new Error("download checksum mismatch"); }
    const target = join(versions, version);
    await rm(target, { recursive: true, force: true }); await mkdir(target, { recursive: true });
    await run("tar", ["-xzf", archive, "-C", target], 120_000); await rm(archive, { force: true });
    const binary = join(target, `signal-cli-${version}`, "bin", "signal-cli"); await chmod(binary, 0o755);
    const reported = await run(binary, ["--version"]);
    if (!reported.stdout.includes(version) && !reported.stderr.includes(version)) throw new Error("downloaded binary reports an unexpected version");
    await save(statePath, { version, binary, previousBinary, format: "jvm", installedAt: Date.now() });
    log(`signal-cli ${version} staged and selected`);
    return { binary, fallback: previousBinary, version, update: "updated" };
  } catch (error) {
    log("signal-cli update skipped", error.message);
    return { ...result, update: "failed", error: error.message };
  }
}

export async function rollBackSignalCli(dataDir, failed, fallback, log = () => {}) {
  const statePath = join(dataDir, "signal-cli-runtime", "current.json");
  await save(statePath, { version: "rollback", binary: fallback, failedBinary: failed, installedAt: Date.now() });
  log("signal-cli candidate failed health checks; rolled back");
  return fallback;
}
