import { useEffect, useState } from "react";
import { Download, FolderOpen, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { libraryDirectory, settingsStorageKey } from "@/lib/local-library";
import type { SetupState } from "@/lib/quick-setup-types";
export function QuickSetupPanel() {
  const [directory, setDirectory] = useState("");
  const [copyCourseFiles, setCopyCourseFiles] = useState(true);
  const [state, setState] = useState<SetupState>({ running: false, directory: "", message: "Bereit", completed: [], warnings: [] });
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [savedDirectory, setSavedDirectory] = useState("");
  const desktop = typeof window !== "undefined" && !!window.climaDesktop?.startSetup;
  useEffect(() => {
    const api = window.climaDesktop;
    let current = true;
    const unsubscribe = api?.onSetupProgress?.((value) => { if (current) setState(value); });
    void api?.setupStatus?.().then((value) => {
      if (current) { setState(value); setDirectory(value.directory || value.defaultDirectory); }
    }).catch((cause) => { if (current) setError(cause.message); });
    return () => { current = false; unsubscribe?.(); };
  }, []);
  useEffect(() => {
    if (!state.running && state.result) {
      try {
        const serialized = JSON.stringify(state.result);
        const changed = localStorage.getItem(settingsStorageKey) !== serialized;
        localStorage.setItem(settingsStorageKey, serialized);
        setSavedDirectory(state.result.directory);
        if (changed) window.dispatchEvent(new Event("clima:settings-changed"));
      } catch { setError("Setup fertig, aber die Pfade konnten nicht gespeichert werden. Bitte unter Einstellungen zuordnen."); }
    }
  }, [state.running, state.result]);
  const busy = starting || state.running;
  async function start() {
    setStarting(true); setError(""); setSavedDirectory("");
    try {
      const value = await window.climaDesktop!.startSetup!({ directory, ...(copyCourseFiles ? { sourceDirectory: libraryDirectory() } : {}) });
      setState(value);
    } catch (cause) { setError((cause as Error).message); }
    finally { setStarting(false); }
  }
  return (
    <div className="quick-setup" aria-label="Quicksetup">
      <div className="library-heading">
        <div><h3><Download size={18} /> Quicksetup</h3><p>Arbeitsordner, Java 11, Panoply, CDO, ncdump, Handbuch und öffentliche NetCDF-Testdatei automatisch einrichten.</p></div>
        <Button onClick={() => void start()} disabled={!desktop || busy || !directory.trim()}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Download />}{busy ? "Setup läuft …" : "Quicksetup starten"}
        </Button>
      </div>
      <label htmlFor="setup-directory">Neuer Arbeitsordner</label>
      <div className="settings-folder-input">
        <input id="setup-directory" className="select-field" value={directory} disabled={busy || !desktop} onChange={(event) => setDirectory(event.target.value)} placeholder="Wird automatisch in Dokumente angelegt" />
        <Button variant="outline" disabled={busy || !desktop} onClick={() => {
          void window.climaDesktop?.setupFolder?.().then((folder) => { if (folder) setDirectory(folder); }).catch((cause) => setError(cause.message));
        }}><FolderOpen /> Ordner wählen</Button>
      </div>
      <label className="setup-checkbox"><input type="checkbox" checked={copyCourseFiles} disabled={busy} onChange={(event) => setCopyCourseFiles(event.target.checked)} /> Vorhandene GRIB-/NetCDF- und Excel-Kursdateien aus meinem eingestellten Ordner kopieren</label>
      <p className="settings-caption">Lokal im Zielordner, ohne Administratorrechte. CDO 1.6.4 ist die ältere Windows-Kursversion aus der Vorbereitung. Die ursprüngliche Excel-Testdatei und die ECHAM5-Daten benötigen Kurszugang bzw. ein WDCC-Konto und können ohne vorhandene lokale Dateien nicht automatisch bezogen werden. Das öffentliche NetCDF-Beispiel ist ein zusätzlicher Funktionstest.</p>
      <p className="settings-caption">Etwa 110 MB Downloads · bis zu 2 Stunden pro Download · unterbrochene Downloads werden bei erneutem Start nach Möglichkeit fortgesetzt. Vorhandene Dateien werden nicht überschrieben.</p>
      {!desktop && <p>Quicksetup ist in der Windows-EXE verfügbar.</p>}
      <div role="status" aria-live="polite">
        <p>{state.message}</p>
        {state.running && typeof state.received === "number" && <>
          <progress aria-label="Downloadfortschritt" value={state.total ? state.received : undefined} max={state.total || undefined} />
          <p>{(state.received / 1048576).toFixed(1)} MB{state.total ? ` / ${(state.total / 1048576).toFixed(1)} MB` : " geladen"}</p>
        </>}
        {state.completed.length > 0 && <ul className="setup-checks">{state.completed.map((label) => <li key={label}><Check size={14} /> {label}</li>)}</ul>}
        {savedDirectory && <p>Pfade gespeichert: {savedDirectory}.{state.warnings.length ? " Bitte die Hinweise prüfen." : " Übersicht und Utility sind bereit."}</p>}
      </div>
      {state.warnings.length > 0 && <div className="setup-warnings"><strong>Noch zu prüfen</strong><ul>{state.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
      {(error || state.error) && <p role="alert">{error || state.error}</p>}
      {state.running && <Button variant="outline" onClick={() => { void window.climaDesktop?.cancelSetup?.().catch((cause) => setError(cause.message)); }}>Setup abbrechen</Button>}
    </div>
  );
}
