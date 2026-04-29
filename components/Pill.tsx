import { cn } from "@/lib/cn";

export type PillTone = "neutral" | "amber" | "bordeaux" | "moss" | "indigo" | "ghost" | "solid";

export function Pill({
  tone = "neutral",
  className,
  children,
  style,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn(
        "pill",
        tone !== "neutral" && tone,
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
