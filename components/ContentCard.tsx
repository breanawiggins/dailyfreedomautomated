"use client";

import { useState } from "react";
import { ContentPiece } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  X,
  Eye,
  Pencil,
  Film,
  Images,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Music,
} from "lucide-react";

const statusBorderColor: Record<string, string> = {
  approved: "#2E7D32",
  rejected: "#C62828",
  scheduled: "#1565C0",
  composed: "#F57F17",
  draft: "#E0E0E0",
  asset_ready: "#F57F17",
};

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: "#E8F5E9", text: "#2E7D32", label: "Approved" },
  rejected: { bg: "#FFEBEE", text: "#C62828", label: "Rejected" },
  scheduled: { bg: "#E3F2FD", text: "#1565C0", label: "Scheduled" },
  composed: { bg: "#FFF8E1", text: "#F57F17", label: "Pending" },
  draft: { bg: "#FFF8E1", text: "#F57F17", label: "Draft" },
  asset_ready: { bg: "#FFF8E1", text: "#F57F17", label: "Assets Ready" },
};

const typeIcon: Record<string, React.ReactNode> = {
  reel: <Film className="w-3 h-3" />,
  carousel: <Images className="w-3 h-3" />,
  single_image: <ImageIcon className="w-3 h-3" />,
};

const typeLabel: Record<string, string> = {
  reel: "Reel",
  carousel: "Carousel",
  single_image: "Single Image",
};

interface ContentCardProps {
  piece: ContentPiece;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPreview: (piece: ContentPiece) => void;
  onSelect?: (id: string, selected: boolean) => void;
  selected?: boolean;
}

export default function ContentCard({
  piece,
  onApprove,
  onReject,
  onPreview,
  onSelect,
  selected,
}: ContentCardProps) {
  const [editingHook, setEditingHook] = useState(false);
  const [hookText, setHookText] = useState(piece.hook);
  const [audioNote, setAudioNote] = useState(piece.notes || "");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const borderColor = statusBorderColor[piece.status] || "#E0E0E0";
  const badge = statusBadge[piece.status] || statusBadge.draft;
  const isRejected = piece.status === "rejected";

  const previewUrls = piece.composed_urls?.length
    ? piece.composed_urls
    : piece.image_urls?.length
    ? piece.image_urls
    : [];

  const isVideo =
    piece.type === "reel" &&
    previewUrls[0]?.match(/\.(mp4|webm|mov)/i);

  const scheduleTime = piece.post_time
    ? new Date(piece.post_time).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  async function saveHook() {
    setSaving(true);
    await fetch("/api/content/update-hook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentPieceId: piece.id, newHook: hookText }),
    });
    setEditingHook(false);
    setSaving(false);
  }

  async function saveAudioNote() {
    setSaving(true);
    await fetch("/api/content/audio-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentPieceId: piece.id, audioNote }),
    });
    setSaving(false);
  }

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 transition-all ${
        isRejected ? "opacity-50" : ""
      } ${selected ? "ring-2 ring-[#C9A96E]" : ""}`}
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(piece.id, e.target.checked)}
              className="rounded border-[#D0D0D0] accent-[#C9A96E]"
            />
          )}
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6B6B6B] bg-[#F5F5F5] px-2 py-0.5 rounded-full">
            {typeIcon[piece.type]}
            {typeLabel[piece.type]}
          </span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {badge.label}
          </span>
        </div>
        {scheduleTime && (
          <span className="text-xs text-[#6B6B6B]">{scheduleTime}</span>
        )}
      </div>

      {/* Preview area */}
      {previewUrls.length > 0 && (
        <div className="relative aspect-[4/5] bg-[#F5F5F5] overflow-hidden">
          {isVideo ? (
            <video
              src={previewUrls[0]}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrls[carouselIndex] || previewUrls[0]}
              alt={piece.hook}
              className="w-full h-full object-cover"
            />
          )}
          {piece.type === "carousel" && previewUrls.length > 1 && (
            <>
              <button
                onClick={() =>
                  setCarouselIndex((i) =>
                    i > 0 ? i - 1 : previewUrls.length - 1
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCarouselIndex((i) =>
                    i < previewUrls.length - 1 ? i + 1 : 0
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {previewUrls.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      idx === carouselIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-3">
        {editingHook ? (
          <div className="flex gap-2">
            <Input
              value={hookText}
              onChange={(e) => setHookText(e.target.value)}
              className="text-sm flex-1"
            />
            <Button size="sm" onClick={saveHook} disabled={saving}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingHook(false);
                setHookText(piece.hook);
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-[#1A1A1A] font-medium leading-snug">
            {piece.hook?.length > 100
              ? piece.hook.slice(0, 100) + "..."
              : piece.hook}
          </p>
        )}

        {piece.content_subtype && (
          <span className="inline-block mt-2 text-xs text-[#C9A96E] bg-[#C9A96E]/10 px-2 py-0.5 rounded-full">
            {piece.content_subtype}
          </span>
        )}

        {/* Audio note for reels */}
        {piece.type === "reel" && (
          <div className="mt-3 flex items-center gap-2">
            <Music className="w-3.5 h-3.5 text-[#6B6B6B] flex-shrink-0" />
            <Input
              placeholder="Audio note..."
              value={audioNote}
              onChange={(e) => setAudioNote(e.target.value)}
              onBlur={saveAudioNote}
              className="text-xs h-7"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <Button
          size="sm"
          className="bg-[#2E7D32]/10 text-[#2E7D32] hover:bg-[#2E7D32]/20 border-0"
          onClick={() => onApprove(piece.id)}
          disabled={piece.status === "approved"}
        >
          <Check className="w-3.5 h-3.5" />
          <span className="hidden sm:inline ml-1">Approve</span>
        </Button>
        <Button
          size="sm"
          className="bg-[#C62828]/10 text-[#C62828] hover:bg-[#C62828]/20 border-0"
          onClick={() => onReject(piece.id)}
          disabled={piece.status === "rejected"}
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline ml-1">Reject</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPreview(piece)}
          className="text-[#6B6B6B]"
        >
          <Eye className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditingHook(true)}
          className="text-[#6B6B6B]"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
