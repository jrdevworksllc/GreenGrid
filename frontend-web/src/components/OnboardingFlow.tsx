"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { PropertyMapEditor } from "@/components/PropertyMapEditor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { suggestZonesFromBoundary, type ZoneSuggestion } from "@/lib/zoneSuggestions";
import { cn } from "@/lib/utils";
import type { DesignRequest, Plant, Planting, Property, Zone } from "@/lib/types";

type OnboardingFlowProps = {
  property: Property | null;
  zones: Zone[];
  plantsCatalog: Plant[];
  plantings: Planting[];
  designRequest: DesignRequest | null;
  selectedZoneId: string;
  setSelectedZoneId: (value: string) => void;
  isSubmitting: boolean;
  statusMessage: string;
  onCreateProperty: (formData: FormData) => Promise<boolean>;
  onAddZone: (formData: FormData) => Promise<boolean>;
  onSaveBoundary: (formData: FormData) => Promise<boolean>;
  onAddPlanting: (formData: FormData) => Promise<boolean>;
  onGenerateDesign: (formData: FormData) => Promise<boolean>;
  onActivatePlan: (outputId: string) => Promise<boolean>;
  onCompleted: () => void;
};

const steps = [
  "Welcome",
  "Property basics",
  "Map and zones",
  "Existing plants",
  "Photos and prompt",
  "Review and activate",
] as const;

const stepDescriptions = [
  "Goal alignment",
  "Address and profile",
  "Boundary and conditions",
  "Current inventory",
  "Generate concepts",
  "Apply plan and continue",
] as const;

const WHOLE_PROPERTY = "__whole_property__";
const MARION_EXAMPLE = {
  name: "Roosevelt Residence",
  city: "Marion",
  addressLine: "810 S. Roosevelt St.",
  postalCode: "66861",
};

