import { createFileRoute } from '@tanstack/react-router';
import { ClimateWorkspace } from '@/components/climate-workspace';
export const Route = createFileRoute('/vergleich')({
  head: () => ({ meta: [
    { title: 'clima. – Szenariovergleich' },
    { name: 'description', content: 'Drei Emissionsszenarien und ihre Beispielprojektionen direkt vergleichen.' },
    { property: 'og:title', content: 'clima. – Szenariovergleich' },
    { property: 'og:description', content: 'Drei Emissionsszenarien und ihre Beispielprojektionen direkt vergleichen.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: () => <ClimateWorkspace view="comparison" />,
});
