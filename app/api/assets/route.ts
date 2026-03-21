import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  generateCarouselBackground,
  generateReelVideo,
  buildImagePrompt,
  buildVideoPrompt,
  LIFESTYLE_SETTINGS,
} from "@/lib/fal";
import type { CarouselSlide } from "@/types/content";

function randomSetting(): string {
  return LIFESTYLE_SETTINGS[Math.floor(Math.random() * LIFESTYLE_SETTINGS.length)];
}

const TIMES_OF_DAY = ["morning", "golden hour", "afternoon", "soft evening light"];

function randomTimeOfDay(): string {
  return TIMES_OF_DAY[Math.floor(Math.random() * TIMES_OF_DAY.length)];
}

export async function POST(request: NextRequest) {
  try {
    const { contentPieceId } = (await request.json()) as { contentPieceId: string };

    if (!contentPieceId) {
      return NextResponse.json({ error: "contentPieceId is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch the content piece
    const { data: piece, error: fetchError } = await supabase
      .from("content_pieces")
      .select("*")
      .eq("id", contentPieceId)
      .single();

    if (fetchError || !piece) {
      return NextResponse.json(
        { error: `Content piece not found: ${fetchError?.message}` },
        { status: 404 }
      );
    }

    console.log(`Generating assets for piece ${piece.id} (type: ${piece.type})`);

    const setting = randomSetting();

    if (piece.type === "carousel") {
      const slides = piece.copy as CarouselSlide[];
      const slideCount = Array.isArray(slides) ? slides.length : 5;

      const imagePrompt = buildImagePrompt(setting, randomTimeOfDay(), Math.random() > 0.5);
      console.log("Carousel image prompt:", imagePrompt);

      const imageUrls = await generateCarouselBackground(imagePrompt, slideCount);

      const { data: updated, error: updateError } = await supabase
        .from("content_pieces")
        .update({ image_urls: imageUrls })
        .eq("id", piece.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update piece: ${updateError.message}`);
      }

      return NextResponse.json({ success: true, piece: updated });
    }

    if (piece.type === "reel") {
      const videoPrompt = buildVideoPrompt(setting);
      console.log("Reel video prompt:", videoPrompt);

      const videoUrl = await generateReelVideo(videoPrompt);

      const { data: updated, error: updateError } = await supabase
        .from("content_pieces")
        .update({ image_urls: [videoUrl] })
        .eq("id", piece.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update piece: ${updateError.message}`);
      }

      return NextResponse.json({ success: true, piece: updated });
    }

    return NextResponse.json(
      { error: `Unknown content type: ${piece.type}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Asset generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Asset generation failed" },
      { status: 500 }
    );
  }
}
