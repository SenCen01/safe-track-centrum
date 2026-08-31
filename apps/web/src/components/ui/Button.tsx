"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

// One Button component covers every button in the app — props control
// appearance, so the design stays consistent by construction rather than by
// convention. Pattern adapted from resolve-combat-next (sibling Centrum
// product); see docs/design/centrum-brand.md.

const VARIANTS = {
  primary: "bg-brand text-white hover:bg-brand-dark shadow-sm",
  secondary: "bg-surface text-[--centrum-text] border border-black/10 hover:bg-surface-alt shadow-sm",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  ghost: "text-brand hover:bg-brand/10",
  link: "text-brand hover:underline p-0",
} as const;

const SIZES = {
  xs: "text-xs px-2.5 py-1.5 rounded-lg gap-1",
  sm: "text-sm px-3.5 py-2 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2.5 rounded-xl gap-2",
  lg: "text-base px-5 py-3 rounded-xl gap-2",
  full: "text-sm px-4 py-3 rounded-xl gap-2 w-full justify-center",
} as const;

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconRight,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center font-medium transition-all duration-150
        ${SIZES[size]} ${VARIANTS[variant]}
        disabled:opacity-50 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
        ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
}
