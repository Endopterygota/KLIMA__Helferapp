import { createFileRoute } from '@tanstack/react-router';
import { ClimateWorkspace } from '@/components/climate-workspace';
export const Route = createFileRoute('/szenarien')({
  head: () => ({ meta: [
    { title: 'clima. – Klimaszenarien' },
    { name: 'description', content: 'Klimaszenarien verwalten und Emissionspfade erkunden.' },
    { property: 'og:title', content: 'clima. – Klimaszenarien' },
    { property: 'og:description', content: 'Klimaszenarien verwalten und Emissionspfade erkunden.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: () => <ClimateWorkspace view="scenarios" />,
});
