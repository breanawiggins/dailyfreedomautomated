import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { composeReel } from "@/lib/creatomate";

export async function POST(request: NextRequest) {
  try {
    const { contentPieceId } = await request.json();

    if (!contentPieceId) {
      return NextResponse.json(
        { error: "Missing contentPieceId" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: piece, error: fetchError } = await supabase
      .from("content_pieces")
      .select("*")
      .eq("id", contentPieceId)
      .single();

    if (fetchError || !piece) {
      return NextResponse.json(
        { error: "Content piece not found" },
        { status: 404 }
      );
    }

    if (!piece.audio_url) {
      return NextResponse.json(
        { error: "No audio URL found on this piece" },
        { status: 400 }
      );
    }

    // Get video source — original Kling video from image_urls[0]
    const videoUrl = piece.image_urls?.[0];
    if (!videoUrl) {
      return NextResponse.json(
        { error: "No video source found in image_urls" },
        { status: 400 }
      );
    }

    const hookText =
      piece.type === "reel" && piece.copy && typeof piece.copy === "object" && !Array.isArray(piece.copy)
        ? (piece.copy as Record<string, string>).full_overlay_text || piece.hook
        : piece.hook;

    // Re-render reel with audio
    const composedUrl = await composeReel(videoUrl, hookText, piece.audio_url);

    // Update composed_urls and status
    const composedUrls = [composedUrl];
    const { error: updateError } = await supabase
      .from("content_pieces")
      .update({
        composed_urls: composedUrls,
        status: "composed",
      })
      .eq("id", contentPieceId);

    if (updateError) {
      throw new Error(`Failed to update piece: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      composed_urls: composedUrls,
    });
  } catch (error) {
    console.error("Rerender audio error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Re-render failed" },
      { status: 500 }
    );
  }
}
