import { Type } from "@sinclair/typebox";

export const ErrorReply = Type.Object({ error: Type.String() });
export const HealthReply = Type.Object({ ok: Type.Boolean() });
