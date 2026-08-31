import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Label({ className = "", children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`flex flex-col gap-1 text-sm font-medium text-[--centrum-text] ${className}`} {...props}>
      {children}
    </label>
  );
}

const fieldClass =
  "rounded-lg border border-black/10 bg-surface px-3 py-2 text-sm text-[--centrum-text] shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={`${fieldClass} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="w-full text-sm text-red-600">
      {children}
    </p>
  );
}
