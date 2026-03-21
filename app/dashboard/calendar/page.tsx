"use client";

import { useState, useEffect, useCallback } from "react";
import { ContentPiece } from "@/types";
import PreviewModal from "@/components/PreviewModal";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeSlots = [
  { label: "8 AM", hour: 8 },
  { label: "12 PM", hour: 12 },
  { label: "6 PM", hour: 18 },
];

const typeColor: Record<string, { bg: string; text: string; border: string }> = {
  reel: { bg: "#F3E5F5", text: "#7B1FA2", border: "#CE93D8" },
  carousel: { bg: "#E3F2FD", text: "#1565C0", border: "#90CAF9" },
  single_image: { bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" },
};

const statusDot: Record<string, string> = {
  approved: "#2E7D32",
  rejected: "#C62828",
  scheduled: "#1565C0",
  composed: "#F57F17",
  draft: "#BDBDBD",
  asset_ready: "#F57F17",
};

export default function CalendarPage() {
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [previewPiece, setPreviewPiece] = useState<ContentPiece | null>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/list");
      const { data } = await res.json();
      if (data) setPieces(data);
    } catch {
      // silently fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

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

  async function handleApprove(id: string) {
    await fetch("/api/content/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentPieceId: id }),
    });
    setPieces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "approved" as const } : p))
    );
  }

  async function handleReject(id: string) {
    await fetch("/api/content/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentPieceId: id }),
    });
    setPieces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "rejected" as const } : p))
    );
  }

  // Build grid data
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  function getPieceForSlot(dayIndex: number, slotHour: number) {
    const dayDate = days[dayIndex];
    return pieces.find((p) => {
      if (!p.post_time) return false;
      const pt = new Date(p.post_time);
      return (
        pt.getFullYear() === dayDate.getFullYear() &&
        pt.getMonth() === dayDate.getMonth() &&
        pt.getDate() === dayDate.getDate() &&
        pt.getHours() === slotHour
      );
    });
  }

  const weekLabel = (() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${weekStart.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}, ${end.getFullYear()}`;
  })();

  return (
    <div className="p-4 md:p-6">
      {/* Week selector */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={prevWeek}
          className="w-8 h-8 rounded-lg border border-[#E5E5E5] flex items-center justify-center text-[#6B6B6B] hover:bg-[#F5F5F5]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-semibold text-[#1A1A1A]">{weekLabel}</h1>
        <button
          onClick={nextWeek}
          className="w-8 h-8 rounded-lg border border-[#E5E5E5] flex items-center justify-center text-[#6B6B6B] hover:bg-[#F5F5F5]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#C9A96E]" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header row */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
              <div />
              {days.map((d, i) => (
                <div
                  key={i}
                  className="text-center text-xs font-medium text-[#6B6B6B] py-2"
                >
                  <div>{dayNames[i]}</div>
                  <div className="text-[#1A1A1A] font-semibold">
                    {d.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Time slots */}
            {timeSlots.map((slot) => (
              <div
                key={slot.hour}
                className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1"
              >
                <div className="text-xs text-[#6B6B6B] py-3 text-right pr-3">
                  {slot.label}
                </div>
                {days.map((_, dayIndex) => {
                  const piece = getPieceForSlot(dayIndex, slot.hour);
                  if (!piece) {
                    return (
                      <div
                        key={dayIndex}
                        className="bg-white rounded-lg border border-[#E5E5E5] min-h-[60px]"
                      />
                    );
                  }
                  const colors = typeColor[piece.type] || typeColor.single_image;
                  const dotColor = statusDot[piece.status] || statusDot.draft;
                  return (
                    <button
                      key={dayIndex}
                      onClick={() => setPreviewPiece(piece)}
                      className="rounded-lg border min-h-[60px] p-2 text-left transition-all hover:shadow-sm"
                      style={{
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                      }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: dotColor }}
                        />
                        <span
                          className="text-[10px] font-medium uppercase"
                          style={{ color: colors.text }}
                        >
                          {piece.type === "single_image"
                            ? "Post"
                            : piece.type}
                        </span>
                      </div>
                      <p
                        className="text-[11px] leading-tight line-clamp-2"
                        style={{ color: colors.text }}
                      >
                        {piece.hook?.slice(0, 40)}
                        {(piece.hook?.length || 0) > 40 ? "..." : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <PreviewModal
        piece={previewPiece}
        open={!!previewPiece}
        onClose={() => setPreviewPiece(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
