import { FileText } from "lucide-react";

const COLORS = ["bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-cyan-600"];

function colorFor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Round initials badge with a stable colour per user. */
export function Avatar({ id, name, size = "md" }: { id: string; name: string; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-sm", lg: "h-11 w-11 text-base" }[size];
  return (
    <span
      title={name}
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-white ${dims} ${colorFor(id)}`}
    >
      {initials(name)}
    </span>
  );
}

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow-sm ${className}`}>
      <FileText className="h-1/2 w-1/2" strokeWidth={2.25} />
    </span>
  );
}
