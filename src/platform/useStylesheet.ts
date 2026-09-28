import { useEffect } from "react";

/**
 * Loads `href` once and reference-counts it, so two tools can share a host
 * stylesheet and a theme remount does not drop it early.
 */
export function useStylesheet(href: string | undefined) {
  useEffect(() => {
    const url = href?.trim();
    if (!url || typeof document === "undefined") return;
    const id = `platform-tool-css:${url}`;
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
    link.dataset.users = String(Number(link.dataset.users || "0") + 1);
    return () => {
      const current = document.getElementById(id) as HTMLLinkElement | null;
      if (!current) return;
      const next = Number(current.dataset.users || "1") - 1;
      if (next <= 0) current.remove();
      else current.dataset.users = String(next);
    };
  }, [href]);
}
