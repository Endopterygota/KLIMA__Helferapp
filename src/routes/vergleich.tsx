import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/vergleich')({
  head: () => ({ meta: [
    { title: 'clima. – Logbuch' },
    { name: 'description', content: 'Drei Emissionsszenarien und ihre Beispielprojektionen direkt vergleichen.' },
    { property: 'og:title', content: 'clima. – Logbuch' },
    { property: 'og:description', content: 'Drei Emissionsszenarien und ihre Beispielprojektionen direkt vergleichen.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: () => null,
});
