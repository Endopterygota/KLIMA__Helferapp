import { useState } from "react";
import { ExternalLink, Search, BookOpen } from "lucide-react";
import { filterResourceLinks, resourceCategories, resourceLinks } from "@/lib/resource-links";
import { QuickSetupPanel } from "./quick-setup";
export function ResourceLinks() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Alle");
  const links = filterResourceLinks(query, category);
  return (
    <section className="panel resource-panel" aria-label="Nützliche Links">
      <div className="library-heading">
        <div>
          <h2>
            <BookOpen size={19} />
            Downloads, Handbücher & Klimadaten
          </h2>
          <p>
            Auf Grundlage der KLOM-Vorbereitung für das Wintersemester 2020/21, ergänzt um
            offizielle Quellen.
          </p>
        </div>
      </div>
      <QuickSetupPanel />
      <div className="library-toolbar">
        <label className="library-search">
          <Search size={16} />
          <span className="sr-only">Links suchen</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nach Panoply, CDO oder Klimadaten suchen …"
          />
        </label>
        <label>
          <span className="sr-only">Link-Kategorie</span>
          <select
            className="select-field"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {resourceCategories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <p role="status" className="library-status">
        {links.length} von {resourceLinks.length} Links · Öffnen im Standardbrowser
      </p>
      <div className="resource-grid">
        {links.map((link) => (
          <a
            className="resource-card"
            href={link.url}
            target="_blank"
            rel="noreferrer"
            key={link.url}
          >
            <div className="resource-card-heading">
              <span className="small-badge">{link.category}</span>
              <ExternalLink size={16} aria-hidden="true" />
            </div>
            <h3>{link.title}</h3>
            <p>{link.description}</p>
            <span className="resource-host">{new URL(link.url).hostname}</span>
            <small>{link.source}</small>
          </a>
        ))}
      </div>
      {!links.length && (
        <div className="library-empty">
          <h3>Keine passenden Links</h3>
          <p>Ändern Sie den Suchbegriff oder die Kategorie.</p>
        </div>
      )}
      <p className="settings-caption">
        Die Unterlage nennt ältere Softwareversionen. Die Links führen zu den offiziellen
        Projektseiten. Für die Excel-Testdatei und die damalige ncdump-Quelle im Kurs-Intranet
        enthält die PDF keinen öffentlichen Download-Link.
      </p>
    </section>
  );
}
