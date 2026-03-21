"use client";

import { useState } from "react";
import Link from "next/link";
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
  AlertCircle,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContentPiece, ContentType } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getNextMonday() {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMon = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMon);
  d.setHours(0, 0, 0, 0);
  return d;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StageKey = "content" | "assets" | "compose";
type StageStatus = "waiting" | "in_progress" | "done" | "error";

interface FailedPiece {
  id: string;
  type: ContentType;
  hook: string;
  stage: StageKey;
  error: string;
}

interface StageState {
  status: StageStatus;
  current: number;
  total: number;
  label: string;
}

/* ------------------------------------------------------------------ */
/*  Stage definitions                                                  */
/* ------------------------------------------------------------------ */

const STAGES: { key: StageKey; label: string; desc: string; icon: typeof Brain }[] = [
  {
    key: "content",
    label: "Content Generation",
    desc: "Claude AI writes hooks, copy, and scripts",
    icon: Brain,
  },
  {
    key: "assets",
    label: "Asset Generation",
    desc: "Images and videos for each piece",
    icon: ImageIcon,
  },
  {
    key: "compose",
    label: "Composition",
    desc: "Creatomate renders final assets",
    icon: Palette,
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GeneratePage() {
  const [weekStart, setWeekStart] = useState(() => getNextMonday());

  // Pipeline state
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);

  const [stages, setStages] = useState<Record<StageKey, StageState>>({
    content: { status: "waiting", current: 0, total: 0, label: "" },
    assets: { status: "waiting", current: 0, total: 0, label: "" },
    compose: { status: "waiting", current: 0, total: 0, label: "" },
  });

  const [failedPieces, setFailedPieces] = useState<FailedPiece[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Stats for summary
  const [stats, setStats] = useState({ images: 0, videos: 0, composed: 0 });

  /* ---------- helpers ---------- */

  function updateStage(key: StageKey, patch: Partial<StageState>) {
    setStages((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function addFailure(piece: ContentPiece, stage: StageKey, error: string) {
    setFailedPieces((prev) => [
      ...prev,
      { id: piece.id, type: piece.type, hook: piece.hook, stage, error },
    ]);
  }

  /* ---------- week selector ---------- */

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

  const weekLabel = (() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${weekStart.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}, ${end.getFullYear()}`;
  })();

  /* ---------- pipeline ---------- */

  async function runPipeline(retryOnly = false) {
    setRunning(true);
    setDone(false);
    setGlobalError(null);

    const piecesToRetry = retryOnly ? [...failedPieces] : [];
    if (!retryOnly) setFailedPieces([]);

    try {
      /* -------- Stage 1: Content Generation -------- */
      let currentBatchId = batchId;

      if (!retryOnly) {
        updateStage("content", { status: "in_progress", current: 0, total: 1, label: "Generating content with Claude..." });

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchType: "weekly" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Content generation failed");

        currentBatchId = data.batch_id;
        setBatchId(currentBatchId);
        updateStage("content", {
          status: "done",
          current: data.pieces_count || 21,
          total: data.pieces_count || 21,
          label: `${data.pieces_count || 21} pieces created`,
        });
      } else {
        // Mark content stage as done when retrying
        updateStage("content", { status: "done", current: 21, total: 21, label: "21 pieces created" });
      }

      if (!currentBatchId) throw new Error("No batch ID available");

      /* -------- Fetch piece list -------- */
      const listRes = await fetch(`/api/content/list?batch_id=${currentBatchId}`);
      const listData = await listRes.json();
      if (!listRes.ok) throw new Error(listData.error || "Failed to fetch pieces");
      const allPieces: ContentPiece[] = listData.data;

      /* -------- Stage 2: Asset Generation -------- */
      const assetRetryIds = new Set(piecesToRetry.filter((f) => f.stage === "assets").map((f) => f.id));
      // Clear old asset failures if retrying
      if (retryOnly) {
        setFailedPieces((prev) => prev.filter((f) => f.stage !== "assets"));
      }

      const imagePieces = allPieces.filter(
        (p) => (p.type === "carousel" || p.type === "single_image") && (!retryOnly || assetRetryIds.has(p.id))
      );
      const videoPieces = allPieces.filter(
        (p) => p.type === "reel" && (!retryOnly || assetRetryIds.has(p.id))
      );
      const assetPieces = [...imagePieces, ...videoPieces];
      const totalAssets = assetPieces.length;

      if (totalAssets > 0) {
        updateStage("assets", { status: "in_progress", current: 0, total: totalAssets, label: "Starting asset generation..." });

        let assetsDone = 0;
        let imagesDone = 0;
        let videosDone = 0;

        // Process images first
        for (const piece of imagePieces) {
          updateStage("assets", {
            label: `Generating images... ${imagesDone + 1}/${imagePieces.length}`,
            current: assetsDone,
          });

          try {
            const res = await fetch("/api/assets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contentPieceId: piece.id }),
            });
            if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.error || "Asset generation failed");
            }
            imagesDone++;
          } catch (err) {
            addFailure(piece, "assets", err instanceof Error ? err.message : "Unknown error");
          }
          assetsDone++;
          updateStage("assets", { current: assetsDone });
        }

        // Then videos
        for (const piece of videoPieces) {
          updateStage("assets", {
            label: `Generating videos... ${videosDone + 1}/${videoPieces.length}`,
            current: assetsDone,
          });

          try {
            const res = await fetch("/api/assets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contentPieceId: piece.id }),
            });
            if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.error || "Video generation failed");
            }
            videosDone++;
          } catch (err) {
            addFailure(piece, "assets", err instanceof Error ? err.message : "Unknown error");
          }
          assetsDone++;
          updateStage("assets", { current: assetsDone });
        }

        setStats((prev) => ({ ...prev, images: imagesDone, videos: videosDone }));
        updateStage("assets", {
          status: "done",
          current: totalAssets,
          label: `${imagesDone} images, ${videosDone} videos generated`,
        });
      } else {
        updateStage("assets", { status: "done", current: 0, total: 0, label: "No assets to generate" });
      }

      /* -------- Stage 3: Composition -------- */
      const composeRetryIds = new Set(piecesToRetry.filter((f) => f.stage === "compose").map((f) => f.id));
      // Clear old compose failures if retrying
      if (retryOnly) {
        setFailedPieces((prev) => prev.filter((f) => f.stage !== "compose"));
      }

      const composePieces = retryOnly
        ? allPieces.filter((p) => composeRetryIds.has(p.id))
        : allPieces;
      const totalCompose = composePieces.length;

      if (totalCompose > 0) {
        updateStage("compose", { status: "in_progress", current: 0, total: totalCompose, label: "Starting composition..." });

        let composeDone = 0;

        for (const piece of composePieces) {
          const typeLabel = piece.type === "carousel" ? "carousel (multi-slide)" : piece.type;
          updateStage("compose", {
            label: `Compositing ${typeLabel}... ${composeDone + 1}/${totalCompose}`,
            current: composeDone,
          });

          try {
            const res = await fetch("/api/compose", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contentPieceId: piece.id }),
            });
            if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.error || "Composition failed");
            }
            composeDone++;
          } catch (err) {
            addFailure(piece, "compose", err instanceof Error ? err.message : "Unknown error");
          }

          updateStage("compose", { current: composeDone + (totalCompose - composePieces.length) });
          // Small delay between compose calls to be nice to Creatomate
          if (composeDone < totalCompose) await sleep(500);
        }

        setStats((prev) => ({ ...prev, composed: composeDone }));
        updateStage("compose", {
          status: "done",
          current: totalCompose,
          label: `${composeDone} pieces composed`,
        });
      } else {
        updateStage("compose", { status: "done", current: 0, total: 0, label: "No pieces to compose" });
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "An error occurred");
    }

    setRunning(false);
    setDone(true);
  }

  /* ---------- render ---------- */

  const hasStarted = stages.content.status !== "waiting";
  const totalFailed = failedPieces.length;

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
            disabled={running}
            className="w-8 h-8 rounded-lg border border-[#E5E5E5] flex items-center justify-center text-[#6B6B6B] hover:bg-[#F5F5F5] disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-[#1A1A1A]">{weekLabel}</span>
          <button
            onClick={nextWeek}
            disabled={running}
            className="w-8 h-8 rounded-lg border border-[#E5E5E5] flex items-center justify-center text-[#6B6B6B] hover:bg-[#F5F5F5] disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Generate button */}
      <Button
        className="w-full bg-[#C9A96E] text-white hover:bg-[#B89860] border-0 h-12 text-base"
        onClick={() => runPipeline(false)}
        disabled={running}
      >
        {running ? (
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

      {/* Progress stages */}
      {hasStarted && (
        <div className="mt-8 bg-white rounded-xl p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-4">
            Pipeline Progress
          </p>
          <div className="space-y-5">
            {STAGES.map((stage) => {
              const state = stages[stage.key];
              const Icon = stage.icon;
              const isActive = state.status === "in_progress";
              const isDone = state.status === "done";
              const isError = state.status === "error";
              const pct = state.total > 0 ? Math.round((state.current / state.total) * 100) : 0;

              return (
                <div key={stage.key}>
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className="mt-0.5">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
                      ) : isActive ? (
                        <Loader2 className="w-5 h-5 text-[#C9A96E] animate-spin" />
                      ) : isError ? (
                        <AlertCircle className="w-5 h-5 text-[#C62828]" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#E0E0E0]" />
                      )}
                    </div>

                    {/* Label & description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`w-4 h-4 ${
                            isDone
                              ? "text-[#2E7D32]"
                              : isActive
                                ? "text-[#C9A96E]"
                                : isError
                                  ? "text-[#C62828]"
                                  : "text-[#BDBDBD]"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            isDone
                              ? "text-[#2E7D32]"
                              : isActive
                                ? "text-[#1A1A1A]"
                                : isError
                                  ? "text-[#C62828]"
                                  : "text-[#BDBDBD]"
                          }`}
                        >
                          {stage.label}
                        </span>
                        {/* Counter */}
                        {(isActive || isDone) && state.total > 0 && (
                          <span className="text-xs text-[#6B6B6B]">
                            {state.current}/{state.total}
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-xs mt-0.5 ${
                          isDone || isActive ? "text-[#6B6B6B]" : isError ? "text-[#C62828]" : "text-[#BDBDBD]"
                        }`}
                      >
                        {state.label || stage.desc}
                      </p>

                      {/* Progress bar */}
                      {isActive && state.total > 0 && (
                        <div className="mt-2 h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C9A96E] rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      {isDone && state.total > 0 && (
                        <div className="mt-2 h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
                          <div className="h-full bg-[#2E7D32] rounded-full w-full" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div className="mt-4 bg-[#FFEBEE] text-[#C62828] rounded-xl p-4 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Completion summary */}
      {done && !running && (
        <div className="mt-4 space-y-4">
          {/* Success banner */}
          <div className="bg-[#E8F5E9] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
              <span className="text-sm font-semibold text-[#2E7D32]">
                {totalFailed === 0 ? "All pieces ready for review!" : "Generation complete with some errors"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/60 rounded-lg p-2">
                <p className="text-lg font-semibold text-[#1A1A1A]">{stats.images}</p>
                <p className="text-xs text-[#6B6B6B]">Images</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2">
                <p className="text-lg font-semibold text-[#1A1A1A]">{stats.videos}</p>
                <p className="text-xs text-[#6B6B6B]">Videos</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2">
                <p className="text-lg font-semibold text-[#1A1A1A]">{stats.composed}</p>
                <p className="text-xs text-[#6B6B6B]">Composed</p>
              </div>
            </div>
            {totalFailed > 0 && (
              <p className="text-xs text-[#C62828] mt-2">
                {totalFailed} piece{totalFailed !== 1 ? "s" : ""} failed
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1">
              <Button className="w-full bg-[#C9A96E] text-white hover:bg-[#B89860] border-0 h-10">
                Go to Content Queue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            {totalFailed > 0 && (
              <Button
                variant="outline"
                className="h-10 border-[#C62828] text-[#C62828] hover:bg-[#FFEBEE]"
                onClick={() => runPipeline(true)}
                disabled={running}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Failed ({totalFailed})
              </Button>
            )}
          </div>

          {/* Failed pieces detail */}
          {totalFailed > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-black/5">
              <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-3">
                Failed Pieces
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {failedPieces.map((fp) => (
                  <div key={`${fp.id}-${fp.stage}`} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 mt-0.5">
                      {fp.type === "reel" ? (
                        <Film className="w-3 h-3 text-[#6B6B6B]" />
                      ) : fp.type === "carousel" ? (
                        <ImageIcon className="w-3 h-3 text-[#6B6B6B]" />
                      ) : (
                        <Palette className="w-3 h-3 text-[#6B6B6B]" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[#1A1A1A] truncate">
                        <span className="font-medium">{fp.stage}:</span> {fp.hook}
                      </p>
                      <p className="text-[#C62828] truncate">{fp.error}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
