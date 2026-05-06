"use client";

import { useState } from "react";

import { DashboardView } from "@/components/DashboardView";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGreenGridWorkspace } from "@/hooks/useGreenGridWorkspace";

export default function Home() {
  const workspace = useGreenGridWorkspace();
  const [view, setView] = useState<"onboarding" | "dashboard">("onboarding");

  return (
    <div className="relative mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/12 via-transparent to-transparent"
      />
      <Tabs
        value={view}
        onValueChange={(value) => setView(value as "onboarding" | "dashboard")}
        className="flex flex-col gap-6"
      >
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-full border border-border/80 bg-muted/60 p-1 shadow-inner shadow-md">
          <TabsTrigger
            value="onboarding"
            className="rounded-full data-active:bg-background data-active:shadow-md"
          >
            Guided onboarding
          </TabsTrigger>
          <TabsTrigger
            value="dashboard"
            className="rounded-full data-active:bg-background data-active:shadow-md"
          >
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding" className="mt-0 outline-none">
          <OnboardingFlow
            property={workspace.property}
            zones={workspace.zones}
            plantsCatalog={workspace.plantsCatalog}
            plantings={workspace.plantings}
            designRequest={workspace.designRequest}
            selectedZoneId={workspace.selectedZoneId}
            setSelectedZoneId={workspace.setSelectedZoneId}
            isSubmitting={workspace.isSubmitting}
            statusMessage={workspace.message}
            onCreateProperty={workspace.submitCreateProperty}
            onAddZone={workspace.submitAddZone}
            onSaveBoundary={workspace.submitSaveBoundary}
            onAddPlanting={workspace.submitAddPlanting}
            onGenerateDesign={workspace.submitGenerateDesign}
            onActivatePlan={workspace.activatePlan}
            onCompleted={() => setView("dashboard")}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-0 outline-none">
          <DashboardView
            property={workspace.property}
            zones={workspace.zones}
            plantings={workspace.plantings}
            tasks={workspace.tasks}
            onReopenOnboarding={() => setView("onboarding")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
