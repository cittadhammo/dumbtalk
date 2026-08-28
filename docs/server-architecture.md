# Server architecture

This document records the intended server boundary while DumbTalk moves from a CloudPhone-only
application to a server that can also support independently maintained clients. The migration is
incremental: the bundled CloudPhone interface and its existing endpoints must keep working while
the versioned API is introduced.

## Current shape

`server.mjs` currently owns the Node HTTP listener, Signal process lifecycle, Signal RPC calls,
message normalization, persistence, authentication, setup, media handling, and most Signal routes.
Telegram and WhatsApp have service modules, but they expose HTTP-shaped handlers rather than a
common server-side service interface. The browser then normalizes the three sets of endpoints
through its own service adapters.

This works for one bundled frontend, but it makes an external client responsible for knowing too
much about each messaging network and makes individual server concerns difficult to test in
isolation.

## Target boundaries

The server is being divided into these layers:

1. **Transport:** Fastify routes, authentication, schemas, body limits, security headers, errors,
   and event delivery.
2. **Application:** operations such as listing a unified inbox, sending a message, marking a
   conversation read, and pairing a client.
3. **Messaging services:** Signal, Telegram, and WhatsApp adapters implementing one server-side
   interface and advertising their capabilities.
4. **Persistence:** configuration, local UI state, messages, media metadata, and client credentials.
5. **Processes and vendors:** `signal-cli`, MTProto, and `wacli` lifecycle and protocol details.

The CloudPhone frontend remains a static application served by the same process. Other clients use
the versioned API and do not depend on those static files.

## Compatibility rules

- Existing `/api/...` routes remain available until the bundled frontend has migrated.
- New external-client routes live under `/api/v1` and use validated request and response schemas.
- The widget fragment token remains supported for CloudPhone.
- Standalone clients receive separate revocable credentials through an explicit pairing flow.
- Service-specific identifiers are opaque to clients. Public conversation and message identifiers
  must be stable and include enough server-side context to select the correct service adapter.
- Capabilities remain discoverable because messaging networks do not implement identical features.
- Media endpoints retain streaming and range-request support; framework parsing must never buffer a
  100 MB attachment in memory merely to dispatch it.
- One installation remains one deployable container and one data directory. This refactor does not
  split DumbTalk into networked microservices.

## Migration sequence

1. Put Fastify at the HTTP boundary and route unmatched requests through a tested compatibility
   adapter. Migrate small infrastructure routes first.
2. Extract authentication, origin validation, response security headers, body parsing, setup, and
   configuration into focused modules.
3. Move Signal lifecycle and operations behind a service object, then define the common interface
   using behaviour already shared by all three services.
4. Add `/api/v1` resources, JSON schemas, consistent errors, cursor pagination, and an OpenAPI
   description without removing the compatibility API.
5. Add per-client pairing and a resumable event stream. Polling clients and persistent clients must
   consume the same underlying event model.
6. Move the bundled Preact frontend onto `/api/v1`, test behavioural parity, and only then retire
   obsolete compatibility routes.

## First framework boundary

`src/server/http-app.mjs` now creates the Fastify application. `/healthz` is a native framework
route. All other requests temporarily cross a compatibility handler that preserves raw Node
request and response semantics, including streaming uploads and signed WhatsApp webhook bodies.
Route groups can therefore be migrated independently rather than through a single high-risk
rewrite.
