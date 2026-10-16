export const resourceCategories = ["Alle", "Software", "Dokumentation", "Klimadaten"] as const;
export const resourceLinks = [
  {
    title: "Panoply",
    category: "Software",
    description:
      "Klimadaten aus NetCDF und GRIB darstellen. Auf der NASA-Seite finden Sie Downloads für Windows und Linux.",
    url: "https://www.giss.nasa.gov/tools/panoply/",
    source: "PDF · Seite 1",
  },
  {
    title: "CDO – Downloads",
    category: "Software",
    description:
      "Offizielle Dateien und Veröffentlichungen der Climate Data Operators zur Bearbeitung von Klimadaten.",
    url: "https://code.mpimet.mpg.de/projects/cdo/files",
    source: "PDF · Seite 4",
  },
  {
    title: "Java für Panoply",
    category: "Software",
    description:
      "Eclipse Temurin stellt Java für Windows und Linux bereit. Für die hier verwendete Panoply-Version wird Java 11 oder neuer benötigt.",
    url: "https://adoptium.net/temurin/releases/?version=11",
    source: "Ergänzung zur Java-Voraussetzung auf Seite 1",
  },
  {
    title: "CDO – Handbuch",
    category: "Dokumentation",
    description:
      "Befehle, Operatoren und Beispiele. Im Abschnitt Documentation stehen das Handbuch als PDF und eine HTML-Fassung bereit.",
    url: "https://code.mpimet.mpg.de/projects/cdo/wiki/Cdo#Documentation",
    source: "PDF · Seite 3",
  },
  {
    title: "ncdump / NetCDF",
    category: "Dokumentation",
    description:
      "Offizielle Unidata-Dokumentation zum Lesen von NetCDF-Dateien mit ncdump und weiteren Kommandozeilenwerkzeugen.",
    url: "https://docs.unidata.ucar.edu/netcdf-c/current/netcdf_working_with_netcdf_files.html",
    source: "Ergänzende offizielle Quelle zu Seite 7",
  },
  {
    title: "WDCC / CERA – Klimadaten",
    category: "Klimadaten",
    description:
      "Klimadatenarchiv des DKRZ. Die Unterlage behandelt hier das Projekt IPCC_AR4_ECHAM5_MPIOM und die Suche nach Temperaturdaten in 2 m Höhe.",
    url: "https://www.wdc-climate.de/ui/",
    source: "PDF · Seiten 14–17 · aktuelles Ziel des CERA-Links",
  },
] as const;
export function filterResourceLinks(query: string, category: string) {
  const search = query.trim().toLocaleLowerCase("de");
  return resourceLinks.filter(
    (link) =>
      (category === "Alle" || link.category === category) &&
      `${link.title} ${link.description} ${link.category}`.toLocaleLowerCase("de").includes(search),
  );
}
