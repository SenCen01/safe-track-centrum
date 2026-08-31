import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-black/5 bg-surface shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center justify-between gap-4 border-b border-black/5 px-5 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-5 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

// The module-card pattern for dashboard landing pages: an icon in a colored
// badge circle, a label, a one-line description, linking into a section.
export function ModuleCard({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-black/5 bg-surface p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
        {icon}
      </span>
      <div>
        <h3 className="font-semibold text-[--centrum-text]">{label}</h3>
        <p className="mt-0.5 text-sm text-[--centrum-muted]">{description}</p>
      </div>
    </a>
  );
}
