import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  generateWeeklyBatch,
  generateReelScript,
  generateCarousel,
} from "@/lib/claude";
import type { NicheSettings } from "@/types";
import type { CarouselType } from "@/types/content";

interface GenerateRequest {
  batchType: "weekly" | "single";
  contentType?: "reel" | "carousel";
  carouselType?: CarouselType;
  topic?: string;
  pillar?: string;
  settingsId?: string;
}

async function getActiveSettings(
  settingsId?: string
): Promise<NicheSettings> {
  const supabase = createServiceClient();

  if (settingsId) {
    const { data, error } = await supabase
      .from("niche_settings")
      .select("*")
      .eq("id", settingsId)
      .single();
    if (error || !data) throw new Error("Settings not found");
    return data as NicheSettings;
  }

  const { data, error } = await supabase
    .from("niche_settings")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();
  if (error || !data) throw new Error("No active niche settings found");
  return data as NicheSettings;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { batchType, contentType, carouselType, topic, pillar, settingsId } =
      body;

    const settings = await getActiveSettings(settingsId);

    if (batchType === "weekly") {
      const batch = await generateWeeklyBatch(settings);

      const supabase = createServiceClient();
      const { data: batchRow, error: batchError } = await supabase
        .from("content_batches")
        .insert({
          week_of: batch.week_of,
          niche: settings.name,
          status: "ready",
          total_pieces: batch.pieces.length,
        })
        .select()
        .single();

      if (batchError || !batchRow) {
        throw new Error(`Failed to create batch: ${batchError?.message}`);
      }

      const pieceRows = batch.pieces.map((piece) => ({
        batch_id: batchRow.id,
        type: piece.type,
        status: "draft",
        hook: piece.hook,
        copy: piece.full_copy,
      }));

      const { error: piecesError } = await supabase
        .from("content_pieces")
        .insert(pieceRows);

      if (piecesError) {
        throw new Error(`Failed to save pieces: ${piecesError.message}`);
      }

      return NextResponse.json({
        success: true,
        batch_id: batchRow.id,
        pieces_count: batch.pieces.length,
        batch,
      });
    }

    // Single piece generation
    if (contentType === "reel") {
      const hook = topic || "general hook";
      const reelPillar = pillar || settings.content_pillars[0];
      const reel = await generateReelScript(hook, reelPillar, settings);
      return NextResponse.json({ success: true, type: "reel", content: reel });
    }

    if (contentType === "carousel") {
      const carType: CarouselType = carouselType || "story";
      const carPillar = pillar || settings.content_pillars[0];
      const carTopic = topic || settings.niche_topic;
      const carousel = await generateCarousel(
        carType,
        carPillar,
        carTopic,
        settings
      );
      return NextResponse.json({
        success: true,
        type: "carousel",
        content: carousel,
      });
    }

    return NextResponse.json(
      { error: "Invalid request: specify batchType='weekly' or contentType for single generation" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
