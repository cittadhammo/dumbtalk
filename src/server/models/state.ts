export type Settings = {
  sendReadReceipts: boolean;
  sendTypingIndicators: boolean;
  linkPreviews: boolean;
  defaultExpiration: number;
};

export type MindfulUsage = {
  checks: number;
  activeMs: number;
  launches: number[];
  nudges: Record<string, boolean | number>;
  lastLaunch: number;
};

export type AppState = {
  archived: string[];
  favorites: string[];
  readThrough: Record<string, number>;
  expirations: Record<string, number>;
  mindfulUsage: Record<string, MindfulUsage>;
  settings: Settings;
};

export const defaultState = (): AppState => ({
  archived: [], favorites: [], readThrough: {}, expirations: {}, mindfulUsage: {},
  settings: { sendReadReceipts: true, sendTypingIndicators: true, linkPreviews: true, defaultExpiration: 0 },
});
