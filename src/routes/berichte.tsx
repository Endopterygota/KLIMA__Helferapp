import { createFileRoute } from '@tanstack/react-router';
import { ClimateWorkspace } from '@/components/climate-workspace';
export const Route = createFileRoute('/berichte')({
  head: () => ({ meta: [
    { title: 'clima. – Klimaberichte' },
    { name: 'description', content: 'Klimaszenarien zusammenfassen und als CSV exportieren.' },
    { property: 'og:title', content: 'clima. – Klimaberichte' },
    { property: 'og:description', content: 'Klimaszenarien zusammenfassen und als CSV exportieren.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: () => <ClimateWorkspace view="reports" />,
});
