"use client";

import { useState, useEffect, useCallback } from "react";
import { ContentPiece } from "@/types";
import ContentCard from "@/components/ContentCard";
import PreviewModal from "@/components/PreviewModal";
import BulkActionsBar from "@/components/BulkActionsBar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}, ${end.getFullYear()}`;
}

export default function ContentQueuePage() {
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewPiece, setPreviewPiece] = useState<ContentPiece | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/list");
      const { data } = await res.json();
      if (data) {
        setPieces(data);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const filteredPieces = pieces.filter((p) => {
    // Week filter
    if (p.post_time) {
      const pt = new Date(p.post_time);
      if (pt < weekStart || pt >= weekEnd) return false;
    }
    // Type filter
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        if (!["draft", "asset_ready", "composed"].includes(p.status)) return false;
      } else if (p.status !== statusFilter) return false;
    }
    return true;
  });

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
    const res = await fetch("/api/content/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentPieceId: id }),
    });
    const result = await res.json();
    setPieces((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: result.scheduled ? ("scheduled" as const) : ("approved" as const),
              buffer_post_id: result.buffer_post_id || p.buffer_post_id,
            }
          : p
      )
    );
  }

  async function handleReject(id: string) {
    await fetch("/api/content/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentPieceId: id }),
    });
    setPieces((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "rejected" as const, buffer_post_id: null }
          : p
      )
    );
  }

  function toggleSelect(id: string, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectAllPending() {
    const pendingIds = filteredPieces
      .filter((p) => ["draft", "asset_ready", "composed"].includes(p.status))
      .map((p) => p.id);
    setSelectedIds(new Set(pendingIds));
  }

  async function bulkApprove() {
    const ids = Array.from(selectedIds);
    await fetch("/api/content/bulk-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentPieceIds: ids }),
    });
    // Refetch to get accurate scheduled/approved states
    await fetchContent();
    setSelectedIds(new Set());
  }

  async function bulkReject() {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await fetch("/api/content/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentPieceId: id }),
      });
    }
    setPieces((prev) =>
      prev.map((p) =>
        ids.includes(p.id) ? { ...p, status: "rejected" as const } : p
      )
    );
    setSelectedIds(new Set());
  }

  const allApproved =
    filteredPieces.length > 0 &&
    filteredPieces.every((p) => p.status === "approved" || p.status === "scheduled");
  const allScheduled =
    filteredPieces.length > 0 &&
    filteredPieces.every((p) => p.status === "scheduled");

  return (
    <div className="p-4 md:p-6 max-w-7xl">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={prevWeek}
            className="w-8 h-8 rounded-lg border border-[#E5E5E5] flex items-center justify-center text-[#6B6B6B] hover:bg-[#F5F5F5]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-semibold text-[#1A1A1A]">
            {formatWeekLabel(weekStart)}
          </h1>
          <button
            onClick={nextWeek}
            className="w-8 h-8 rounded-lg border border-[#E5E5E5] flex items-center justify-center text-[#6B6B6B] hover:bg-[#F5F5F5]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <Button
          className="bg-[#C9A96E] text-white hover:bg-[#B89860] border-0"
          onClick={() => (window.location.href = "/dashboard/generate")}
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          Generate New Week
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="reel">Reels</TabsTrigger>
            <TabsTrigger value="carousel">Carousels</TabsTrigger>
            <TabsTrigger value="single_image">Single Posts</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#C9A96E]" />
        </div>
      ) : filteredPieces.length === 0 ? (
        <div className="text-center py-20">
          {pieces.length === 0 ? (
            <>
              <p className="text-[#6B6B6B] text-lg mb-4">
                No content generated yet
              </p>
              <Button
                className="bg-[#C9A96E] text-white hover:bg-[#B89860] border-0"
                onClick={() => (window.location.href = "/dashboard/generate")}
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate Content
              </Button>
            </>
          ) : allScheduled ? (
            <p className="text-[#6B6B6B] text-lg">
              Content is live and scheduled in Buffer
            </p>
          ) : allApproved ? (
            <p className="text-[#6B6B6B] text-lg">
              All content approved! Ready to schedule.
            </p>
          ) : (
            <p className="text-[#6B6B6B] text-lg">
              No content matches the current filters
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPieces.map((piece) => (
            <ContentCard
              key={piece.id}
              piece={piece}
              onApprove={handleApprove}
              onReject={handleReject}
              onPreview={setPreviewPiece}
              onSelect={toggleSelect}
              selected={selectedIds.has(piece.id)}
            />
          ))}
        </div>
      )}

      {/* Preview modal */}
      <PreviewModal
        piece={previewPiece}
        open={!!previewPiece}
        onClose={() => setPreviewPiece(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Bulk actions */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onApproveSelected={bulkApprove}
        onRejectSelected={bulkReject}
        onSelectAllPending={selectAllPending}
        onClearSelection={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
