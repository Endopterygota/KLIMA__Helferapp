import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { WorkspaceRouteShell } from "./climate-workspace";
import { emptyCatalog } from "@/lib/path-settings";
afterEach(() => {
  cleanup();
  localStorage.clear();
  delete window.climaDesktop;
});
it("keeps the overview image and selection across actual router navigation", async () => {
  const inspect = vi.fn().mockResolvedValue({
    variables: [{ name: "temp2", label: "2m temperature", units: "K", dimensions: [] }],
  });
  const plot = vi
    .fn()
    .mockResolvedValue({ image: "data:image/png;base64,aGVsbG8=", variable: "temp2" });
  window.climaDesktop = {
    scanDirectory: vi.fn().mockResolvedValue({
      directory: "C:\\Climate",
      files: { ...emptyCatalog(), nc: ["data.nc"], panoply: ["Panoply.exe"], cdo: ["cdo.exe"] },
      warnings: [],
    }),
    inspectDataset: inspect,
    createPlot: plot,
    checkTool: vi
      .fn()
      .mockResolvedValue({ ok: true, output: "CDO version 1.6.4", exitCode: 0, command: "cdo -V" }),
  };
  const root = createRootRoute({ component: WorkspaceRouteShell });
  const routes = ["/", "/szenarien", "/daten", "/einstellungen"].map((path) =>
    createRoute({ getParentRoute: () => root, path, component: () => null }),
  );
  const router = createRouter({
    routeTree: root.addChildren(routes),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(screen.getByLabelText("2. Variable")).toHaveValue("temp2"));
  fireEvent.click(screen.getByRole("button", { name: "Create Plot" }));
  const image = await screen.findByRole("img");
  fireEvent.click(screen.getByRole("link", { name: "Utility" }));
  await screen.findByRole("heading", { name: "Programme prüfen" });
  fireEvent.click(screen.getByRole("button", { name: "cdo prüfen" }));
  expect(await screen.findByText("cdo funktioniert")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Übersicht" }));
  await waitFor(() => expect(screen.getByRole("img")).toBe(image));
  expect(screen.getByLabelText("2. Variable")).toHaveValue("temp2");
  expect(inspect).toHaveBeenCalledTimes(1);
  expect(plot).toHaveBeenCalledTimes(1);
});
