# KLÖM Helferapp

Eine lokale Desktop-App für die Arbeit mit Klimadaten in GRIB- und NetCDF-Dateien. Die Oberfläche basiert auf React und TypeScript; Electron verbindet sie mit lokalen Dateien, CDO, ncdump und Panoply.

## Funktionen

- **Einstellungen:** Einen Überordner wählen und Programme sowie Datendateien über gefilterte Dropdowns zuordnen. Einzelne passende Optionen werden automatisch ausgewählt.
- **Übersicht:** Eine GRIB-/NetCDF-Datei und eine darstellbare Variable wählen und einen geografischen 2D-Plot direkt in der App anzeigen. Die Vorschau verwendet tatsächliche Dateidaten; standardmäßig den ersten Zeit- und Höhenindex, ohne zeitliche Mittelung.
- **Datenbibliothek:** GRIB- und NetCDF-Dateien übersichtlich nach Format durchsuchen.
- **Utility:** CDO und ncdump prüfen sowie GRIB-Dateien mit CDO in NetCDF konvertieren. Vorhandene Zieldateien werden nicht überschrieben.
- **Logbuch:** `logbuch.txt` automatisch im gewählten Überordner oder seinen Unterordnern erkennen, bearbeiten und speichern. Groß-/Kleinschreibung spielt bei der Suche keine Rolle. Eine Datei direkt im Überordner hat Vorrang; mehrere Treffer in Unterordnern erfordern die Auswahl eines genaueren Überordners.
- **Links und Quicksetup:** Offizielle Download- und Dokumentationsseiten sowie automatische Einrichtung eines lokalen Arbeitsordners samt Werkzeugen und Testdaten.
- **Dark Mode:** Persistente Darstellung und Einstellungen. Ein Tabwechsel erhält die laufende Übersicht und ihre Vorschau.
- **Statusanzeige:** Der Punkt bei „Lokaler Arbeitsbereich“ wird nur grün, wenn ein gespeicherter, lesbarer Überordner, die ausgewählten Programmpfade (einschließlich Panoply.jar), eine ausführbare Java-Laufzeit ab Version 11 und mindestens eine GRIB-/NetCDF-Datei vorhanden sind. Fehlende Bestandteile werden rot signalisiert und lassen sich per Klick anzeigen. Die Prüfung läuft nach Einstellungsänderungen, beim Fensterfokus und alle zehn Sekunden. Die Ausführung von CDO und ncdump kann zusätzlich unter Utility getestet werden.

## Desktop-App verwenden

1. Die Windows-App starten und unter **Einstellungen** den Ordner mit den Klimadaten und Werkzeugen wählen.
2. CDO, ncdump und Panoply zuordnen. Für Panoply wird zusätzlich eine passende Java-Laufzeit benötigt; der Adapter wird für Java 11 kompiliert.
3. In der Übersicht eine Grunddatei und Variable wählen und **Create Plot** starten.
4. Für das Logbuch eine vorhandene `logbuch.txt` in das gewählte Ordnerverzeichnis legen. Quicksetup legt bei Bedarf ein neues Logbuch an.

Das aktive Logbuch wird alle zwei Sekunden auf externe Änderungen geprüft. Ungespeicherte Entwürfe werden bei Konflikten nicht still überschrieben. Beim ersten Speichern entsteht eine Sicherung neben der Originaldatei (`.bak`); gespeichert wird als UTF-8 mit BOM. Die Größe ist auf 2 MB begrenzt.

Die Werkzeuge, Panoply, Java und Klimadaten werden nicht mit der App ausgeliefert. Einstellungen bleiben lokal auf dem jeweiligen Rechner.

### Quicksetup

Unter **Links → Quicksetup** den Arbeitsordner wählen und **Quicksetup starten** anklicken. Standard ist `Dokumente/KLOM`; der Ordner wird automatisch angelegt. Das Setup lädt Java 11 (Temurin), Panoply 5.10.2, die Windows-Kursversion CDO 1.6.4, NetCDF/ncdump 4.10.1, das CDO-Handbuch und eine öffentliche NetCDF-Beispieldatei von Unidata. Es erzeugt zusätzlich ein GRIB-Temperaturbeispiel aus diesen Daten und prüft Java, CDO sowie ncdump.

Die Programme werden lokal entpackt; systemweite Installation und Administratorrechte sind nicht erforderlich. `Programme`, `Daten` und `Dokumentation` trennen die Inhalte. Die App nutzt die lokale Java-Laufzeit automatisch. Pfade werden nach Abschluss in die Einstellungen übernommen. Vorhandene Dateien bleiben erhalten.

