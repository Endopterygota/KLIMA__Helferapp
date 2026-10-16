import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'clima. – Klimamodellierung im Blick' },
    { name: 'description', content: 'Klimaszenarien erkunden, regionale Veränderungen vergleichen und Klimaentwicklungen verständlich visualisieren.' },
    { property: 'og:title', content: 'clima. – Klimamodellierung im Blick' },
    { property: 'og:description', content: 'Ihr übersichtlicher Arbeitsbereich für Klimaszenarien und regionale Klimaanalysen.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: () => null,
});
