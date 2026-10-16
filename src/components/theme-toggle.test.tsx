import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});
it("toggles dark mode and restores the preference on remount", () => {
  localStorage.setItem("clima.theme", "light");
  const view = render(<ThemeToggle />);
  fireEvent.click(screen.getByRole("button", { name: "Dark Mode aktivieren" }));
  expect(document.documentElement).toHaveClass("dark");
  expect(localStorage.getItem("clima.theme")).toBe("dark");
  view.unmount();
  render(<ThemeToggle />);
  expect(screen.getByRole("button", { name: "Light Mode aktivieren" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.click(screen.getByRole("button", { name: "Light Mode aktivieren" }));
  expect(document.documentElement).not.toHaveClass("dark");
});
