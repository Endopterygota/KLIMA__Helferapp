import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, Image, RefreshCw, Play, FileChartColumn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  libraryDirectory,
  scanLocalFiles,
  settingsStorageKey,
  sortedLibrary,
} from "@/lib/local-library";
import type { PlotSource, PlotVariable, PlotResult } from "@/lib/plot-types";

export function PlotWorkspace() {
  const [source, setSource] = useState<PlotSource>({ directory: "", file: "", panoply: "" });
  const [files, setFiles] = useState<ReturnType<typeof sortedLibrary>>([]);
  const [variables, setVariables] = useState<PlotVariable[]>([]);
  const [variable, setVariable] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PlotResult | null>(null);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const reload = () => setGeneration((value) => value + 1);
    window.addEventListener("clima:settings-changed", reload);
    return () => window.removeEventListener("clima:settings-changed", reload);
  }, []);
  const desktop = typeof window !== "undefined" && !!window.climaDesktop?.inspectDataset;
  useEffect(() => {
    let current = true;
    setBusy(true);
    setError("");
    setResult(null);
    setSource({ directory: "", file: "", panoply: "" });
    (async () => {
      try {
        const directory = libraryDirectory();
        const data = await scanLocalFiles(directory);
        if (!current) return;
        const entries = sortedLibrary(data.files);
        const saved = JSON.parse(localStorage.getItem(settingsStorageKey) ?? "null");
        const previous = [saved?.selection?.nc, saved?.selection?.grb].find((value) =>
          entries.some((file) => file.relativePath === value),
        );
        const panoply = data.files.panoply.includes(saved?.selection?.panoply)
          ? saved.selection.panoply
          : data.files.panoply.length === 1
            ? data.files.panoply[0]!
            : "";
        setFiles(entries);
        setSource({
          directory: data.directory,
          file: previous ?? (entries.length === 1 ? entries[0]!.relativePath : ""),
          panoply,
        });
        if (!panoply) setError("Bitte Panoply in den Einstellungen auswählen und speichern.");
        else if (data.warnings.length)
          setError(
            "Einige Unterordner konnten nicht gelesen werden. Die Dateiliste ist möglicherweise unvollständig.",
          );
      } catch (cause) {
        if (current)
          setError(
            cause instanceof Error ? cause.message : "Dateien konnten nicht geladen werden.",
          );
      } finally {
        if (current) setBusy(false);
      }
    })();
    return () => {
      current = false;
    };
  }, [generation]);
  useEffect(() => {
    let current = true;
    setVariables([]);
    setVariable("");
    setResult(null);
    setReading(false);
    if (!source.file || !source.panoply || !window.climaDesktop?.inspectDataset) return;
    setReading(true);
    setError("");
    window.climaDesktop
      .inspectDataset(source)
      .then((data) => {
        if (!current) return;
        setVariables(data.variables);
        if (data.variables.length === 1) setVariable(data.variables[0]!.name);
        if (!data.variables.length)
          setError("Panoply hat keine Variable für einen geografischen 2D-Plot gefunden.");
      })
      .catch((cause) => {
        if (current)
          setError(
            cause instanceof Error ? cause.message : "Die Variablen konnten nicht gelesen werden.",
          );
      })
      .finally(() => {
        if (current) setReading(false);
      });
    return () => {
      current = false;
    };
  }, [source]);
  const selected = variables.find((entry) => entry.name === variable);
  const locked = busy || reading || running;
  async function plot() {
    if (!variable || !window.climaDesktop?.createPlot) return;
    setRunning(true);
    setError("");
    setResult(null);
    try {
      setResult(await window.climaDesktop.createPlot(source, variable));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Der Plot konnte nicht erstellt werden.");
    } finally {
      setRunning(false);
    }
  }
  return (
    <div className="plot-workspace">
      <section className="panel plot-controls">
        <div className="plot-section-title">
          <FileChartColumn size={20} />
          <div>
            <h2>Plot erstellen</h2>
            <p>Mit Ihrer lokalen Panoply-Installation</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="plot-file">
            1. Grunddatei <span>.grb / .nc</span>
          </label>
          <select
            id="plot-file"
            className="select-field"
            value={source.file}
            disabled={locked}
            onChange={(event) =>
              setSource((previous) => ({ ...previous, file: event.target.value }))
            }
          >
            <option value="">
              {busy
                ? "Dateien werden gesucht …"
                : files.length
                  ? "Datei auswählen"
                  : "Keine Klimadateien gefunden"}
            </option>
            {files.map((file) => (
              <option key={file.relativePath} value={file.relativePath}>
                {file.relativePath}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="plot-variable">2. Variable</label>
          <select
            id="plot-variable"
            className="select-field"
            value={variable}
            disabled={locked || !variables.length}
            onChange={(event) => {
              setVariable(event.target.value);
              setResult(null);
            }}
          >
            <option value="">{reading ? "Panoply liest Variablen …" : "Variable auswählen"}</option>
            {variables.map((entry) => (
              <option value={entry.name} key={entry.name}>
                {entry.label || entry.name}
                {entry.units ? ` (${entry.units})` : ""} · {entry.name}
              </option>
            ))}
          </select>
        </div>
        {selected && (
          <div className="plot-metadata">
            <strong>{selected.label || selected.name}</strong>
            <p>
              Variable: {selected.name} · Einheit: {selected.units || "nicht angegeben"}
            </p>
            <p>
              Dimensionen:{" "}
              {selected.dimensions
                .map((dimension) => `${dimension.name} (${dimension.length})`)
                .join(" × ")}
            </p>
            <p>
              Erster Zeitschritt / erste Ebene.{" "}
              {selected.dimensions
                .filter((dimension) => /time/i.test(dimension.name))
                .map((dimension) => `${dimension.name}: ${dimension.first}`)
                .join(" · ")}
            </p>
          </div>
        )}
        <Button
          className="w-full"
          onClick={() => void plot()}
          disabled={locked || !variable || !desktop}
        >
          <Play />
          {running ? "Panoply erstellt die Grafik …" : "Create Plot"}
        </Button>
        <p role="status" className="settings-caption">
          {reading
            ? "Die Variablen werden direkt aus der Grunddatei gelesen."
            : running
              ? "Die Grafik wird im Hintergrund mit Panoply berechnet."
              : `${files.length} Klimadateien verfügbar · ${variables.length} darstellbare Variablen`}
        </p>
        {!desktop && (
          <p className="settings-alert">Die Panoply-Verbindung ist in der Windows-EXE verfügbar.</p>
        )}
        {error && (
          <p role="alert" className="settings-alert">
            {error}
          </p>
        )}
        <div className="plot-links">
          <Button
            variant="outline"
            onClick={() => setGeneration((value) => value + 1)}
            disabled={locked}
          >
            <RefreshCw />
            Neu einlesen
          </Button>
          <Link to="/einstellungen" className="library-link">
            Pfade einstellen
          </Link>
        </div>
      </section>
      <section className="panel plot-preview">
        <div className="plot-preview-heading">
          <h2>Grafikvorschau</h2>
          {result && (
            <Button variant="outline" asChild>
              <a
                href={result.image}
                download={`${result.variable.replace(/[^a-zA-Z0-9_-]/g, "_")}-panoply.png`}
              >
                <Download />
                PNG speichern
              </a>
            </Button>
          )}
        </div>
        {result ? (
          <figure>
            <img src={result.image} alt={`Panoply-Plot: ${selected?.label || result.variable}`} />
            <figcaption>
              {source.file} · {result.variable} · Panoply · Erster Zeitschritt / erste Ebene
            </figcaption>
          </figure>
        ) : (
          <div className="plot-empty">
            <Image size={42} />
            <h3>{running ? "Grafik wird erstellt …" : "Ihre Klimadaten als Grafik"}</h3>
            <p>
              {running
                ? "Panoply verarbeitet die ausgewählte Variable."
                : "Grunddatei und Variable auswählen, dann „Create Plot“ starten."}
            </p>
          </div>
        )}
        <p className="settings-caption">
          Geografischer 2D-Plot aus den tatsächlichen Dateiwerten, ohne zeitliche Mittelung. Die
          Farbskala zeigt die Einheit der Grunddatei.
        </p>
      </section>
    </div>
  );
}