Softwarepakete werden anhand festgelegter SHA-256-Prüfsummen geprüft. Downloads haben bis zu zwei Stunden Zeit und werden bei Fehlern bis zu dreimal versucht. Unvollständige Downloads bleiben unter `.quicksetup/downloads` und werden beim nächsten Start per HTTP Range fortgesetzt, sofern der Server das unterstützt. Ein Abbruch ist möglich; beim Tabwechsel läuft das Setup weiter. Fehler einzelner Komponenten werden als Hinweise angezeigt und können durch erneuten Start behoben werden.

Die PDF nennt keine öffentliche URL für `EH5_OM_20C3M_1_YM_TEMP2_Test.txt`; der ECHAM5-Datenbezug verlangt ein eigenes WDCC-Konto. Zugangsdaten aus Unterrichtsmaterialien werden nicht verwendet oder gespeichert. Optional kopiert das Setup vorhandene GRIB-/NetCDF-Dateien und die Excel-Testdatei aus dem bisher eingestellten Ordner. Das öffentliche NetCDF-Beispiel ersetzt die ursprünglichen Kursdateien nicht. Excel selbst wird nicht installiert.

## Entwicklung

Voraussetzungen: eine aktuelle Node.js-Version, pnpm und für den Desktop-Build ein JDK mit `javac` sowie die Panoply-JAR-Dateien.

```sh
pnpm install
pnpm dev
```

Der Browser zeigt die Oberfläche; Desktop-Funktionen wie Plot-Erzeugung, Werkzeugaufrufe und Logbuchbearbeitung benötigen Electron.

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

## Windows-EXE bauen

In PowerShell den Pfad zur eigenen Panoply-Installation setzen:

```powershell
$env:KLOEM_PANOPLY_JARS = 'C:\Programme\Panoply\jars'
pnpm desktop:build
```

Das Ergebnis liegt unter `release/KLOEM-Helferapp.exe` und ist eine portable Windows-x64-Anwendung. Der Build benötigt Zugriff auf die Paket- und Electron-Downloads. Generierte Builds und lokale Testartefakte gehören nicht ins Git-Repository.

## Linux

Panoply 5.10.2 ist laut [NASA-Downloadseite](https://www.giss.nasa.gov/tools/panoply/download/) auch für Windows verfügbar und benötigt Java 11 oder neuer. Linux ist dafür nicht erforderlich.

Für Linux-Werkzeuge unter Windows bietet Microsoft [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) an. Windows bleibt das gestartete Betriebssystem; eine Linux-Distribution wie Ubuntu läuft zusätzlich darin. Ein Einrichtungsassistent könnte die WSL-/Ubuntu-Installation und anschließend Linux-Pakete vorbereiten. Administratorfreigabe, ein möglicher Neustart und die erste Benutzerkonfiguration sind dabei separate Schritte. Der bestehende Quicksetup-Button installiert Windows-Werkzeuge und richtet kein WSL ein. Die App enthält bislang keine Anbindung an Linux-CDO über `wsl.exe`.

Der aktuelle Paketierungsweg erstellt ausschließlich eine Windows-EXE. Diese ist kein natives Linux-Paket. Für Linux kann dieselbe Codebasis weiterverwendet werden; erforderlich sind Linux-Ziele im Electron-Build (z. B. AppImage oder deb), die Erkennung von Programmen ohne `.exe`, eine angepasste Java-/Panoply-Suche und Tests der Datei- und Prozessfunktionen unter Linux. Dort werden native Versionen von CDO, ncdump, Java und Panoply benötigt. Ein Linux-Build ist bislang nicht umgesetzt oder geprüft.

## Projektstruktur

- `src/components/`: Oberfläche und Arbeitsbereiche
- `src/lib/`: Dateiauswahl, Typen und Linksammlung
- `desktop/`: Electron, lokale Werkzeuge und Logbuchzugriff
- `desktop/java/ClimatePlot.java`: Panoply-Adapter

Die ursprüngliche Oberfläche stammt aus [climate-sight-maker](https://github.com/Endopterygota/climate-sight-maker). Die lokalen Desktop-Funktionen werden in diesem Repository weiterentwickelt. Eine eigene Lizenz ist derzeit nicht festgelegt; Rechte an eingebundenen Abhängigkeiten verbleiben bei deren jeweiligen Urhebern.
