import type { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { AppStateRepository } from "../repositories/app-state.js";

const Usage = Type.Object({
  checks: Type.Number(), activeMs: Type.Number(), launches: Type.Array(Type.Number()),
  nudges: Type.Record(Type.String(), Type.Union([Type.Boolean(), Type.Number()])), lastLaunch: Type.Number(),
});
const MindfulInput = Type.Object({ day: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }), usage: Usage });

export function mindfulRoutes(state: AppStateRepository): FastifyPluginAsync {
  return async app => {
    app.get<{ Querystring: { day?: string } }>("/api/mindful", async request => {
      const day = request.query.day;
      return { usage: day ? (await state.get()).mindfulUsage[day] || null : null };
    });
    app.post<{ Body: { day: string; usage: { checks: number; activeMs: number; launches: number[]; nudges: Record<string, boolean | number>; lastLaunch: number } } }>("/api/mindful", {
      schema: { body: MindfulInput },
    }, async request => {
      const { day, usage } = request.body;
      const saved = await state.update(current => {
        current.mindfulUsage[day] = {
          checks: Math.max(0, Math.min(99, Math.floor(usage.checks))),
          activeMs: Math.max(0, Math.min(86_400_000, Math.floor(usage.activeMs))),
          launches: usage.launches.filter(Number.isFinite).slice(-24), nudges: usage.nudges,
          lastLaunch: Math.max(0, Math.floor(usage.lastLaunch)),
        };
        const oldest = new Date(Date.now() - 7 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
        for (const key of Object.keys(current.mindfulUsage)) if (key < oldest) delete current.mindfulUsage[key];
      });
      return { usage: saved.mindfulUsage[day] };
    });
  };
}
