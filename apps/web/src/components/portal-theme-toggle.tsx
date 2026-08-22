"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function PortalThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const selected = localStorage.getItem("gemjar-portal-theme") === "dark";
    setDark(selected);
    document.documentElement.dataset.portalTheme = selected ? "dark" : "light";
    return () => {
      delete document.documentElement.dataset.portalTheme;
    };
  }, []);
  return (
    <button
      type="button"
      className="icon-link bg-white"
      aria-label={dark ? "Use light portal theme" : "Use dark portal theme"}
      onClick={() => {
        const next = !dark;
        setDark(next);
        localStorage.setItem("gemjar-portal-theme", next ? "dark" : "light");
        document.documentElement.dataset.portalTheme = next ? "dark" : "light";
      }}
    >
      {dark ? <Sun /> : <Moon />}
    </button>
  );
}
