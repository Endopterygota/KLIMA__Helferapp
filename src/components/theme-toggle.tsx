import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let enabled = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    try {
      const saved = localStorage.getItem("clima.theme");
      if (saved) enabled = saved === "dark";
    } catch {
      /* The toggle still works without storage. */
    }
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);
  function toggle() {
    const enabled = !dark;
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
    try {
      localStorage.setItem("clima.theme", enabled ? "dark" : "light");
    } catch {
      /* Session-only preference. */
    }
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Light Mode aktivieren" : "Dark Mode aktivieren"}
      title={dark ? "Light Mode aktivieren" : "Dark Mode aktivieren"}
      aria-pressed={dark}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
