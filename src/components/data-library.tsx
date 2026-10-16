import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Database, File, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { libraryDirectory, scanLocalFiles, sortedLibrary } from "@/lib/local-library";
import { type Catalog } from "@/lib/path-settings";

export function DataLibrary() {
  const [files, setFiles] = useState<Catalog | null>(null);
  const [directory, setDirectory] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [descending, setDescending] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    setWarning("");
    setFiles(null);
    try {
      const folder = libraryDirectory();
      setDirectory(folder);
      const data = await scanLocalFiles(folder);
      setFiles(data.files);
      setDirectory(data.directory);
      if (data.warnings.length)
        setWarning(
          `${data.warnings.length} Unterordner konnten nicht gelesen werden. Die Liste ist möglicherweise unvollständig.`,
        );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Die Dateien konnten nicht geladen werden.",
      );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const visible = files ? sortedLibrary(files, query, type, descending) : [];
  const count = files ? files.grb.length + files.nc.length : 0;
  return (
    <section className="panel library-panel" aria-label="Lokale Klimadateien">
      <div className="library-heading">
        <div>
          <h2>
            <Database size={18} />
            Lokale Klimadateien
          </h2>
          <p className="library-directory">{directory || "Überordner wird geladen …"}</p>
          <p>Alle .grb- und .nc-Dateien inklusive Unterordnern.</p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={busy}>
          <RefreshCw className={busy ? "animate-spin" : ""} />
          Aktualisieren
        </Button>
      </div>
      <div className="library-toolbar">
        <label className="library-search">
          <Search size={16} />
          <span className="sr-only">Dateien suchen</span>
          <input
            placeholder="Dateiname oder Unterordner suchen …"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Dateityp</span>
          <select
            className="select-field"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="all">Alle Dateitypen</option>
            <option value="grb">GRIB (.grb)</option>
            <option value="nc">NetCDF (.nc)</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sortierung</span>
          <select
            className="select-field"
            value={descending ? "desc" : "asc"}
            onChange={(event) => setDescending(event.target.value === "desc")}
          >
            <option value="asc">Dateiname A–Z</option>
            <option value="desc">Dateiname Z–A</option>
          </select>
        </label>
      </div>
      <p role="status" className="library-status">
        {busy
          ? "Ordner wird durchsucht …"
          : files
            ? `${visible.length} von ${count} Dateien · ${files.grb.length} GRIB · ${files.nc.length} NetCDF`
            : "Keine Dateiliste verfügbar"}
      </p>
      {error && (
        <div role="alert" className="settings-alert">
          {error}{" "}
          <Link to="/einstellungen" className="library-link">
            Überordner in den Einstellungen prüfen
          </Link>
        </div>
      )}
      {warning && (
        <p role="status" className="settings-alert">
          {warning}
        </p>
      )}
      {!busy && files && !visible.length && (
        <div className="library-empty">
          <File size={28} />
          <h3>{count ? "Keine passenden Dateien" : "Noch keine Klimadateien gefunden"}</h3>
          <p>
            {count
              ? "Suchbegriff oder Dateityp ändern."
              : "Wählen Sie in den Einstellungen einen Ordner mit .grb- oder .nc-Dateien."}
          </p>
          <Link to="/einstellungen" className="library-link">
            Zu den Einstellungen
          </Link>
        </div>
      )}
      {visible.length > 0 && (
        <div className="table-wrap">
          <table className="scenario-table library-table">
            <thead>
              <tr>
                <th>DATEINAME</th>
                <th>DATEITYP</th>
                <th>UNTERORDNER</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((file) => (
                <tr key={file.relativePath}>
                  <td>
                    <div className="library-filename">
                      <File size={17} />
                      <span title={file.relativePath}>{file.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="small-badge">
                      {file.kind === "grb" ? "GRIB · .grb" : "NetCDF · .nc"}
                    </span>
                  </td>
                  <td>{file.folder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="settings-caption">
        Die Bibliothek zeigt die Dateien am Originalspeicherort. Über „Aktualisieren“ werden neue
        oder entfernte Dateien übernommen.
      </p>
    </section>
  );
}
