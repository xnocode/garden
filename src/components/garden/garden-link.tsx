"use client";

import { useCallback } from "react";

/**
 * Instant navigation for the single-page garden.
 *
 * Uses the native History API instead of the Next router: the App Router
 * keeps usePathname/useSearchParams in sync with pushState automatically
 * (Next ≥14.1), and no RSC payload is fetched — view switches render in
 * the same frame with zero server round trips.
 */
export function navigate(href: string, options?: { replace?: boolean; scroll?: boolean }) {
  const { replace = false, scroll = true } = options ?? {};
  if (replace) {
    window.history.replaceState({}, "", href);
  } else {
    window.history.pushState({}, "", href);
  }
  if (scroll) window.scrollTo({ top: 0 });
}

/**
 * Renders a real <a> so middle-click, ctrl+click, hover-status, and screen
 * readers behave exactly like a normal link; plain left-clicks navigate
 * instantly via pushState instead.
 */
export function GardenLink({
  href,
  children,
  onClick,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      // Only intercept plain left-clicks on internal path links
      if (
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      if (!href.startsWith("/") || href.startsWith("//")) return;
      e.preventDefault();
      navigate(href);
    },
    [href, onClick]
  );

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
