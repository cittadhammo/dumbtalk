import { useState } from "preact/hooks";
import { api } from "../api/client";
import { useSoftkeys } from "../hooks/useSoftkeys";
import { Shell } from "./Shell";

type LinkStart = { uri: string; qr: string };

export function LinkScreen({ onLinked }: { onLinked: () => void }) {
  const [link, setLink] = useState<LinkStart>();
  const [error, setError] = useState("");
  const [linking, setLinking] = useState(false);
  useSoftkeys({ centre: link ? "Link" : "Select", right: "Exit" });
  async function begin() { try { setError(""); setLink(await api<LinkStart>("/api/link/start", { method: "POST", body: "{}" })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create a link code"); } }
  async function finish() { if (!link) return begin(); try { setLinking(true); await api("/api/link/finish", { method: "POST", body: JSON.stringify({ uri: link.uri }) }); onLinked(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Linking failed"); setLinking(false); } }
  if (!link) return <Shell title="Link Signal" className="linking"><div class="center"><p>Scan a link QR from Signal → Settings → Linked devices.</p><button class="action focusable" onClick={begin}>Generate QR</button><p class="error">{error}</p></div></Shell>;
  return <Shell title="Link Signal" className="linking"><h2>Scan on your phone</h2><img class="qr" src={link.qr} alt="Signal device linking QR code" /><p role="status">{linking ? "Linking…" : "Select Link after scanning"}</p><button class="action focusable" onClick={finish}>{linking ? "Linking…" : "Link"}</button><p class="error">{error}</p></Shell>;
}
