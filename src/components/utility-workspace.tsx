import { useEffect, useState } from "react";
import { CheckCircle2, CircleX, Wrench, ArrowRightLeft, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { libraryDirectory, scanLocalFiles, settingsStorageKey } from "@/lib/local-library";
import type { ToolCheck, ConversionResult } from "@/lib/utility-types";

export function UtilityWorkspace() {
  const [directory, setDirectory] = useState("");
  const [tools, setTools] = useState({ cdo: "", ncdump: "" });
  const [files, setFiles] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [checks, setChecks] = useState<Partial<Record<"cdo" | "ncdump", ToolCheck | undefined>>>(
    {},
  );
  const [checking, setChecking] = useState<Partial<Record<"cdo" | "ncdump", boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);
  const desktop = typeof window !== "undefined" && !!window.climaDesktop?.checkTool;
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    setChecks({});
    setResult(null);
    (async () => {
      try {
        const root = libraryDirectory();
        const data = await scanLocalFiles(root);
        if (!current) return;
        const saved = JSON.parse(localStorage.getItem(settingsStorageKey) ?? "null");
        const selection = (key: "cdo" | "ncdump") =>
          data.files[key].includes(saved?.selection?.[key])
            ? saved.selection[key]
            : data.files[key].length === 1
              ? data.files[key][0]!
              : "";
        setDirectory(data.directory);
        setTools({ cdo: selection("cdo"), ncdump: selection("ncdump") });
        setFiles(data.files.grb);
        const file = data.files.grb.includes(saved?.selection?.grb)
          ? saved.selection.grb
          : data.files.grb.length === 1
            ? data.files.grb[0]!
            : "";
        setInput(file);
        setOutput(
          file
            ? file
                .split(/[\\/]/)
                .at(-1)!
                .replace(/\.grb$/i, ".nc")
            : "",
        );
      } catch (cause) {
        if (current)
          setError(
            cause instanceof Error ? cause.message : "Die Pfade konnten nicht geladen werden.",
          );
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => {
      current = false;
    };
  }, [generation]);
  async function check(tool: "cdo" | "ncdump") {
    if (!window.climaDesktop?.checkTool) return;
    setChecking((previous) => ({ ...previous, [tool]: true }));
    setChecks((previous) => ({ ...previous, [tool]: undefined }));
    try {
      const result = await window.climaDesktop.checkTool({
        directory,
        executable: tools[tool],
        tool,
      });
      setChecks((previous) => ({ ...previous, [tool]: result }));
    } catch (cause) {
      setChecks((previous) => ({
        ...previous,
        [tool]: {
          ok: false,
          output: cause instanceof Error ? cause.message : "Prüfung fehlgeschlagen.",
          command: tool,
          exitCode: null,
        },
      }));
    } finally {
      setChecking((previous) => ({ ...previous, [tool]: false }));
    }
  }
  async function convert() {
    if (!window.climaDesktop?.convertToNetCDF) return;
    setConverting(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await window.climaDesktop.convertToNetCDF({ directory, cdo: tools.cdo, input, output }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Konvertierung fehlgeschlagen.");
    } finally {
      setConverting(false);
    }
  }
  return (
    <div className="utility-workspace">
      <section className="panel utility-panel">
        <div className="plot-section-title">
          <Wrench />
          <div>
            <h2>Programme prüfen</h2>
            <p>Erfolgreicher Aufruf mit Ausgabe und Exitcode 0</p>
          </div>
        </div>
        {(["cdo", "ncdump"] as const).map((tool) => (
          <div className="utility-tool" key={tool}>
            <div className="utility-tool-heading">
              <div>
                <h3>{tool}</h3>
                <p>{tools[tool] || "Kein Programmpfad ausgewählt"}</p>
              </div>
              {checks[tool]?.ok ? (
                <span className="utility-success" role="status">
                  <CheckCircle2 aria-hidden="true" />
                  {tool} funktioniert
                </span>
              ) : (
                checks[tool] && (
                  <span className="utility-failed" role="status">
                    <CircleX />
                    Prüfung fehlgeschlagen
                  </span>
                )
              )}
              <Button
                variant="outline"
                disabled={loading || !desktop || !tools[tool] || checking[tool]}
                onClick={() => void check(tool)}
              >
                {checking[tool] ? "Wird geprüft …" : `${tool} prüfen`}
              </Button>
            </div>
            <p className="settings-caption">
              Prüfbefehl: <code>{tool === "cdo" ? "cdo -V" : "ncdump"}</code>
            </p>
            {checks[tool] && (
              <details>
                <summary>
                  Ausgabe anzeigen · Exitcode {checks[tool]?.exitCode ?? "nicht verfügbar"}
                </summary>
                <pre className="utility-output">{checks[tool]?.output}</pre>
              </details>
            )}
          </div>
        ))}
        {!desktop && (
          <p className="settings-alert">Die Programmprüfung ist in der Windows-EXE verfügbar.</p>
        )}
        <div className="plot-links">
          <Button
            variant="outline"
            disabled={loading || converting || checking.cdo || checking.ncdump}
            onClick={() => setGeneration((value) => value + 1)}
          >
            <RefreshCw />
            Pfade neu laden
          </Button>
          <Link to="/einstellungen" className="library-link">
            Einstellungen
          </Link>
        </div>
      </section>
      <section className="panel utility-panel">
        <div className="plot-section-title">
          <ArrowRightLeft />
          <div>
            <h2>In NetCDF konvertieren</h2>
            <p>GRIB-Datei mit CDO nach NetCDF kopieren</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="convert-input">Grunddatei (.grb)</label>
          <select
            id="convert-input"
            className="select-field"
            disabled={loading || converting}
            value={input}
            onChange={(event) => {
              const file = event.target.value;
              setInput(file);
              setOutput(
                file
                  .split(/[\\/]/)
                  .at(-1)!
                  .replace(/\.grb$/i, ".nc"),
              );
              setResult(null);
            }}
          >
            <option value="">
              {files.length ? "GRIB-Datei auswählen" : "Keine GRIB-Dateien gefunden"}
            </option>
            {files.map((file) => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="convert-output">Neue Datei (.nc)</label>
          <input
            id="convert-output"
            className="select-field"
            value={output}
            disabled={converting}
            onChange={(event) => {
              setOutput(event.target.value);
              setResult(null);
            }}
            placeholder="z. B. temperatur-konvertiert.nc"
          />
        </div>
        <p className="settings-caption">
          Zielordner: {directory || "Noch nicht geladen"}. Bereits vorhandene Dateien werden nicht
          überschrieben.
        </p>
        <pre className="utility-output">{`cdo -f nc copy "${input || "eingabe.grb"}" "${output || "ausgabe.nc"}"`}</pre>
        <Button
          onClick={() => void convert()}
          disabled={!desktop || loading || converting || !input || !tools.cdo || !output.trim()}
        >
          {converting ? "Konvertierung läuft …" : "In NetCDF konvertieren"}
        </Button>
        {converting && (
          <p role="status" className="settings-caption">
            CDO verarbeitet die Datei. Sie können währenddessen den Tab wechseln.
          </p>
        )}
        {error && (
          <p role="alert" className="settings-alert">
            {error}
          </p>
        )}
        {result && (
          <div role="status" className="utility-result">
            <p className="utility-success">
              <CheckCircle2 />
              {result.output} wurde erstellt.
            </p>
            <p>In der Datenbibliothek über „Aktualisieren“ einlesen.</p>
            <details>
              <summary>CDO-Ausgabe anzeigen</summary>
              <pre className="utility-output">{result.log}</pre>
            </details>
          </div>
        )}
      </section>
    </div>
  );
}
