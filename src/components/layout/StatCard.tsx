import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  loading?: boolean;
  accent?: "primary" | "warning" | "muted";
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  loading,
  accent = "primary",
}: StatCardProps) {
  const accentClass = {
    primary: "bg-gradient-primary text-primary-foreground",
    warning: "bg-warning text-warning-foreground",
    muted: "bg-secondary text-secondary-foreground",
  }[accent];

  return (
    <Card className="flex items-center gap-4 p-5 shadow-soft transition-shadow hover:shadow-elegant">
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          accentClass,
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-7 w-24" />
        ) : (
          <p className="truncate font-display text-2xl font-bold text-foreground">{value}</p>
        )}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  );
}
