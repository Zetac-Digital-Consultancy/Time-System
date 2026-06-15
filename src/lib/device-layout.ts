/**
 * Device breakpoints (Tailwind):
 * - Mobile:        < 768px   (default, max-md:)
 * - Tablet:        768–1023px (md: to lg:-)
 * - Small laptop:  1024–1279px (lg: to xl:-)
 * - Laptop:        1280–1727px (xl: to 2xl:-) — MacBook Air/Pro, standard laptops
 * - Large desktop: ≥ 1728px  (2xl:)
 */
export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
  laptop: 1280,
  largeDesktop: 1728,
} as const;

/** Sidebar widths per tier (must match globals.css + sidebar.tsx) */
export const SIDEBAR_WIDTH = {
  tablet: "16rem",
  tabletCompact: "4.5rem",
  smallLaptop: "15rem",
  laptop: "13.5rem",
  largeDesktop: "16rem",
} as const;