export function OnboardingFlow(props: OnboardingFlowProps) {
  const {
    property,
    zones,
    plantsCatalog,
    plantings,
    designRequest,
    selectedZoneId,
    setSelectedZoneId,
    isSubmitting,
    statusMessage,
    onCreateProperty,
    onAddZone,
    onSaveBoundary,
    onAddPlanting,
    onGenerateDesign,
    onActivatePlan,
    onCompleted,
  } = props;

  const [activeStep, setActiveStep] = useState(0);
  const [selectedOutputId, setSelectedOutputId] = useState("");
  const [boundaryPolygonJson, setBoundaryPolygonJson] = useState("");
  const [zoneDraftPolygonJson, setZoneDraftPolygonJson] = useState("");
  const [suggestedZones, setSuggestedZones] = useState<ZoneSuggestion[]>([]);
  const [acceptedSuggestionIds, setAcceptedSuggestionIds] = useState<string[]>([]);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string>("");
  const [suggestionError, setSuggestionError] = useState("");
  const [isApplyingSuggestions, setIsApplyingSuggestions] = useState(false);
  const [error, setError] = useState("");
  const [sunLevel, setSunLevel] = useState("full-sun");
  const [designZoneScope, setDesignZoneScope] = useState(WHOLE_PROPERTY);
  const [plantSearch, setPlantSearch] = useState("");
  const [plantCatalogId, setPlantCatalogId] = useState("");
  const [plantingInlineError, setPlantingInlineError] = useState("");
  const [propertyName, setPropertyName] = useState(MARION_EXAMPLE.name);
  const [propertyCity, setPropertyCity] = useState(MARION_EXAMPLE.city);
  const [propertyAddress, setPropertyAddress] = useState(MARION_EXAMPLE.addressLine);
  const [propertyPostalCode, setPropertyPostalCode] = useState(MARION_EXAMPLE.postalCode);
  const [maintenancePreference, setMaintenancePreference] = useState("low");
  const [budgetBand, setBudgetBand] = useState("mid");
  const [colorMood, setColorMood] = useState("native-warm");
  const [renderPerspective, setRenderPerspective] = useState("both");
  const [photoPreviews, setPhotoPreviews] = useState<Array<{ name: string; url: string }>>([]);

  const zonePointCount = useMemo(() => {
    try {
      const parsed = JSON.parse(zoneDraftPolygonJson) as unknown;
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }, [zoneDraftPolygonJson]);
  const completionPercent = useMemo(() => ((activeStep + 1) / steps.length) * 100, [activeStep]);
  const hasBoundary = boundaryPolygonJson.trim().length > 0;
  const activeSuggestion = useMemo(
    () => suggestedZones.find((suggestion) => suggestion.id === activeSuggestionId) ?? null,
    [activeSuggestionId, suggestedZones],
  );

  const filteredPlants = useMemo(() => {
    const q = plantSearch.trim().toLowerCase();
    const matches = !q
      ? plantsCatalog
      : plantsCatalog.filter(
      (p) =>
        p.commonName.toLowerCase().includes(q) || (p.scientificName && p.scientificName.toLowerCase().includes(q)),
    );
    if (!plantCatalogId) return matches;
    const selectedPlant = plantsCatalog.find((plant) => plant.id === plantCatalogId);
    if (!selectedPlant || matches.some((plant) => plant.id === selectedPlant.id)) return matches;
    return [selectedPlant, ...matches];
  }, [plantsCatalog, plantCatalogId, plantSearch]);

  const selectedPlantLabel = useMemo(() => {
    const selectedPlant = plantsCatalog.find((plant) => plant.id === plantCatalogId);
    return selectedPlant ? getPlantOptionLabel(selectedPlant) : "";
  }, [plantCatalogId, plantsCatalog]);

  async function runSubmit(event: FormEvent<HTMLFormElement>, submitter: (formData: FormData) => Promise<boolean>) {
    event.preventDefault();
    setError("");
    try {
      const ok = await submitter(new FormData(event.currentTarget));
      if (ok) setActiveStep((value) => Math.min(value + 1, steps.length - 1));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please retry.");
    }
  }

  async function runSubmitNoAdvance(
    event: FormEvent<HTMLFormElement>,
    submitter: (formData: FormData) => Promise<boolean>,
  ) {
    event.preventDefault();
    setError("");
    try {
      await submitter(new FormData(event.currentTarget));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please retry.");
    }
  }

  async function runPlantingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlantingInlineError("");
    if (!selectedZoneId) {
      setPlantingInlineError("Select a zone in Step 3 before adding a plant.");
      return;
    }
    if (!plantCatalogId) {
      setPlantingInlineError("Choose a plant from the catalog.");
      return;
    }
    const quantityRaw = String(new FormData(event.currentTarget).get("quantity") ?? "");
    if (!Number.isFinite(Number(quantityRaw)) || Number(quantityRaw) < 1) {
      setPlantingInlineError("Quantity must be at least 1.");
      return;
    }
    await runSubmit(event, onAddPlanting);
  }

  async function runDesignSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const formData = new FormData(event.currentTarget);
      const basePrompt = String(formData.get("prompt") ?? "").trim();
      const enrichedPrompt = [
        basePrompt,
        `Preferences: maintenance=${maintenancePreference}, budget=${budgetBand}, color mood=${colorMood}.`,
        "Deliverables: include a practical implementation sequence and planting rationale.",
      ]
        .filter(Boolean)
        .join("\n\n");
      formData.set("prompt", enrichedPrompt);
      formData.set("style", `${String(formData.get("style") || "modern-natural")}--${renderPerspective}`);
      const ok = await onGenerateDesign(formData);
      if (ok) setActiveStep((value) => Math.min(value + 1, steps.length - 1));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please retry.");
    }
  }

  useEffect(() => {
    return () => {
      photoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [photoPreviews]);

  function handlePhotoChange(files: FileList | null) {
    photoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    if (!files || files.length === 0) {
      setPhotoPreviews([]);
      return;
    }
    const previews = Array.from(files)
      .filter((file) => file.size > 0)
      .slice(0, 6)
      .map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      }));
    setPhotoPreviews(previews);
  }

  function handleSuggestZones() {
    setSuggestionError("");
    const suggestions = suggestZonesFromBoundary(boundaryPolygonJson);
    if (!suggestions.length) {
      setSuggestedZones([]);
      setActiveSuggestionId("");
      setZoneDraftPolygonJson("");
      setSuggestionError(
        "We could not create confident draft zones from this boundary. You can refine the boundary or draw zones manually.",
      );
      return;
    }
    setSuggestedZones(suggestions);
    setAcceptedSuggestionIds([]);
    setActiveSuggestionId(suggestions[0].id);
    setZoneDraftPolygonJson(suggestions[0].polygonJson);
  }

  function handleEditSuggestion(suggestionId: string) {
    const suggestion = suggestedZones.find((row) => row.id === suggestionId);
    if (!suggestion) return;
    setActiveSuggestionId(suggestionId);
    setZoneDraftPolygonJson(suggestion.polygonJson);
  }

  function handleApplyEditedGeometry() {
    if (!activeSuggestionId || !zoneDraftPolygonJson) return;
    setSuggestedZones((current) =>
      current.map((row) => (row.id === activeSuggestionId ? { ...row, polygonJson: zoneDraftPolygonJson } : row)),
    );
  }

  function handleDiscardSuggestion(suggestionId: string) {
    setSuggestedZones((current) => current.filter((row) => row.id !== suggestionId));
    setAcceptedSuggestionIds((current) => current.filter((id) => id !== suggestionId));
    if (activeSuggestionId === suggestionId) {
      setActiveSuggestionId("");
      setZoneDraftPolygonJson("");
    }
  }

  async function acceptSuggestion(suggestion: ZoneSuggestion) {
    if (!property) return false;
    setIsApplyingSuggestions(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("zoneName", suggestion.name);
      formData.set("sunLevel", suggestion.sunLevel);
      formData.set("soilType", suggestion.soilType);
      formData.set("irrigationType", suggestion.irrigationType);
      formData.set("slope", suggestion.slope);
      formData.set("notes", suggestion.notes);
      formData.set("polygonJson", suggestion.polygonJson);
      const ok = await onAddZone(formData);
      if (ok) {
        setAcceptedSuggestionIds((current) => (current.includes(suggestion.id) ? current : [...current, suggestion.id]));
      }
      return ok;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save suggested zone.");
      return false;
    } finally {
      setIsApplyingSuggestions(false);
    }
  }

  async function handleAcceptAllSuggestions() {
    for (const suggestion of suggestedZones) {
      if (acceptedSuggestionIds.includes(suggestion.id)) continue;
      const ok = await acceptSuggestion(suggestion);
      if (!ok) break;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="brand-shell border">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b border-[var(--gg-border)]/80 pb-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--gg-brand-deep)]">GreenGrid guided setup</p>
            <CardTitle className="text-xl tracking-tight sm:text-2xl">Build your plan in six short steps</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Step {activeStep + 1} of {steps.length}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <Progress value={completionPercent} className="w-full" />
          <p className="text-sm text-muted-foreground">{statusMessage}</p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <nav aria-label="Onboarding steps" className="flex shrink-0 flex-col gap-1 lg:w-56">
          {steps.map((label, i) => {
            const status = i < activeStep ? "complete" : i === activeStep ? "current" : "upcoming";
            const canNavigate = i <= activeStep;
            return (
              <button
                key={label}
                type="button"
                disabled={!canNavigate}
                onClick={() => canNavigate && setActiveStep(i)}
                className={cn(
                  "flex items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  status === "current" && "bg-primary/8 ring-1 ring-primary/20",
                  status === "complete" && "text-muted-foreground hover:bg-muted/80",
                  status === "upcoming" && "cursor-not-allowed opacity-45",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                    status === "current" && "bg-primary text-primary-foreground shadow-sm",
                    status === "complete" && "bg-emerald-600/12 text-emerald-900",
                    status === "upcoming" && "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium leading-snug">{label}</span>
                  <span className="text-xs text-muted-foreground">{stepDescriptions[i]}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 space-y-6">
          {activeStep === 0 && (
            <Card className="border shadow-md ring-1 ring-border/55">
              <CardContent className="space-y-4 pt-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  We will capture your property, zoning details, existing plants, and design intent so your first
                  actionable care plan is ready today.
                </p>
                <Button type="button" onClick={() => setActiveStep(1)} className="w-full sm:w-auto">
                  Start setup
                </Button>
              </CardContent>
            </Card>
          )}

          {activeStep === 1 && (
            <Card className="border shadow-md ring-1 ring-border/55">
              <CardHeader>
                <CardTitle className="text-base">Property basics</CardTitle>
                <CardDescription>Address and profile for your workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(event) => runSubmit(event, onCreateProperty)} className="space-y-4">
                  <div className="rounded-lg border border-[var(--gg-border)]/80 bg-muted/20 p-3 text-xs text-muted-foreground">
                    Quick start available for your MVP walkthrough.
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="ml-2"
                      onClick={() => {
                        setPropertyName(MARION_EXAMPLE.name);
                        setPropertyCity(MARION_EXAMPLE.city);
                        setPropertyAddress(MARION_EXAMPLE.addressLine);
                        setPropertyPostalCode(MARION_EXAMPLE.postalCode);
                      }}
                    >
                      Use 810 S. Roosevelt St., Marion
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Property name" htmlFor="prop-name">
                      <Input
                        id="prop-name"
                        name="name"
                        placeholder="Home Garden"
                        value={propertyName}
                        onChange={(e) => setPropertyName(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="City" htmlFor="prop-city">
                      <Input
                        id="prop-city"
                        name="city"
                        placeholder="Wichita"
                        value={propertyCity}
                        onChange={(e) => setPropertyCity(e.target.value)}
                        required
                      />
                    </Field>
                  </div>
                  <Field label="Street address" htmlFor="prop-address">
                    <Input
                      id="prop-address"
                      name="addressLine"
                      placeholder="123 Green Ave"
                      value={propertyAddress}
                      onChange={(e) => setPropertyAddress(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="ZIP code" htmlFor="prop-zip">
                    <Input
                      id="prop-zip"
                      name="postalCode"
                      placeholder="67202"
                      value={propertyPostalCode}
                      onChange={(e) => setPropertyPostalCode(e.target.value)}
                      required
                    />
                  </Field>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    Save property
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeStep === 2 && (
            <Card className="border shadow-md ring-1 ring-border/55">
              <CardHeader>
                <CardTitle className="text-base">Map and zones</CardTitle>
                <CardDescription>Capture your full boundary first, then review suggested draft zones.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {property ? (
                  <p className="text-sm text-muted-foreground">
                    Active property: {property.name} ({property.city}, {property.stateCode})
                  </p>
                ) : (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-950">
                    <AlertTitle>Incomplete</AlertTitle>
                    <AlertDescription>Complete property basics before adding zones.</AlertDescription>
                  </Alert>
                )}

                <PropertyMapEditor
                  zones={zones}
                  suggestedZones={suggestedZones}
                  activeSuggestionId={activeSuggestionId}
                  boundaryPolygonJson={boundaryPolygonJson}
                  zoneDraftPolygonJson={zoneDraftPolygonJson}
                  onBoundaryPolygonChange={setBoundaryPolygonJson}
                  onZoneDraftPolygonChange={setZoneDraftPolygonJson}
                />

                <form onSubmit={(event) => runSubmitNoAdvance(event, onSaveBoundary)} className="space-y-2">
                  <input type="hidden" name="polygonJson" value={boundaryPolygonJson} />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Mapping order: draw full property boundary, save it, then generate suggestions.
                    </p>
                    <Button type="submit" size="xs" variant="outline" disabled={!property || !hasBoundary}>
                      {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Save property boundary
                    </Button>
                  </div>
                </form>

                <div className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Suggested draft zones</p>
                      <p className="text-xs text-muted-foreground">
                        Drafts are heuristic estimates. Edit geometry before accepting if needed.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="xs" variant="outline" disabled={!property || !hasBoundary} onClick={handleSuggestZones}>
                        Suggest zones
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        disabled={!property || suggestedZones.length === 0 || acceptedSuggestionIds.length === suggestedZones.length || isApplyingSuggestions}
                        onClick={() => {
                          void handleAcceptAllSuggestions();
                        }}
                      >
                        {(isApplyingSuggestions || isSubmitting) ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        Accept all
                      </Button>
                    </div>
                  </div>
                  {suggestionError && <p className="text-xs text-amber-700">{suggestionError}</p>}
                  {suggestedZones.length > 0 ? (
                    <div className="space-y-2">
                      {suggestedZones.map((suggestion) => {
                        const accepted = acceptedSuggestionIds.includes(suggestion.id);
                        return (
                          <div key={suggestion.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm">
                            <div className="space-y-1">
                              <p className="font-medium">
                                {suggestion.name}{" "}
                                <span className="text-xs text-muted-foreground">({Math.round(suggestion.confidence * 100)}% confidence)</span>
                              </p>
                              <p className="text-xs text-muted-foreground">{suggestion.notes}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" size="xs" variant="outline" onClick={() => handleEditSuggestion(suggestion.id)}>
                                Edit geometry
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                disabled={accepted || isApplyingSuggestions}
                                onClick={() => {
                                  void acceptSuggestion(suggestion);
                                }}
                              >
                                {accepted ? "Accepted" : "Accept"}
                              </Button>
                              <Button type="button" size="xs" variant="ghost" onClick={() => handleDiscardSuggestion(suggestion.id)}>
                                Discard
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No drafts yet. Save a complete boundary, then use Suggest zones. You can always draw zones manually below.
                    </p>
                  )}
                  {activeSuggestion ? (
                    <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
                      <p className="text-xs text-muted-foreground">
                        Editing draft: <span className="font-medium text-foreground">{activeSuggestion.name}</span>
                      </p>
                      <Button type="button" size="xs" variant="outline" disabled={!zoneDraftPolygonJson} onClick={handleApplyEditedGeometry}>
                        Apply edited geometry
                      </Button>
                    </div>
                  ) : null}
                </div>

                <form onSubmit={(event) => runSubmit(event, onAddZone)} className="space-y-4 border-t border-border/70 pt-6">
                  <p className="text-sm font-medium">Manual zone fallback</p>
                  <input type="hidden" name="sunLevel" value={sunLevel} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Zone name" htmlFor="zone-name">
                      <Input id="zone-name" name="zoneName" placeholder="Front bed" required />
                    </Field>
                    <div className="space-y-2">
                      <Label>Sun level</Label>
                      <Select
                        value={sunLevel}
                        onValueChange={(value) => {
                          if (value) setSunLevel(value);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sun level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-sun">Full sun</SelectItem>
                          <SelectItem value="partial-shade">Partial shade</SelectItem>
                          <SelectItem value="shade">Shade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Soil type" htmlFor="soil-type">
                      <Input id="soil-type" name="soilType" defaultValue="loam" required />
                    </Field>
                    <Field label="Irrigation" htmlFor="irrigation">
                      <Input id="irrigation" name="irrigationType" defaultValue="manual" required />
                    </Field>
                  </div>
                  <Field label="Slope" htmlFor="slope">
                    <Input id="slope" name="slope" defaultValue="flat" required />
                  </Field>
                  <input type="hidden" name="polygonJson" value={zoneDraftPolygonJson} />
                  <p className="text-xs text-muted-foreground">Zone polygon points captured: {zonePointCount}</p>
                  <Field label="Notes" htmlFor="zone-notes">
                    <Textarea id="zone-notes" name="notes" placeholder="Drainage, wind, deer, etc." rows={2} />
                  </Field>
                  <Button type="submit" disabled={!property || !zoneDraftPolygonJson || !hasBoundary}>
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save zone
                  </Button>
                </form>

                {zones.length > 0 && (
                  <div className="space-y-2 border-t border-border/70 pt-4">
                    <p className="text-sm font-medium">Saved zones</p>
                    <ul className="space-y-2">
                      {zones.map((zone) => (
                        <li
                          key={zone.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm"
                        >
                          <span>
                            {zone.name} — {zone.sunLevel} / {zone.soilType}
                          </span>
                          <Button
                            type="button"
                            size="xs"
                            variant={selectedZoneId === zone.id ? "default" : "outline"}
                            onClick={() => setSelectedZoneId(zone.id)}
                          >
                            {selectedZoneId === zone.id ? "Selected" : "Select"}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeStep === 3 && (
            <Card className="border shadow-md ring-1 ring-border/55">
              <CardHeader>
                <CardTitle className="text-base">Existing plants</CardTitle>
                <CardDescription>Inventory what is already in the ground.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={runPlantingSubmit} className="space-y-4">
                  <input type="hidden" name="plantCatalogId" value={plantCatalogId} />
                  <div className="space-y-2">
                    <Label htmlFor="plant-search">Find in catalog</Label>
                    <Input
                      id="plant-search"
                      value={plantSearch}
                      onChange={(e) => setPlantSearch(e.target.value)}
                      placeholder="Search common or scientific name"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plant from catalog</Label>
                    <Select
                      value={plantCatalogId || undefined}
                      onValueChange={(value) => {
                        setPlantCatalogId(value ?? "");
                        setPlantingInlineError("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a plant">{selectedPlantLabel || undefined}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPlants.map((plant) => (
                          <SelectItem key={plant.id} value={plant.id}>
                            {getPlantOptionLabel(plant)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nickname (optional)" htmlFor="nickname">
                      <Input id="nickname" name="nickname" />
                    </Field>
                    <Field label="Health status" htmlFor="health">
                      <Input id="health" name="healthStatus" defaultValue="healthy" required />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Quantity" htmlFor="qty">
                      <Input id="qty" name="quantity" type="number" defaultValue="1" min={1} required />
                    </Field>
                    <Field label="Planted on" htmlFor="planted">
                      <Input id="planted" name="plantedOn" type="date" />
                    </Field>
                  </div>
                  <Button type="submit" disabled={!selectedZoneId || !plantCatalogId}>
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                    Add existing plant
                  </Button>
                  {plantingInlineError && <p className="text-sm text-destructive">{plantingInlineError}</p>}
                </form>

                {plantsCatalog.length > 0 && (
                  <div className="space-y-3 border-t border-border/70 pt-4">
                    <p className="text-sm font-semibold">Catalog preview</p>
                    <div className="space-y-2">
                      {plantsCatalog.slice(0, 5).map((plant) => (
                        <div key={plant.id} className="flex items-start justify-between gap-3 text-sm">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex shrink-0 flex-col gap-1">
                              <PlantThumb src={plant.imageUrl} alt={plant.commonName} />
                              {(plant.imageLicense || plant.imageSource) && (
                                <p className="max-w-[9rem] text-[10px] leading-snug text-muted-foreground">
                                  {[plant.imageLicense, plant.imageSource].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                            <span className="truncate pt-0.5">{plant.commonName}</span>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">{plant.scientificName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plantings.length > 0 && (
                  <div className="space-y-2 border-t border-border/70 pt-4">
                    {plantings.map((planting) => (
                      <div key={planting.id} className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <PlantThumb src={planting.imageUrl} alt={planting.commonName} />
                          <span className="truncate text-sm">
                            {planting.commonName} ({planting.healthStatus})
                          </span>
                        </div>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          ×{planting.quantity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeStep === 4 && (
            <Card className="border shadow-md ring-1 ring-border/55">
              <CardHeader>
                <CardTitle className="text-base">Photos and prompt</CardTitle>
                <CardDescription>Give the studio direction for concepts and requested viewpoints.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={runDesignSubmit} className="space-y-4">
                  <input type="hidden" name="designZoneId" value={designZoneScope === WHOLE_PROPERTY ? "" : designZoneScope} />
                  <div className="space-y-2">
                    <Label>Scope</Label>
                    <Select
                      value={designZoneScope}
                      onValueChange={(value) => {
                        if (value) setDesignZoneScope(value);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={WHOLE_PROPERTY}>Whole property</SelectItem>
                        {zones.map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            {zone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Style" htmlFor="style">
                    <Input id="style" name="style" defaultValue="modern-natural" required />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Render perspective</Label>
                      <Select value={renderPerspective} onValueChange={(value) => value && setRenderPerspective(value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Perspective" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="human">Human eye-level</SelectItem>
                          <SelectItem value="birds-eye">Bird&apos;s-eye masterplan</SelectItem>
                          <SelectItem value="both">Both perspectives</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Maintenance preference</Label>
                      <Select
                        value={maintenancePreference}
                        onValueChange={(value) => value && setMaintenancePreference(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Maintenance" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low maintenance</SelectItem>
                          <SelectItem value="moderate">Moderate maintenance</SelectItem>
                          <SelectItem value="hands-on">Hands-on gardening</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Budget band</Label>
                      <Select value={budgetBand} onValueChange={(value) => value && setBudgetBand(value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Budget band" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lean">Lean</SelectItem>
                          <SelectItem value="mid">Mid-range</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Color mood</Label>
                      <Select value={colorMood} onValueChange={(value) => value && setColorMood(value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Color mood" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="native-warm">Native warm</SelectItem>
                          <SelectItem value="cool-structured">Cool structured</SelectItem>
                          <SelectItem value="pollinator-vibrant">Pollinator vibrant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Field label="Prompt" htmlFor="prompt">
                    <Textarea
                      id="prompt"
                      name="prompt"
                      rows={3}
                      placeholder="Describe vibe, budget, maintenance preference, and goals."
                      required
                    />
                  </Field>
                  <Field label="Upload photos" htmlFor="photos">
                    <Input
                      id="photos"
                      name="photos"
                      type="file"
                      multiple
                      onChange={(event) => handlePhotoChange(event.currentTarget.files)}
                      className="cursor-pointer bg-muted/30 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground"
                    />
                  </Field>
                  {photoPreviews.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/10 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Reference photos ready ({photoPreviews.length})
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {photoPreviews.map((preview) => (
                          <div key={preview.url} className="space-y-1">
                            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                            <img
                              src={preview.url}
                              alt={preview.name}
                              className="h-24 w-full rounded-md object-cover ring-1 ring-border"
                            />
                            <p className="truncate text-[11px] text-muted-foreground">{preview.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button type="submit" disabled={!property}>
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                    Generate options
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeStep === 5 && (
            <Card className="border shadow-md ring-1 ring-border/55">
              <CardHeader>
                <CardTitle className="text-base">Review and activate</CardTitle>
                <CardDescription>Pick an option and move into your dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {designRequest?.outputs.length ? (
                  <>
                    <div className="space-y-2">
                      <Label>Pick design option to activate</Label>
                      <Select value={selectedOutputId || undefined} onValueChange={(v) => setSelectedOutputId(v ?? "")}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an output" />
                        </SelectTrigger>
                        <SelectContent>
                          {designRequest.outputs.map((output) => (
                            <SelectItem key={output.id} value={output.id}>
                              {output.label} ({renderLabel(output.outputUrl)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {designRequest.outputs.map((output) => (
                        <div
                          key={output.id}
                          className={cn(
                            "rounded-lg border p-3 text-xs",
                            selectedOutputId === output.id ? "border-primary bg-primary/5" : "border-border/70 bg-muted/10",
                          )}
                        >
                          <p className="font-semibold">{output.label}</p>
                          <p className="text-muted-foreground">{renderLabel(output.outputUrl)}</p>
                          <p className="truncate text-muted-foreground/80">{output.outputUrl}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={!selectedOutputId}
                        onClick={async () => {
                          setError("");
                          try {
                            const ok = await onActivatePlan(selectedOutputId);
                            if (ok) onCompleted();
                          } catch (activationError) {
                            setError(
                              activationError instanceof Error ? activationError.message : "Unable to activate design.",
                            );
                          }
                        }}
                      >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                        Activate plan
                      </Button>
                      <Button type="button" variant="outline" onClick={onCompleted}>
                        Continue to dashboard
                      </Button>
                    </div>
                  </>
                ) : (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-950">
                    <AlertTitle>Not ready</AlertTitle>
                    <AlertDescription>
                      Generate at least one design option in the previous step before activation.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function renderLabel(outputUrl: string): string {
  const lower = outputUrl.toLowerCase();
  if (lower.includes("birds-eye")) return "Bird's-eye concept";
  if (lower.includes("human")) return "Human-eye concept";
  if (lower.includes("both")) return "Dual-perspective concept";
  return "Concept render";
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function PlantThumb({ src, alt }: { src: string | null | undefined; alt: string }) {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote URLs / placeholder */}
      <img
        src={src || "/placeholder-plant.svg"}
        alt={alt}
        width={40}
        height={40}
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

function getPlantOptionLabel(plant: Plant): string {
  if (plant.scientificName) return `${plant.commonName} (${plant.scientificName})`;
  return plant.commonName;
}
