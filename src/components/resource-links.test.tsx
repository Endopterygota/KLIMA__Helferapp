import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ResourceLinks } from "./resource-links";
import { resourceLinks } from "@/lib/resource-links";
afterEach(cleanup);
it("shows verified HTTPS links and filters them by category and search", () => {
  render(<ResourceLinks />);
  expect(screen.getAllByRole("link")).toHaveLength(resourceLinks.length);
  for (const link of screen.getAllByRole("link")) {
    expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  }
  fireEvent.change(screen.getByLabelText("Link-Kategorie"), { target: { value: "Klimadaten" } });
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.getByRole("link")).toHaveAttribute("href", "https://www.wdc-climate.de/ui/");
  fireEvent.change(screen.getByLabelText("Links suchen"), {
    target: { value: "nichts-passendes" },
  });
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByText("Keine passenden Links")).toBeInTheDocument();
});
