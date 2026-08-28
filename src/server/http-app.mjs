import Fastify from "fastify";

const MAX_LEGACY_BODY_BYTES = 101 * 1024 * 1024;

/**
 * Create DumbTalk's HTTP boundary.
 *
 * Existing routes still use Node's request/response interfaces. The not-found
 * handler is a temporary compatibility boundary that lets route groups move to
 * native Fastify handlers without changing the public API in one large rewrite.
 */
export function createHttpApp({ legacyHandler, health }) {
  const app = Fastify({
    logger: false,
    bodyLimit: MAX_LEGACY_BODY_BYTES,
  });

  // Keep request bodies as streams while legacy attachment and webhook routes
  // still authenticate and enforce their own streaming limits.
  app.removeAllContentTypeParsers();
  app.addContentTypeParser("*", (_request, payload, done) => done(null, payload));

  app.get("/healthz", async (_request, reply) => {
    const ready = health();
    return reply.code(ready ? 200 : 503).send({ ok: ready });
  });

  app.setNotFoundHandler(async (request, reply) => {
    reply.hijack();
    if (request.body && typeof request.body[Symbol.asyncIterator] === "function") {
      request.raw[Symbol.asyncIterator] = request.body[Symbol.asyncIterator].bind(request.body);
    }
    await legacyHandler(request.raw, reply.raw);
  });

  app.setErrorHandler((error, _request, reply) => {
    const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    reply.code(status).send({ error: status === 500 ? "Internal server error" : error.message });
  });

  return app;
}
