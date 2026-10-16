import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WorkspaceHealthIndicator } from "./workspace-health";
import { settingsStorageKey } from "@/lib/local-library";
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
afterEach(() => { cleanup(); localStorage.clear(); delete window.climaDesktop; });
it("is red without a saved directory even if a default directory exists", async () => {
  render(<WorkspaceHealthIndicator />);
  const indicator = screen.getByRole("button", { name: "Lokaler Arbeitsbereich: unvollständig" });
  expect(indicator.querySelector(".status-dot")).toHaveClass("health-error");
  fireEvent.click(indicator);
  expect(await screen.findByText("Überordner ist nicht eingestellt und gespeichert.")).toBeInTheDocument();
});
it("becomes green after validation and red again when Panoply is deleted", async () => {
  localStorage.setItem(settingsStorageKey, JSON.stringify({ directory: "C:\\Climate" }));
  const health = vi.fn().mockResolvedValue({ ok: true, issues: [] });
  window.climaDesktop = { scanDirectory: vi.fn(), workspaceHealth: health };
  render(<WorkspaceHealthIndicator />);
  expect((await screen.findByRole("button", { name: "Lokaler Arbeitsbereich: bereit" })).querySelector(".status-dot")).toHaveClass("health-ok");
  health.mockResolvedValue({ ok: false, issues: ["Panoply fehlt."] });
  act(() => window.dispatchEvent(new Event("focus")));
  await waitFor(() => expect(screen.getByRole("button", { name: "Lokaler Arbeitsbereich: unvollständig" })).toHaveAttribute("title", "Panoply fehlt."));
  fireEvent.click(screen.getByRole("button", { name: "Lokaler Arbeitsbereich: unvollständig" }));
  expect(screen.getByText("Panoply fehlt.")).toBeInTheDocument();
});
