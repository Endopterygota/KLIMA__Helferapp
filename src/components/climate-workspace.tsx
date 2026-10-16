import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowDownToLine, ArrowRight, Bell, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, CloudRain, Database, FileChartColumn, FlaskConical, Globe2, Layers3, Leaf, MapPin, Menu, MoreHorizontal, Plus, Settings2, SlidersHorizontal, Sparkles, Thermometer, TrendingUp, Waves, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { demoProjection, initialScenarios, projectionSeries, type Scenario } from '@/lib/climate-demo';
import { LogbookWorkspace } from '@/components/logbook-workspace';
import { ResourceLinks } from '@/components/resource-links';
import { UtilityWorkspace } from '@/components/utility-workspace';
import { PlotWorkspace } from '@/components/plot-workspace';
import { ThemeToggle } from '@/components/theme-toggle';
import { DataLibrary } from '@/components/data-library';
import { PathSettings } from '@/components/path-settings';
import regionImage from '@/assets/alpine-region.jpg';

type View = 'overview' | 'scenarios' | 'comparison' | 'data' | 'reports' | 'settings';
const titles: Record<View, string> = { overview: 'Übersicht', scenarios: 'Utility', comparison: 'Logbuch', data: 'Datenbibliothek', reports: 'Nützliche Links', settings: 'Einstellungen' };
const navigation = [
  { to: '/einstellungen' as const, label: 'Einstellungen', icon: Settings2, view: 'settings' },
  { to: '/' as const, label: 'Übersicht', icon: Layers3, view: 'overview' },
  { to: '/szenarien' as const, label: 'Utility', icon: Settings2, view: 'scenarios' },
  { to: '/vergleich' as const, label: 'Logbuch', icon: BookOpen, view: 'comparison' },
  { to: '/daten' as const, label: 'Datenbibliothek', icon: Database, view: 'data' },
  { to: '/berichte' as const, label: 'Links', icon: BookOpen, view: 'reports' },
];

