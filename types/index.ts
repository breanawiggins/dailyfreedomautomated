// Content Pipeline Types for DailyFreedomAutomated

export type ContentType = "reel" | "carousel" | "single_image";
export type ContentStatus = "draft" | "asset_ready" | "composed" | "approved" | "rejected" | "scheduled";
export type BatchStatus = "generating" | "ready" | "partial";

export interface ContentBatch {
  id: string;
  created_at: string;
  week_of: string;
  niche: string;
  status: BatchStatus;
  total_pieces: number;
}

export interface ContentPiece {
  id: string;
  batch_id: string;
  created_at: string;
  type: ContentType;
  status: ContentStatus;
  hook: string;
  copy: Record<string, unknown> | string[];
  image_urls: string[];
  composed_urls: string[];
  buffer_post_id: string | null;
  scheduled_time: string | null;
  notes: string | null;
  post_time: string | null;
  content_subtype: string | null;
  image_style: string | null;
}

export interface NicheSettings {
  id: string;
  name: string;
  niche_topic: string;
  tone: string;
  target_audience: string;
  content_pillars: string[];
  cta_keyword: string;
  instagram_handle: string;
  is_active: boolean;
}
