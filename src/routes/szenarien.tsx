import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/szenarien')({
  head: () => ({ meta: [
    { title: 'clima. – Utility' },
    { name: 'description', content: 'CDO und ncdump prüfen und GRIB nach NetCDF konvertieren.' },
    { property: 'og:title', content: 'clima. – Utility' },
    { property: 'og:description', content: 'CDO und ncdump prüfen und GRIB nach NetCDF konvertieren.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: () => null,
});
