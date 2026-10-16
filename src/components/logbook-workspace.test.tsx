import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LogbookWorkspace } from "./logbook-workspace";
const snapshot = (text: string, version: string) => ({
  text,
  version,
  path: "C:\\Climate\\logbuch.txt",
  modified: "2026-10-16T10:00:00Z",
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
  delete window.climaDesktop;
});
it("mirrors external changes and protects a dirty draft before an explicit conflict decision", async () => {
  let disk = snapshot("Original", "1");
  const save = vi.fn().mockResolvedValue({ saved: true, snapshot: snapshot("Mein Entwurf", "4") });
  window.climaDesktop = {
    scanDirectory: vi.fn(),
    readLogbook: vi.fn(async () => disk),
    saveLogbook: save,
  };
  vi.useFakeTimers();
  render(<LogbookWorkspace active />);
  const text = screen.getByRole("textbox", { name: "Logbuch bearbeiten" });
  await act(async () => {});
  expect(text).toHaveValue("Original");
  disk = snapshot("Extern aktualisiert", "2");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(text).toHaveValue("Extern aktualisiert");
  fireEvent.change(text, { target: { value: "Mein Entwurf" } });
  disk = snapshot("Nochmals extern geändert", "3");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(text).toHaveValue("Mein Entwurf");
  expect(screen.getByRole("alert")).toHaveTextContent("außerhalb der App geändert");
  expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Eigenen Entwurf statt Dateiversion speichern" }),
    );
  });
  expect(save).toHaveBeenCalledWith(expect.any(String), "Mein Entwurf", "3");
  expect(text).toHaveValue("Mein Entwurf");
});
