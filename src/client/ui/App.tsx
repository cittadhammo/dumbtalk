import { useEffect, useState } from "preact/hooks";
import { api, hasWidgetToken } from "../api/client";
import { StartupScreen } from "./StartupScreen";

type Status = { signalReady: boolean; linked: boolean };

export function App() {
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState<string>();
  const boot = () => {
    if (!hasWidgetToken()) { setError("This widget is not configured."); return; }
    setError(undefined); setStatus(undefined);
    void api<Status>("/api/status").then(setStatus).catch(reason => setError(reason.status === 404 ? "This widget is not configured." : reason.message));
  };
  useEffect(boot, []);
  if (error) return <StartupScreen message={error} error onRetry={boot} />;
  if (!status) return <StartupScreen message="Starting SigDumb…" />;
  return <StartupScreen message={status.linked ? "Conversations are migrating…" : "Signal needs linking…"} />;
}
