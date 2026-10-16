import { useEffect, useRef, useState } from "react";
import { BookOpen, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { libraryDirectory } from "@/lib/local-library";
import type { LogSnapshot } from "@/lib/logbook-types";
interface Editor {
  text: string;
  base: LogSnapshot | null;
  external: LogSnapshot | null;
}
export function LogbookWorkspace({ active }: { active: boolean }) {
  const [directory, setDirectory] = useState("");
  const [editor, setEditor] = useState<Editor>({ text: "", base: null, external: null });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const savingRef = useRef(false);
  const readEpoch = useRef(0);
  const directoryRef = useRef("");
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const dirty = !!editor.base && editor.text !== editor.base.text;
  useEffect(() => {
    if (!active) return;
    let current = true;
    let reading = false;
    const hasDraft =
      editorRef.current.base && editorRef.current.text !== editorRef.current.base.text;
    const root = hasDraft && directoryRef.current ? directoryRef.current : libraryDirectory();
    directoryRef.current = root;
    setDirectory(root);
    async function refresh() {
      if (reading || savingRef.current) return;
      if (!window.climaDesktop?.readLogbook) {
        setError("Das Logbuch ist in der Windows-EXE verfügbar.");
        return;
      }
      reading = true;
      const epoch = readEpoch.current;
      try {
        const snapshot = await window.climaDesktop.readLogbook(root);
        if (!current || savingRef.current || epoch !== readEpoch.current) return;
        setError("");
        setEditor((previous) => {
          if (previous.base?.version === snapshot.version)
            return previous.external ? { ...previous, external: null } : previous;
          if (previous.base && previous.text !== previous.base.text)
            return { ...previous, external: snapshot };
          return { text: snapshot.text, base: snapshot, external: null };
        });
      } catch (cause) {
        if (current)
          setError(cause instanceof Error ? cause.message : "Logbuch konnte nicht gelesen werden.");
      } finally {
        reading = false;
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => {
      current = false;
      window.clearInterval(timer);
    };
  }, [active, reload]);
  async function save(expected = editorRef.current.base?.version) {
    const draft = editorRef.current.text;
    if (!expected || !window.climaDesktop?.saveLogbook) return;
    savingRef.current = true;
    readEpoch.current++;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const result = await window.climaDesktop.saveLogbook(directory, draft, expected);
      if (!result.saved) {
        setEditor((previous) => ({ ...previous, external: result.snapshot }));
        return;
      }
      setEditor((previous) => ({
        text: previous.text === draft ? result.snapshot.text : previous.text,
        base: result.snapshot,
        external: null,
      }));
      setStatus("logbuch.txt gespeichert.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  return (
    <section className="panel logbook-panel">
      <div className="library-heading">
        <div>
          <h2>
            <BookOpen size={19} />
            Logbuch
          </h2>
          <p className="library-directory">
            {editor.base?.path || (directory ? `${directory} · logbuch.txt` : "logbuch.txt")}
          </p>
          <p>
            Automatisch im Überordner und seinen Unterordnern erkannt · externe Änderungen werden alle 2 Sekunden geprüft, solange dieser Tab geöffnet ist.
          </p>
        </div>
        <div className="plot-links">
          <Button
            variant="outline"
            disabled={dirty || saving}
            onClick={() => setReload((value) => value + 1)}
          >
            <RefreshCw />
            Neu laden
          </Button>
          <Button onClick={() => void save()} disabled={!dirty || saving || !!editor.external}>
            <Save />
            {saving ? "Speichert …" : "Speichern"}
          </Button>
        </div>
      </div>
      <p role="status" className="library-status">
        {saving
          ? "Datei wird gespeichert …"
          : dirty
            ? "Ungespeicherte Änderungen"
            : editor.base
              ? status || "Mit Datei synchronisiert"
              : "Datei wird geladen …"}
      </p>
      {error && (
        <p role="alert" className="settings-alert">
          {error}
        </p>
      )}
      {editor.external && (
        <div className="settings-alert" role="alert">
          <strong>Die Datei wurde außerhalb der App geändert.</strong>
          <p>
            Ihr Entwurf bleibt erhalten. Vergleichen Sie die Dateiversion, bevor Sie sich
            entscheiden.
          </p>
          <details>
            <summary>Aktuelle Dateiversion anzeigen</summary>
            <pre className="utility-output">{editor.external.text}</pre>
          </details>
          <div className="plot-links">
            <Button
              variant="outline"
              onClick={() => {
                const external = editorRef.current.external!;
                setEditor({ text: external.text, base: external, external: null });
                setStatus("Dateiversion übernommen.");
              }}
            >
              Dateiversion übernehmen
            </Button>
            <Button
              disabled={saving}
              onClick={() => void save(editorRef.current.external!.version)}
            >
              Eigenen Entwurf statt Dateiversion speichern
            </Button>
          </div>
        </div>
      )}
      <label className="sr-only" htmlFor="logbook-text">
        Logbuch bearbeiten
      </label>
      <textarea
        id="logbook-text"
        className="logbook-editor"
        spellCheck={false}
        disabled={!editor.base}
        value={editor.text}
        onChange={(event) => {
          setEditor((previous) => ({ ...previous, text: event.target.value }));
          setStatus("");
        }}
      />
      <p className="settings-caption">
        Speichern ändert die echte logbuch.txt (UTF-8). Die Sicherung vor der ersten Änderung liegt
        daneben als logbuch.txt.bak.
      </p>
    </section>
  );
}
