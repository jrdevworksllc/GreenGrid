"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Planting, Property, Task, Zone } from "@/lib/types";

type DashboardViewProps = {
  property: Property | null;
  zones: Zone[];
  plantings: Planting[];
  tasks: Task[];
  onReopenOnboarding: () => void;
};

export function DashboardView({ property, zones, plantings, tasks, onReopenOnboarding }: DashboardViewProps) {
  return (
    <div className="flex flex-col gap-5">
      <Card className="brand-shell border">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b border-[var(--gg-border)]/80 pb-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--gg-brand-deep)]">GreenGrid dashboard</p>
            <CardTitle className="text-xl tracking-tight sm:text-2xl">
              {property ? property.name : "Yard Workspace"}
            </CardTitle>
            {property && <CardDescription>{property.city}, {property.stateCode}</CardDescription>}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onReopenOnboarding}>
            Reopen onboarding
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Zones" value={zones.length} hint="Defined growing areas" />
        <SummaryCard title="Existing plants" value={plantings.length} hint="Inventory tracked in workspace" />
        <SummaryCard title="Today's tasks" value={tasks.length} hint="Generated from active design" />
      </div>

      <Card className="border shadow-md ring-1 ring-border/55">
        <CardHeader>
          <CardTitle className="text-base">Zone overview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {zones.map((zone) => (
            <div key={zone.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
              <span className="text-sm">
                {zone.name} — {zone.sunLevel}
              </span>
              <Badge variant="outline" className="border-teal-300/80 bg-teal-50 text-teal-900">
                {zone.soilType}
              </Badge>
            </div>
          ))}
          {!zones.length && <p className="text-sm text-muted-foreground">No zones yet.</p>}
        </CardContent>
      </Card>

      <Card className="border shadow-md ring-1 ring-border/55">
        <CardHeader>
          <CardTitle className="text-base">Inventory</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {plantings.slice(0, 6).map((planting) => (
            <div key={planting.id} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <PlantThumb src={planting.imageUrl} alt={planting.commonName} />
                <span className="truncate text-sm">{planting.commonName}</span>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                ×{planting.quantity}
              </Badge>
            </div>
          ))}
          {!plantings.length && (
            <p className="text-sm text-muted-foreground">No inventory yet. Add plants during onboarding.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-md ring-1 ring-border/55">
        <CardHeader>
          <CardTitle className="text-base">Care tasks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start justify-between gap-4 border-b border-border/60 pb-4 last:border-0 last:pb-0">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold">{task.title}</p>
                <p className="text-sm text-muted-foreground">{task.detail}</p>
              </div>
              <Badge className={cn("shrink-0", priorityBadgeClass(task.priority))}>{task.priority}</Badge>
            </div>
          ))}
          {!tasks.length && (
            <p className="text-sm text-muted-foreground">No tasks generated yet. Activate a design option.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <Card className="border shadow-md ring-1 ring-border/55">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function PlantThumb({ src, alt }: { src: string | null | undefined; alt: string }) {
  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote catalog URLs; placeholder fallback */}
      <img
        src={src || "/placeholder-plant.svg"}
        alt={alt}
        width={36}
        height={36}
        className="size-full object-cover"
        onError={(e) => {
          const el = e.currentTarget;
          if (el.src.endsWith("/placeholder-plant.svg")) return;
          el.src = "/placeholder-plant.svg";
        }}
      />
    </div>
  );
}

function priorityBadgeClass(priority: string) {
  const normalized = priority.toLowerCase();
  if (normalized === "high") return "border-destructive/30 bg-destructive/15 text-destructive border";
  if (normalized === "medium") return "border-amber-200 bg-amber-100 text-amber-950 border";
  return "border-primary/25 bg-primary/10 text-primary border";
}
