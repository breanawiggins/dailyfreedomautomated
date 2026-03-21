"use client";

import { Button } from "@/components/ui/button";
import { Check, X, CheckSquare } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onApproveSelected: () => void;
  onRejectSelected: () => void;
  onSelectAllPending: () => void;
  onClearSelection: () => void;
}

export default function BulkActionsBar({
  selectedCount,
  onApproveSelected,
  onRejectSelected,
  onSelectAllPending,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 md:bottom-4 left-0 md:left-[240px] right-0 z-30 px-4 pb-4 md:pb-0">
      <div className="max-w-4xl mx-auto bg-[#1A1A1A] rounded-xl shadow-lg px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-medium">
            {selectedCount} selected
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={onSelectAllPending}
          >
            <CheckSquare className="w-3.5 h-3.5 mr-1" />
            Select all pending
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={onClearSelection}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-[#2E7D32] text-white hover:bg-[#2E7D32]/90 border-0"
            onClick={onApproveSelected}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Approve selected
          </Button>
          <Button
            size="sm"
            className="bg-[#C62828] text-white hover:bg-[#C62828]/90 border-0"
            onClick={onRejectSelected}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Reject selected
          </Button>
        </div>
      </div>
    </div>
  );
}
