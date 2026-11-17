"use client";

import { useEffect, type RefObject } from "react";

const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

const BUTTON_CLASS =
  "copy-code-button absolute right-3 top-3 flex size-8 items-center justify-center rounded-md border border-border/60 bg-background/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:text-foreground";

/** Injects a copy-to-clipboard button into every `<pre>` inside `containerRef` after the sanitized HTML mounts. */
export function CodeCopyEnhancer({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cleanups: (() => void)[] = [];
    const blocks = container.querySelectorAll<HTMLPreElement>("pre");

    blocks.forEach((pre) => {
      if (pre.querySelector(".copy-code-button")) return;

      pre.classList.add("group", "relative");

      const button = document.createElement("button");
      button.type = "button";
      button.className = BUTTON_CLASS;
      button.setAttribute("aria-label", "Copy code");
      button.innerHTML = COPY_ICON;

      const onClick = () => {
        const code = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
        navigator.clipboard.writeText(code);
        button.innerHTML = CHECK_ICON;
        setTimeout(() => {
          button.innerHTML = COPY_ICON;
        }, 1500);
      };

      button.addEventListener("click", onClick);
      pre.appendChild(button);
      cleanups.push(() => button.removeEventListener("click", onClick));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [containerRef]);

  return null;
}
