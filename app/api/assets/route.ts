import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { generateBackground, generateReelVideo } from "@/lib/fal";
import type { ImageStyle } from "@/types/content";

export async function POST(request: NextRequest) {
  try {
    const { contentPieceId } = (await request.json()) as { contentPieceId: string };

    if (!contentPieceId) {
      return NextResponse.json({ error: "contentPieceId is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

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

    const imageStyle = (piece.image_style || "aesthetic_flatlay") as ImageStyle;

    if (piece.type === "carousel" || piece.type === "single_image") {
      const imageUrl = await generateBackground(imageStyle);

      const imageUrls = piece.type === "carousel"
        ? Array(Array.isArray(piece.copy) ? piece.copy.length : 5).fill(imageUrl) as string[]
        : [imageUrl];

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
      const videoUrl = await generateReelVideo();

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
