import { timingSafeEqual } from "node:crypto";

export function tokenMatches(req, expectedToken) {
  const supplied = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!supplied || !expectedToken) return false;
  const expected = Buffer.from(expectedToken);
  const actual = Buffer.from(supplied);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function requestIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

export class InvalidTokenLimiter {
  constructor({ limit = 30, windowMs = 60_000 } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  allow(req, now = Date.now()) {
    const ip = requestIp(req);
    const attempt = this.attempts.get(ip) || { count: 0, resetAt: now + this.windowMs };
    if (now >= attempt.resetAt) {
      attempt.count = 0;
      attempt.resetAt = now + this.windowMs;
    }
    attempt.count += 1;
    this.attempts.set(ip, attempt);
    return attempt.count <= this.limit;
  }
}

export function requireSameOrigin(req, { publicOrigin, configuredOrigin } = {}) {
  const origin = req.headers.origin;
  if (!origin || origin === publicOrigin || origin === configuredOrigin) return true;

  // A browser cannot choose Host independently of the server it connects to.
  // Forwarded values are expected to be set by the deployment's trusted proxy.
  const forwardedHost = req.headers["x-forwarded-host"]?.split(",")[0].trim();
  const host = forwardedHost || req.headers.host;
  const forwardedProto = req.headers["x-forwarded-proto"]?.split(",")[0].trim();
  const protocol = forwardedProto || (req.socket.encrypted ? "https" : "http");
  return Boolean(host) && origin === `${protocol}://${host}`;
}