export function ClimateWorkspace({ view = 'overview' }: { view?: View }) {
  const [region, setRegion] = useState('Mitteleuropa');
  const [pathway, setPathway] = useState('SSP2-4.5');
  const [year, setYear] = useState(2100);
  const [resolution, setResolution] = useState('25 km');
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [name, setName] = useState('');
  const [zoom, setZoom] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [selected, setSelected] = useState<Scenario | null>(null);
  const warming = demoProjection(pathway, year);

  function exportData() {
    const csv = '\uFEFFSzenario;Region;Emissionspfad;Jahr;Status\n' + scenarios.map(s => `${s.name};${s.region};${s.pathway};${s.year};${s.status}`).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'clima-szenarien-demo.csv'; anchor.click(); URL.revokeObjectURL(url);
  }
  function runModel() {
    setRunning(true); setResult(false);
    window.setTimeout(() => { setRunning(false); setResult(true); }, 1200);
  }
  function addScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setScenarios(previous => [{ name: name.trim(), region, pathway, year, status: 'Entwurf', date: 'Gerade eben' }, ...previous]);
    setCreateOpen(false); setName('');
  }

  const scenarioTable = <div className="table-wrap"><table className="scenario-table"><thead><tr><th>SZENARIO</th><th>EMISSIONSPFAD</th><th>ZEITHORIZONT</th><th>STATUS</th><th>AKTUALISIERT</th><th aria-label="Aktionen" /></tr></thead><tbody>{scenarios.map((scenario, index) => <tr key={`${scenario.name}-${index}`}><td><div className="scenario-name"><FlaskConical size={16} />{scenario.name}</div></td><td><span className="pathway-badge">{scenario.pathway}</span></td><td>{scenario.year}</td><td><span className={`small-badge ${scenario.status === 'Entwurf' ? 'draft-badge' : ''}`}>{scenario.status === 'Abgeschlossen' && <Check size={10} />}{scenario.status}</span></td><td className="text-muted-foreground">{scenario.date}</td><td><Button size="icon" variant="ghost" title="Szenario öffnen" aria-label={`${scenario.name} öffnen`} onClick={() => setSelected(scenario)}><ArrowRight /></Button></td></tr>)}</tbody></table></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
      <Link to="/" className="brand"><Leaf className="brand-icon" strokeWidth={2.2} /><span>clima<span className="brand-dot">.</span></span></Link>
      <div className="workspace-label">ARBEITSBEREICH</div>
      <nav className="navigation">{navigation.map(item => <Link key={item.to} to={item.to} onClick={() => setMobile(false)} className={`nav-item ${item.view === view ? 'active' : ''}`}><item.icon />{item.label}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="project-box"><div className="project-title"><span className="status-dot" />Klima verstehen.</div><p>Zukunft gestalten.</p><div className="mt-3 flex items-center gap-1 text-[10px] text-primary"><Globe2 size={12} /> Gemeinsam für morgen</div></div><Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => setHelpOpen(true)}><CircleHelp />Hilfe & Ressourcen<ArrowRight className="ml-auto" /></Button><div className="mt-5 flex items-center gap-3 border-t pt-5 px-2"><div className="avatar">LR</div><div><div className="text-[11px] font-semibold">Mein Arbeitsbereich</div><div className="mt-1 text-[9px] text-muted-foreground">Persönliches Projekt</div></div></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><Button className="mobile-menu" variant="ghost" size="icon" aria-label="Menü" onClick={() => setMobile(!mobile)}>{mobile ? <X /> : <Menu />}</Button><span className="text-muted-foreground">Arbeitsbereich</span><ChevronRight size={13} /><span className="font-semibold">{titles[view]}</span></div><div className="topbar-tools"><ThemeToggle /><span className="workspace-name text-[10px] text-muted-foreground flex items-center gap-2"><span className="status-dot" /> Lokaler Arbeitsbereich</span><Button variant="ghost" size="icon" title="Benachrichtigungen" aria-label="Benachrichtigungen" onClick={() => setNotifications(true)}><Bell className="text-muted-foreground" /></Button><div className="h-5 border-l" /><div className="avatar">LR</div></div></header>
      <main className="main-content">
        <div className="page-heading"><div><div className="eyebrow"><Globe2 size={12} /> KLIMAMODELLIERUNG</div><h1>{view === 'overview' ? 'Klimadaten visualisieren.' : titles[view]}</h1><p>{view === 'overview' ? 'Grunddatei wählen, Variable auswählen und mit Panoply einen Plot erstellen.' : view === 'scenarios' ? 'Programme prüfen und Klimadateien in NetCDF konvertieren.' : view === 'comparison' ? 'Ihr Logbuch direkt lesen, bearbeiten und mit der Textdatei synchronisieren.' : view === 'data' ? 'Ihre lokalen GRIB- und NetCDF-Dateien an einem Ort.' : view === 'settings' ? 'Lokale Programme und Klimadateien bequem auswählen.' : 'Software, Handbücher und Klimadaten aus der Vorbereitung.'}</p></div>{view !== 'settings' && view !== 'data' && view !== 'overview' && view !== 'scenarios' && view !== 'comparison' && view !== 'reports' && <div className="heading-actions"><Button variant="outline" onClick={exportData} className="text-[11px] h-9"><ArrowDownToLine size={14} />Exportieren</Button><Button onClick={() => setCreateOpen(true)} className="text-[11px] h-9"><Plus size={14} />Neues Szenario</Button></div>}</div>
        {view === 'settings' && <PathSettings />}
        <div hidden={view !== 'overview'}><PlotWorkspace /></div>
        <div hidden={view !== 'scenarios'}><UtilityWorkspace /></div>
        <div hidden={view !== 'comparison'}><LogbookWorkspace active={view === 'comparison'} /></div>
        {view === 'data' && <DataLibrary />}
        {view === 'reports' && <ResourceLinks />}
        <footer className="footer"><span>clima. · Klimawissen wird Handlung.</span><span>{view === 'overview' || view === 'data' || view === 'scenarios' || view === 'comparison' ? 'Lokale Klimadateien · Panoply' : view === 'reports' ? 'KLOM-Vorbereitung · Offizielle Quellen' : 'Illustrative Demodaten · Keine wissenschaftlichen Prognosen'}</span></footer>
      </main>
    </div>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>Neues Szenario</DialogTitle><DialogDescription>Ein neues Klimaszenario für Ihren Arbeitsbereich.</DialogDescription></DialogHeader><form onSubmit={addScenario}><div className="field"><label htmlFor="scenario-name">Name des Szenarios</label><input autoFocus id="scenario-name" className="select-field" placeholder="z. B. Alpenraum 2050" required value={name} onChange={e => setName(e.target.value)} /></div><div className="field"><label htmlFor="new-region">Region</label><select id="new-region" className="select-field" value={region} onChange={e => setRegion(e.target.value)}>{['Mitteleuropa', 'Deutschland', 'Alpenraum', 'Nordeuropa'].map(r => <option key={r}>{r}</option>)}</select></div><div className="field"><label htmlFor="new-pathway">Emissionspfad</label><select id="new-pathway" className="select-field" value={pathway} onChange={e => setPathway(e.target.value)}>{['SSP1-2.6', 'SSP2-4.5', 'SSP5-8.5'].map(p => <option key={p}>{p}</option>)}</select></div><div className="field"><label htmlFor="new-year">Zeithorizont</label><select id="new-year" className="select-field" value={year} onChange={e => setYear(Number(e.target.value))}>{[2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100].map(y => <option key={y}>{y}</option>)}</select></div><Button type="submit" className="w-full"><Plus />Szenario erstellen</Button><p className="text-[10px] text-muted-foreground mt-3">Demo-Entwurf · Nur während dieser Sitzung verfügbar.</p></form></DialogContent></Dialog>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>{selected?.name}</DialogTitle><DialogDescription>Szenariodetails · Illustrative Beispieldaten</DialogDescription></DialogHeader>{selected && <><dl className="grid grid-cols-2 gap-4 text-sm"><dt className="text-muted-foreground">Region</dt><dd>{selected.region}</dd><dt className="text-muted-foreground">Emissionspfad</dt><dd>{selected.pathway}</dd><dt className="text-muted-foreground">Zeithorizont</dt><dd>{selected.year}</dd><dt className="text-muted-foreground">Status</dt><dd>{selected.status}</dd><dt className="text-muted-foreground">Beispielprojektion</dt><dd>+{demoProjection(selected.pathway, selected.year).toFixed(1).replace('.', ',')} °C</dd></dl><Button onClick={() => { setRegion(selected.region); setPathway(selected.pathway); setYear(selected.year); setSelected(null); }}>Parameter übernehmen<Check /></Button></>}</DialogContent></Dialog>
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent><DialogHeader><DialogTitle>Klima & Ressourcen</DialogTitle><DialogDescription>Wissenschaftliche Grundlagen für Ihre Analysen.</DialogDescription></DialogHeader><p className="text-sm leading-relaxed text-muted-foreground">SSP-Szenarien beschreiben mögliche gesellschaftliche Entwicklungen und Emissionspfade. Die Ergebnisse in diesem Arbeitsbereich sind illustrative Demodaten, keine wissenschaftlichen Prognosen.</p><Button asChild variant="outline"><a href="https://www.ipcc.ch/report/ar6/syr/" target="_blank" rel="noreferrer"><BookOpen />IPCC-Synthesebericht<ArrowRight /></a></Button></DialogContent></Dialog>
    <Dialog open={notifications} onOpenChange={setNotifications}><DialogContent><DialogHeader><DialogTitle>Benachrichtigungen</DialogTitle><DialogDescription>Aktuelles aus Ihrem Arbeitsbereich.</DialogDescription></DialogHeader><div className="flex gap-3 py-4"><Check className="text-primary" size={20} /><div><p className="font-semibold text-sm">Ihr Demo-Arbeitsbereich ist bereit.</p><p className="text-xs text-muted-foreground mt-2">Drei Beispielszenarien stehen zur Verfügung.</p></div></div></DialogContent></Dialog>
  </div>;
}
function Metric({ label, icon: Icon, value, unit, foot }: { label: string; icon: typeof Thermometer; value: string; unit?: string; foot: ReactNode }) {
  return <article className="metric"><div className="metric-label">{label}<Icon /></div><div className="metric-value">{value}{unit && <span> {unit}</span>}</div><div className="metric-foot">{foot}</div></article>;
}

const workspaceViews: Record<string, View> = { '/': 'overview', '/szenarien': 'scenarios', '/vergleich': 'comparison', '/daten': 'data', '/berichte': 'reports', '/einstellungen': 'settings' };
export function WorkspaceRouteShell() {
  const pathname = useRouterState({ select: state => state.location.pathname });
  const view = workspaceViews[pathname.replace(/\/$/, '') || '/'];
  return view ? <ClimateWorkspace view={view} /> : null;
}
