import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/berichte')({
  head: () => ({ meta: [
    { title: 'clima. – Nützliche Links' },
    { name: 'description', content: 'Software, Handbücher und Klimadaten aus der KLOM-Vorbereitung.' },
    { property: 'og:title', content: 'clima. – Nützliche Links' },
    { property: 'og:description', content: 'Software, Handbücher und Klimadaten aus der KLOM-Vorbereitung.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: () => null,
});
