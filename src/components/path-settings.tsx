import { useEffect, useState, type FormEvent } from "react";
import { Check, FolderSearch, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  defaultDirectory,
  emptySelection,
  fileKinds,
  reconcileSelection,
  type Catalog,
  type Selection,
} from "@/lib/path-settings";

import { scanLocalFiles, settingsStorageKey as storageKey } from "@/lib/local-library";
export function PathSettings() {
  const [directory, setDirectory] = useState(defaultDirectory);
  const [scannedDirectory, setScannedDirectory] = useState("");
  const [files, setFiles] = useState<Catalog | null>(null);
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved && typeof saved.directory === "string") {
        setDirectory(saved.directory);
        setSelection(
          Object.fromEntries(
            fileKinds.map(({ key }) => [
              key,
              typeof saved.selection?.[key] === "string" ? saved.selection[key] : "",
            ]),
          ) as Selection,
        );
        setMessage(
          "Gespeicherte Pfade geladen. Bitte den Ordner durchsuchen, um die Dateien zu prüfen.",
        );
      }
    } catch {
      setWarning("Gespeicherte Einstellungen konnten nicht geladen werden.");
    }
  }, []);
  async function scan(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setWarning("");
    setFiles(null);
    setScannedDirectory("");
    try {
      const data = await scanLocalFiles(directory);
      setFiles(data.files);
      setScannedDirectory(data.directory);
      setDirectory(data.directory);
      setSelection((previous) => reconcileSelection(data.files, previous));
      setMessage("Ordner durchsucht. Eindeutige Treffer wurden automatisch ausgewählt.");
      if (data.warnings.length)
        setWarning(
          `${data.warnings.length} Unterordner konnten wegen fehlender Leserechte nicht durchsucht werden.`,
        );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Die lokale Ordnersuche ist nicht erreichbar.",
      );
    } finally {
      setBusy(false);
    }
  }
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ directory: scannedDirectory, selection }));
      window.dispatchEvent(new Event("clima:settings-changed"));
      setMessage("Einstellungen in diesem Browser gespeichert.");
      setError("");
    } catch {
      setError("Die Einstellungen konnten in diesem Browser nicht gespeichert werden.");
    }
  }
  return (
    <section className="panel settings-panel">
      <div className="panel-header">
        <div>
          <h2>Lokale Programme & Klimadateien</h2>
          <p>Ein Überordner für Ihre Werkzeuge und Daten.</p>
        </div>
        <FolderSearch size={20} className="text-primary" />
      </div>
      <form onSubmit={scan} className="settings-folder">
        <label htmlFor="climate-directory">Überordner</label>
        <div className="settings-folder-input">
          <input
            id="climate-directory"
            className="select-field"
            value={directory}
            disabled={busy}
            onChange={(event) => {
              setDirectory(event.target.value);
              setFiles(null);
              setMessage("");
              setError("");
            }}
            placeholder="C:\\…\\KLIMA"
            required
          />
          <Button type="submit" disabled={busy || !directory.trim()}>
            <FolderSearch />
            {busy ? "Wird durchsucht …" : "Ordner durchsuchen"}
          </Button>
        </div>
        <p>
          Unterordner werden mit durchsucht. Die Suche liest nur Dateinamen; Programme werden nicht
          gestartet.
        </p>
      </form>
      {error && (
        <p role="alert" className="settings-alert">
          {error}
        </p>
      )}
      {warning && (
        <p role="status" className="settings-alert">
          {warning}
        </p>
      )}
      <div className="settings-grid">
        {fileKinds.map(({ key, label, hint }) => {
          const options = files?.[key] ?? [];
          return (
            <div className="field" key={key}>
              <label htmlFor={`path-${key}`}>
                {label}
                <span className="text-muted-foreground">{hint}</span>
              </label>
              <select
                id={`path-${key}`}
                className="select-field"
                disabled={!files || options.length === 0 || busy}
                value={files ? selection[key] : ""}
                onChange={(event) => {
                  setSelection((previous) => ({ ...previous, [key]: event.target.value }));
                  setMessage("Auswahl geändert. Bitte speichern.");
                }}
              >
                <option value="">
                  {!files
                    ? "Zuerst Ordner durchsuchen"
                    : options.length === 0
                      ? "Keine passende Datei gefunden"
                      : "Bitte auswählen"}
                </option>
                {options.map((file) => (
                  <option value={file} key={file}>
                    {file}
                  </option>
                ))}
              </select>
              <p className="settings-file-note">
                {files
                  ? `${options.length} Treffer${options.length === 1 ? " · automatisch ausgewählt" : ""}`
                  : "Noch nicht geprüft"}
              </p>
              {files && selection[key] && (
                <p className="settings-full-path">
                  {scannedDirectory.replace(/[\\/]$/, "")}
                  {scannedDirectory.includes("\\") ? "\\" : "/"}
                  {selection[key]}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="settings-save">
        <Button onClick={save} disabled={!files || busy}>
          <Save />
          Einstellungen speichern
        </Button>
        <p role="status" aria-live="polite">
          {message && (
            <>
              <Check size={14} />
              {message}
            </>
          )}
        </p>
      </div>
      <p className="settings-caption">
        Die Pfade werden in diesem Browser gespeichert. Der direkte Zugriff auf Windows-Ordner steht
        im lokalen Betrieb zur Verfügung.
      </p>
    </section>
  );
}
