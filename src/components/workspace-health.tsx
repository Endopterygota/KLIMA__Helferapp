import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { settingsStorageKey } from "@/lib/local-library";
import type { WorkspaceHealth } from "@/lib/workspace-health-types";
export function WorkspaceHealthIndicator() {
  const [health, setHealth] = useState<WorkspaceHealth>({ ok: false, issues: ["Arbeitsbereich wird geprüft …"] });
  const [open, setOpen] = useState(false);
  const requestCheck = useRef<() => void>(() => {});
  useEffect(() => {
    let mounted = true;
    let running = false;
    let generation = 0;
    let again = false;
    async function check(invalidate = false) {
      if (invalidate) {
        generation++;
        setHealth({ ok: false, issues: ["Arbeitsbereich wird geprüft …"] });
      }
      if (running) { again = true; return; }
      running = true;
      const current = generation;
      try {
        const settings = JSON.parse(localStorage.getItem(settingsStorageKey) ?? "null");
        let result: WorkspaceHealth;
        if (!settings?.directory?.trim()) result = { ok: false, issues: ["Überordner ist nicht eingestellt und gespeichert."] };
        else if (!window.climaDesktop?.workspaceHealth) result = { ok: false, issues: ["Die vollständige Prüfung ist in der Windows-EXE verfügbar."] };
        else result = await window.climaDesktop.workspaceHealth(settings);
        if (mounted && current === generation) setHealth(result);
      } catch { if (mounted && current === generation) setHealth({ ok: false, issues: ["Einstellungen oder lokale Programme konnten nicht geprüft werden."] }); }
      finally {
        running = false;
        if (mounted && again) { again = false; void check(); }
      }
    }
    requestCheck.current = () => void check(true);
    const changed = () => void check(true);
    const focus = () => void check();
    const storage = (event: StorageEvent) => { if (event.key === settingsStorageKey || event.key === null) changed(); };
    window.addEventListener("clima:settings-changed", changed);
    window.addEventListener("focus", focus);
    window.addEventListener("storage", storage);
    const timer = window.setInterval(() => { if (!document.hidden) void check(); }, 10000);
    void check();
    return () => { mounted = false; window.clearInterval(timer); window.removeEventListener("clima:settings-changed", changed); window.removeEventListener("focus", focus); window.removeEventListener("storage", storage); };
  }, []);
  const message = health.ok ? "Ordner, Programmpfade, Java und Klimadateien geprüft." : health.issues.join("\n");
  return <div className="workspace-health">
    <button type="button" className="workspace-health-trigger" aria-label={`Lokaler Arbeitsbereich: ${health.ok ? "bereit" : "unvollständig"}`} aria-expanded={open} onClick={() => setOpen(!open)} title={message}>
      <span className={`status-dot ${health.ok ? "health-ok" : "health-error"}`} aria-hidden="true" /> Lokaler Arbeitsbereich
    </button>
    {open && <div className="workspace-health-details">
      <strong>{health.ok ? "Arbeitsbereich bereit" : "Arbeitsbereich unvollständig"}</strong>
      {health.ok ? <p>{message}</p> : <ul>{health.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
      <Link to="/einstellungen" onClick={() => setOpen(false)}>Pfade einstellen</Link>
      <button type="button" onClick={() => requestCheck.current()}>Erneut prüfen</button>
    </div>}
  </div>;
}
