"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Circle,
  Brain,
  ImageIcon,
  Film,
  Palette,
} from "lucide-react";

function getNextMonday() {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMon = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMon);
  d.setHours(0, 0, 0, 0);
  return d;
}

const steps = [
  { key: "claude", label: "Content Generation", desc: "Claude AI writes hooks, copy, and scripts", icon: Brain },
  { key: "imagen", label: "Image Generation", desc: "Imagen creates backgrounds and visuals", icon: ImageIcon },
  { key: "kling", label: "Video Generation", desc: "Kling produces reel videos", icon: Film },
  { key: "creatomate", label: "Composition", desc: "Creatomate renders final assets", icon: Palette },
  { key: "done", label: "Complete", desc: "All 21 pieces ready for review", icon: CheckCircle2 },
];

interface NicheSettings {
  id: string;
  name: string;
  niche_topic: string;
  content_pillars: string[];
  tone: string;
}

export default function GeneratePage() {
  const [weekStart, setWeekStart] = useState(() => getNextMonday());
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [settings] = useState<NicheSettings | null>(null);

  useEffect(() => {
    // Fetch niche settings for display
    fetch("/api/content/list")
      .then((r) => r.json())
      .catch(() => {});
  }, []);

  function prevWeek() {
    setWeekStart((w) => {
      const d = new Date(w);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextWeek() {
    setWeekStart((w) => {
      const d = new Date(w);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setCurrentStep(0);

    try {
      // Step 1: Generate content with Claude
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchType: "weekly" }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || "Generation failed");
      setBatchId(genData.batch_id);
      setCurrentStep(1);

      // Step 2: Generate images
      const assetRes = await fetch("/api/assets/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: genData.batch_id }),
      });
      if (!assetRes.ok) {
        const assetErr = await assetRes.json();
        throw new Error(assetErr.error || "Asset generation failed");
      }
      setCurrentStep(2);

      // Step 3: Video generation happens during asset batch
      setCurrentStep(3);

      // Step 4: Compose
      const compRes = await fetch("/api/compose/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: genData.batch_id }),
      });
      if (!compRes.ok) {
        const compErr = await compRes.json();
        throw new Error(compErr.error || "Composition failed");
      }
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
    setGenerating(false);
  }

  const weekLabel = (() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${weekStart.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}, ${end.getFullYear()}`;
  })();

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-[#1A1A1A] mb-6">
        Generate Content
      </h1>

      {/* Week selector */}
      <div className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-black/5 mb-6">
        <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-3">
          Week to Generate
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={prevWeek}
            className="w-8 h-8 rounded-lg border border-[#E5E5E5] flex items-center justify-center text-[#6B6B6B] hover:bg-[#F5F5F5]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-[#1A1A1A]">
            {weekLabel}
          </span>
          <button
            onClick={nextWeek}
            className="w-8 h-8 rounded-lg border border-[#E5E5E5] flex items-center justify-center text-[#6B6B6B] hover:bg-[#F5F5F5]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Niche settings preview */}
      {settings && (
        <div className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-black/5 mb-6">
          <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-3">
            Niche Settings
          </p>
          <div className="space-y-2">
            <p className="text-sm text-[#1A1A1A]">
              <span className="font-medium">Account:</span> {settings.name}
            </p>
            <p className="text-sm text-[#1A1A1A]">
              <span className="font-medium">Topic:</span>{" "}
              {settings.niche_topic}
            </p>
            <p className="text-sm text-[#1A1A1A]">
              <span className="font-medium">Tone:</span> {settings.tone}
            </p>
            {settings.content_pillars && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {settings.content_pillars.map((pillar, i) => (
                  <span
                    key={i}
                    className="text-xs bg-[#C9A96E]/10 text-[#C9A96E] px-2 py-0.5 rounded-full"
                  >
                    {pillar}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate button */}
      <Button
        className="w-full bg-[#C9A96E] text-white hover:bg-[#B89860] border-0 h-12 text-base"
        onClick={handleGenerate}
        disabled={generating}
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Full Week
          </>
        )}
      </Button>

      {/* Progress */}
      {currentStep >= 0 && (
        <div className="mt-8 bg-white rounded-xl p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-4">
            Progress
          </p>
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const isComplete = currentStep > idx;
              const isCurrent = currentStep === idx;
              const StepIcon = step.icon;
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-[#C9A96E] animate-spin" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#E0E0E0]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StepIcon
                        className={`w-4 h-4 ${
                          isComplete
                            ? "text-[#2E7D32]"
                            : isCurrent
                            ? "text-[#C9A96E]"
                            : "text-[#BDBDBD]"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          isComplete
                            ? "text-[#2E7D32]"
                            : isCurrent
                            ? "text-[#1A1A1A]"
                            : "text-[#BDBDBD]"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${
                        isComplete || isCurrent
                          ? "text-[#6B6B6B]"
                          : "text-[#BDBDBD]"
                      }`}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 bg-[#FFEBEE] text-[#C62828] rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Success link */}
      {currentStep === 4 && batchId && (
        <div className="mt-4 bg-[#E8F5E9] text-[#2E7D32] rounded-xl p-4 text-sm">
          All content generated!{" "}
          <a href="/dashboard" className="underline font-medium">
            View content queue →
          </a>
        </div>
      )}
    </div>
  );
}
