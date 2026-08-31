import type { ReactNode } from "react";

// A Badge is a small pill communicating status. Centralizing the
// variant→style mapping here means changing one line changes it everywhere.

const VARIANTS = {
  // Shift status
  scheduled: "bg-blue-50 text-blue-700 border border-blue-200",
  in_progress: "bg-green-50 text-green-700 border border-green-200",
  completed: "bg-neutral-100 text-neutral-600 border border-neutral-200",

  // Patrol status
  complete: "bg-green-50 text-green-700 border border-green-200",
  incomplete: "bg-amber-50 text-amber-700 border border-amber-200",

  // Roles
  admin: "bg-purple-50 text-purple-700 border border-purple-200",
  operations_manager: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  guard: "bg-brand/10 text-brand-dark border border-brand/20",

  // Generic
  success: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  neutral: "bg-neutral-100 text-neutral-600 border border-neutral-200",
} as const;

const SIZES = {
  xs: "text-[10px] px-1.5 py-0.5 font-semibold tracking-wide",
  sm: "text-xs px-2 py-0.5 font-medium",
  md: "text-xs px-2.5 py-1 font-medium",
} as const;

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

export function Badge({
  variant = "neutral",
  size = "sm",
  children,
  className = "",
}: {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${SIZES[size]} ${VARIANTS[variant] ?? VARIANTS.neutral} ${className}`}
    >
      {children}
    </span>
  );
}

// Human-readable label for a status/role that already matches a Badge
// variant one-to-one (shift/patrol status, role) — snake_case -> Title Case.
export function statusLabel(value: string): string {
  return value
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}
