import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/einstellungen")({
  head: () => ({ meta: [{ title: "clima. – Einstellungen" }] }),
  component: () => null,
});
