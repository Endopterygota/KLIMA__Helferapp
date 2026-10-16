export type Scenario = { name: string; region: string; pathway: string; year: number; status: 'Abgeschlossen' | 'Entwurf'; date: string };

export const initialScenarios: Scenario[] = [
  { name: 'Mitteleuropa · Basisszenario', region: 'Mitteleuropa', pathway: 'SSP2-4.5', year: 2100, status: 'Abgeschlossen', date: '16. Okt. 2026' },
  { name: 'Alpenraum · Klimaschutz', region: 'Alpenraum', pathway: 'SSP1-2.6', year: 2100, status: 'Abgeschlossen', date: '15. Okt. 2026' },
  { name: 'Deutschland · Hohe Emissionen', region: 'Deutschland', pathway: 'SSP5-8.5', year: 2050, status: 'Entwurf', date: '14. Okt. 2026' },
];

// Illustrative UI data, not a scientific climate model.
export function demoProjection(pathway: string, year: number) {
  const warming = pathway === 'SSP1-2.6' ? 1.8 : pathway === 'SSP5-8.5' ? 4.4 : 2.7;
  return Number((1.1 + (warming - 1.1) * (year - 2020) / 80).toFixed(1));
}

export function projectionSeries(year: number) {
  return Array.from({ length: Math.floor((year - 2020) / 10) + 1 }, (_, i) => {
    const date = 2020 + i * 10;
    return { year: date, low: demoProjection('SSP1-2.6', date), medium: demoProjection('SSP2-4.5', date), high: demoProjection('SSP5-8.5', date) };
  });
}