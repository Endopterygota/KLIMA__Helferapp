import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PathSettings } from "./path-settings";
import { defaultDirectory, emptyCatalog } from "@/lib/path-settings";
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  delete window.climaDesktop;
});
it("scans the default folder, selects unique files and restores saved settings", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        directory: defaultDirectory,
        files: { ...emptyCatalog(), cdo: ["cdo.exe"], nc: ["a.nc", "b.nc"] },
        warnings: [],
      }),
    }),
  );
  const view = render(<PathSettings />);
  fireEvent.click(screen.getByRole("button", { name: "Ordner durchsuchen" }));
  await waitFor(() => expect(screen.getByLabelText(/CDO/)).toHaveValue("cdo.exe"));
  expect(screen.getByLabelText(/NetCDF-Datei/)).toHaveValue("");
  fireEvent.change(screen.getByLabelText(/NetCDF-Datei/), { target: { value: "b.nc" } });
  fireEvent.click(screen.getByRole("button", { name: "Einstellungen speichern" }));
  expect(JSON.parse(localStorage.getItem("clima.path-settings.v1")!).selection.nc).toBe("b.nc");
  view.unmount();
  render(<PathSettings />);
  expect(screen.getByLabelText("Überordner")).toHaveValue(defaultDirectory);
  expect(screen.getByRole("button", { name: "Einstellungen speichern" })).toBeDisabled();
});
it("displays a useful error when the local endpoint is unavailable", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ headers: new Headers({ "content-type": "text/html" }) }),
  );
  render(<PathSettings />);
  fireEvent.click(screen.getByRole("button", { name: "Ordner durchsuchen" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("lokal gestartete App");
});
it("uses the desktop bridge without a development server", async () => {
  window.climaDesktop = {
    scanDirectory: vi.fn().mockResolvedValue({
      directory: defaultDirectory,
      files: { ...emptyCatalog(), cdo: ["cdo.exe"] },
      warnings: [],
    }),
  };
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  render(<PathSettings />);
  fireEvent.click(screen.getByRole("button", { name: "Ordner durchsuchen" }));
  await waitFor(() => expect(screen.getByLabelText(/CDO/)).toHaveValue("cdo.exe"));
  expect(window.climaDesktop.scanDirectory).toHaveBeenCalledWith(defaultDirectory);
  expect(request).not.toHaveBeenCalled();
});
