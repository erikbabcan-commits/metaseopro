// src/theme/tokens.ts
// Utility re‑exports for Tailwind token class names. Used when building class strings programmatically.
export const colors = {
  surface: "bg-surface",
  surfacePure: "bg-surface-pure",
  primary: "bg-primary",
  primaryContainer: "bg-primary-container",
  onPrimary: "text-on-primary",
  onSurface: "text-on-surface",
  onSurfaceVariant: "text-on-surface-variant",
  borderSubtle: "border-border-subtle",
  borderDefault: "border-border-default",
  googleBlue: "bg-google-blue-bright",
  googleGreen: "bg-google-green",
  googleYellow: "bg-google-yellow",
  googleRed: "bg-google-red",
  // add more as needed
} as const;

export const typography = {
  display: "text-display",
  displayMobile: "text-display-mobile",
  headlineLg: "text-headline-lg",
  headlineLgMobile: "text-headline-lg-mobile",
  bodyMd: "text-body-md",
  // ...etc.
} as const;

export const spacing = {
  gutter: "space-gutter",
  margin: "space-margin",
  // ...etc.
} as const;

export const radius = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
} as const;

export const shadow = {
  level1: "shadow-level-1",
  level2: "shadow-level-2",
  level3: "shadow-level-3",
} as const;
