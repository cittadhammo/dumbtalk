#!/usr/bin/env node
import { createServer } from "node:http";

const contacts = [
  { number: "+10000000001", name: "Jason Example" },
  { number: "+10000000002", name: "Alex Example" },
];
const groups = [{ id: "test-group", name: "Test Group", isMember: true, members: contacts.map(item => item.number) }];
let timestamp = Date.now();

createServer(async (req, res) => {
  if (req.url === "/api/v1/check") { res.writeHead(200); return res.end("ok"); }
  if (req.url === "/api/v1/events") { res.writeHead(200, { "content-type": "text/event-stream" }); return; }
  let raw = ""; for await (const chunk of req) raw += chunk;
  const call = JSON.parse(raw || "{}");
  let result = {};
  if (call.method === "listAccounts") result = ["+10000000000"];
  if (call.method === "listContacts") result = contacts;
  if (call.method === "listGroups") result = groups;
  if (call.method === "send") result = { timestamp: ++timestamp };
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", id: call.id, result }));
}).listen(7583, "127.0.0.1");
