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

async function generateAssetsForPiece(
  piece: { id: string; type: string; copy: unknown },
  supabase: ReturnType<typeof createServiceClient>
): Promise<{ id: string; success: boolean; error?: string }> {
  const setting = randomSetting();

  if (piece.type === "carousel") {
    const slides = piece.copy as CarouselSlide[];
    const slideCount = Array.isArray(slides) ? slides.length : 5;
    const imagePrompt = buildImagePrompt(setting, randomTimeOfDay(), Math.random() > 0.5);
    console.log(`[${piece.id}] Carousel prompt: ${imagePrompt}`);

    const imageUrls = await generateCarouselBackground(imagePrompt, slideCount);

    const { error } = await supabase
      .from("content_pieces")
      .update({ image_urls: imageUrls })
      .eq("id", piece.id);

    if (error) throw new Error(`DB update failed: ${error.message}`);
    return { id: piece.id, success: true };
  }

  if (piece.type === "reel") {
    const videoPrompt = buildVideoPrompt(setting);
    console.log(`[${piece.id}] Reel prompt: ${videoPrompt}`);

    const videoUrl = await generateReelVideo(videoPrompt);

    const { error } = await supabase
      .from("content_pieces")
      .update({ image_urls: [videoUrl] })
      .eq("id", piece.id);

    if (error) throw new Error(`DB update failed: ${error.message}`);
    return { id: piece.id, success: true };
  }

  return { id: piece.id, success: false, error: `Unknown type: ${piece.type}` };
}

export async function POST(request: NextRequest) {
  try {
    const { batchId } = (await request.json()) as { batchId: string };

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: pieces, error: fetchError } = await supabase
      .from("content_pieces")
      .select("*")
      .eq("batch_id", batchId)
      .eq("status", "draft");

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch pieces: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!pieces || pieces.length === 0) {
      return NextResponse.json(
        { error: "No draft pieces found for this batch" },
        { status: 404 }
      );
    }

    console.log(`Processing batch ${batchId}: ${pieces.length} pieces`);

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const piece of pieces) {
      try {
        const result = await generateAssetsForPiece(piece, supabase);
        results.push(result);
        console.log(`[${piece.id}] Asset generation succeeded`);
      } catch (error) {
        // Retry once after 10 seconds
        console.error(`[${piece.id}] First attempt failed, retrying in 10s…`, error);
        await new Promise((r) => setTimeout(r, 10_000));

        try {
          const result = await generateAssetsForPiece(piece, supabase);
          results.push(result);
          console.log(`[${piece.id}] Asset generation succeeded on retry`);
        } catch (retryError) {
          const errMsg = retryError instanceof Error ? retryError.message : "Unknown error";
          console.error(`[${piece.id}] Retry also failed, skipping:`, errMsg);
          results.push({ id: piece.id, success: false, error: errMsg });
        }
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`Batch ${batchId} complete: ${succeeded} succeeded, ${failed} failed`);

    return NextResponse.json({
      success: true,
      batch_id: batchId,
      total: pieces.length,
      succeeded,
      failed,
      results,
    });
  } catch (error) {
    console.error("Batch asset generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch generation failed" },
      { status: 500 }
    );
  }
}
