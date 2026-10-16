import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PlotWorkspace } from "./plot-workspace";
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
it("reads variables from the selected file and displays the image returned by Panoply", async () => {
  const createPlot = vi
    .fn()
    .mockResolvedValue({ image: "data:image/png;base64,aGVsbG8=", variable: "temp2" });
  window.climaDesktop = {
    scanDirectory: vi.fn().mockResolvedValue({
      directory: "C:\\Climate",
      files: { ...emptyCatalog(), nc: ["a.nc"], panoply: ["Panoply.exe"] },
      warnings: [],
    }),
    inspectDataset: vi.fn().mockResolvedValue({
      variables: [
        {
          name: "temp2",
          label: "2m temperature",
          units: "K",
          dimensions: [{ name: "time", length: 481, first: "1960-01-31" }],
        },
      ],
    }),
    createPlot,
  };
  render(<PlotWorkspace />);
  await waitFor(() => expect(screen.getByLabelText("2. Variable")).toHaveValue("temp2"));
  expect(screen.getByText(/time: 1960-01-31/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Create Plot" }));
  expect(await screen.findByRole("img")).toHaveAttribute("src", "data:image/png;base64,aGVsbG8=");
  expect(createPlot).toHaveBeenCalledWith(
    { directory: "C:\\Climate", file: "a.nc", panoply: "Panoply.exe" },
    "temp2",
  );
});
it("does not fabricate variables or a plot when Panoply reports an error", async () => {
  window.climaDesktop = {
    scanDirectory: vi.fn().mockResolvedValue({
      directory: "C:\\Climate",
      files: { ...emptyCatalog(), grb: ["a.grb"], panoply: ["Panoply.exe"] },
      warnings: [],
    }),
    inspectDataset: vi.fn().mockRejectedValue(new Error("Panoply: Datei beschädigt")),
  };
  render(<PlotWorkspace />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Datei beschädigt");
  expect(screen.getByRole("button", { name: "Create Plot" })).toBeDisabled();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
