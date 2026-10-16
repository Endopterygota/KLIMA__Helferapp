import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/daten')({
  head: () => ({ meta: [
    { title: 'clima. – Datenbibliothek' },
    { name: 'description', content: 'Referenzdatensätze für Temperatur, Niederschlag und regionale Klimaanalysen.' },
    { property: 'og:title', content: 'clima. – Datenbibliothek' },
    { property: 'og:description', content: 'Referenzdatensätze für Temperatur, Niederschlag und regionale Klimaanalysen.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: () => null,
});
