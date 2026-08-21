import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";

export function hasWidgetToken(request: FastifyRequest, widgetToken: string): boolean {
  const supplied = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!supplied) return false;
  const expected = Buffer.from(widgetToken);
  const actual = Buffer.from(supplied);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isSameOrigin(request: FastifyRequest, publicOrigin: string): boolean {
  const origin = request.headers.origin;
  if (!origin || origin === publicOrigin) return true;
  const host = String(request.headers["x-forwarded-host"] || request.headers.host || "").split(",")[0].trim();
  const protocol = String(request.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  return Boolean(host) && origin === `${protocol}://${host}`;
}
