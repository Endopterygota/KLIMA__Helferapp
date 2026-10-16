import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DataLibrary } from "./data-library";
import { emptyCatalog } from "@/lib/path-settings";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
  delete window.climaDesktop;
});
it("loads the saved folder, filters file types and updates after rescanning", async () => {
  localStorage.setItem("clima.path-settings.v1", JSON.stringify({ directory: "C:\\Climate" }));
  const scan = vi
    .fn()
    .mockResolvedValueOnce({
      directory: "C:\\Climate",
      files: { ...emptyCatalog(), grb: ["data.grb"], nc: ["nested/data.nc"] },
      warnings: [],
    })
    .mockResolvedValueOnce({ directory: "C:\\Climate", files: emptyCatalog(), warnings: [] });
  window.climaDesktop = { scanDirectory: scan };
  render(<DataLibrary />);
  expect(await screen.findByText("data.grb")).toBeInTheDocument();
  expect(scan).toHaveBeenCalledWith("C:\\Climate");
  fireEvent.change(screen.getByLabelText("Dateityp"), { target: { value: "nc" } });
  expect(screen.queryByText("data.grb")).not.toBeInTheDocument();
  expect(screen.getByText("data.nc")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Dateien suchen"), { target: { value: "missing" } });
  expect(screen.getByText("Keine passenden Dateien")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Aktualisieren" }));
  expect(await screen.findByText("Noch keine Klimadateien gefunden")).toBeInTheDocument();
});
it("reports inaccessible folders instead of showing stale data", async () => {
  window.climaDesktop = { scanDirectory: vi.fn().mockRejectedValue(new Error("Ordner fehlt")) };
  render(<DataLibrary />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Ordner fehlt");
});
