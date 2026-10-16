import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QuickSetupPanel } from "./quick-setup";
import type { SetupState } from "@/lib/quick-setup-types";
import { emptySelection } from "@/lib/path-settings";
import { settingsStorageKey } from "@/lib/local-library";
afterEach(() => { cleanup(); delete window.climaDesktop; localStorage.clear(); });
it("starts setup, shows progress and saves the resulting working directory", async () => {
  let progress: (value: SetupState) => void = () => {};
  const initial = { running: false, directory: "", message: "Bereit", completed: [], warnings: [], defaultDirectory: "C:\\KLOM" };
  const start = vi.fn().mockResolvedValue({ ...initial, running: true, message: "Java herunterladen …" });
  window.climaDesktop = {
    scanDirectory: vi.fn(), startSetup: start, setupStatus: vi.fn().mockResolvedValue(initial),
    onSetupProgress: (callback) => { progress = callback; return vi.fn(); },
  };
  render(<QuickSetupPanel />);
  await waitFor(() => expect(screen.getByLabelText("Neuer Arbeitsordner")).toHaveValue("C:\\KLOM"));
  fireEvent.click(screen.getByRole("button", { name: "Quicksetup starten" }));
  await screen.findByText("Java herunterladen …");
  expect(start).toHaveBeenCalledWith(expect.objectContaining({ directory: "C:\\KLOM" }));
  act(() => progress({ ...initial, running: true, message: "Laden", received: 1048576, total: 2097152 }));
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1048576");
  act(() => progress({ ...initial, result: { directory: "C:\\KLOM", selection: emptySelection() }, message: "Quicksetup abgeschlossen." }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem(settingsStorageKey)!)).toHaveProperty("directory", "C:\\KLOM"));
});
