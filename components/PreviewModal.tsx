"use client";

import { useState } from "react";
import { ContentPiece } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Film,
  Images,
  Image as ImageIcon,
} from "lucide-react";

interface PreviewModalProps {
  piece: ContentPiece | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function PreviewModal({
  piece,
  open,
  onClose,
  onApprove,
  onReject,
}: PreviewModalProps) {
  const [slideIndex, setSlideIndex] = useState(0);

  if (!piece) return null;

  const urls = piece.composed_urls?.length
    ? piece.composed_urls
    : piece.image_urls?.length
    ? piece.image_urls
    : [];

  const isVideo =
    piece.type === "reel" && urls[0]?.match(/\.(mp4|webm|mov)/i);

  const typeLabel =
    piece.type === "reel"
      ? "Reel"
      : piece.type === "carousel"
      ? "Carousel"
      : "Single Image";
  const TypeIcon =
    piece.type === "reel"
      ? Film
      : piece.type === "carousel"
      ? Images
      : ImageIcon;

  const scheduleTime = piece.post_time
    ? new Date(piece.post_time).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const copyData = piece.copy;
  let bodyText = "";
  if (Array.isArray(copyData)) {
    bodyText = copyData.join("\n");
  } else if (typeof copyData === "object" && copyData !== null) {
    bodyText = JSON.stringify(copyData, null, 2);
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="w-4 h-4" />
            {typeLabel} Preview
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Media preview */}
          <div className="relative bg-[#F5F5F5] rounded-lg overflow-hidden aspect-[4/5]">
            {urls.length > 0 ? (
              isVideo ? (
                <video
                  src={urls[0]}
                  controls
                  className="w-full h-full object-cover"
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urls[slideIndex] || urls[0]}
                  alt={piece.hook}
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-[#6B6B6B] text-sm">
                No preview available
              </div>
            )}

            {piece.type === "carousel" && urls.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setSlideIndex((i) => (i > 0 ? i - 1 : urls.length - 1))
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setSlideIndex((i) => (i < urls.length - 1 ? i + 1 : 0))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {urls.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSlideIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === slideIndex ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Content details */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-1">
                Hook
              </p>
              <p className="text-sm font-medium text-[#1A1A1A]">
                {piece.hook}
              </p>
            </div>

            {scheduleTime && (
              <div>
                <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-1">
                  Scheduled
                </p>
                <p className="text-sm text-[#1A1A1A]">{scheduleTime}</p>
              </div>
            )}

            {piece.content_subtype && (
              <div>
                <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-1">
                  Subtype
                </p>
                <span className="text-xs text-[#C9A96E] bg-[#C9A96E]/10 px-2 py-0.5 rounded-full">
                  {piece.content_subtype}
                </span>
              </div>
            )}

            {bodyText && (
              <div>
                <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-1">
                  Copy
                </p>
                <pre className="text-xs text-[#1A1A1A] whitespace-pre-wrap bg-[#FAF9F7] p-3 rounded-lg max-h-40 overflow-y-auto">
                  {bodyText}
                </pre>
              </div>
            )}

            {piece.notes && (
              <div>
                <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-1">
                  Notes
                </p>
                <p className="text-sm text-[#6B6B6B]">{piece.notes}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-[#2E7D32] text-white hover:bg-[#2E7D32]/90 border-0"
                onClick={() => {
                  onApprove(piece.id);
                  onClose();
                }}
                disabled={piece.status === "approved"}
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                className="flex-1 bg-[#C62828] text-white hover:bg-[#C62828]/90 border-0"
                onClick={() => {
                  onReject(piece.id);
                  onClose();
                }}
                disabled={piece.status === "rejected"}
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
