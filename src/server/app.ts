import Fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { readConfig, type AppConfig } from "./config.js";
import { hasWidgetToken, isSameOrigin } from "./auth.js";
import { ErrorReply, HealthReply } from "./schemas/common.js";

const csp = {
  directives: {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "blob:"],
    mediaSrc: ["'self'", "blob:"],
    styleSrc: ["'self'"],
    scriptSrc: ["'self'"],
    connectSrc: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'none'"],
    formAction: ["'self'"],
  },
};

export async function buildServer(config: AppConfig = readConfig()): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      redact: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"],
    },
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: csp, referrerPolicy: { policy: "no-referrer" } });
  await app.register(rateLimit, {
    global: false,
    keyGenerator: request => request.ip,
  });

  app.get("/healthz", { schema: { response: { 200: HealthReply, 503: HealthReply } } }, async () => ({ ok: true }));

  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/api/")) return;
    if (!hasWidgetToken(request, config.widgetToken)) {
      // Keep invalid, missing and rate-limited tokens indistinguishable.
      await new Promise(resolve => setTimeout(resolve, 250));
      return reply.code(404).send({ error: "Not found" });
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !isSameOrigin(request, config.publicOrigin)) {
      return reply.code(403).send({ error: "Origin rejected" });
    }
  });

  app.get("/api/status", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    schema: { response: { 501: ErrorReply } },
  }, async (_request, reply) => reply.code(501).send({ error: "Signal service not migrated yet" }));

  return app;
}
