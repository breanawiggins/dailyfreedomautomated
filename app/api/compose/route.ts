import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  composeReel,
  composeFullCarousel,
  composeSingleImagePost,
} from "@/lib/creatomate";

export async function POST(request: NextRequest) {
  try {
    const { contentPieceId } = (await request.json()) as {
      contentPieceId: string;
    };

    if (!contentPieceId) {
      return NextResponse.json(
        { error: "contentPieceId is required" },
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
        { error: `Content piece not found: ${fetchError?.message}` },
        { status: 404 }
      );
    }

    if (!piece.image_urls || piece.image_urls.length === 0) {
      return NextResponse.json(
        { error: "Content piece has no image_urls — generate assets first" },
        { status: 400 }
      );
    }

    console.log(`Composing piece ${piece.id} (type: ${piece.type})`);

    let composedUrls: string[];

    if (piece.type === "reel") {
      const copy = piece.copy as Record<string, unknown>;
      const hookText =
        (copy.full_overlay_text as string) ??
        (copy.hook_text as string) ??
        piece.hook ??
        "";
      const url = await composeReel(piece.image_urls[0], hookText);
      composedUrls = [url];
    } else if (piece.type === "carousel") {
      // Pass CTA keyword to the carousel compositor
      const pieceWithKeyword = {
        ...piece,
        suggested_cta_keyword: "FREEDOM", // Default keyword for @herdailyfreedom
      };
      composedUrls = await composeFullCarousel(pieceWithKeyword, piece.image_urls[0]);
    } else if (piece.type === "single_image") {
      const copy = piece.copy as Record<string, unknown>;
      const quoteText =
        (copy.quote_text as string) ?? piece.hook ?? "";
      const secondLine = copy.second_line as string | undefined;
      const url = await composeSingleImagePost(
        piece.image_urls[0],
        quoteText,
        secondLine
      );
      composedUrls = [url];
    } else {
      return NextResponse.json(
        { error: `Unknown content type: ${piece.type}` },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("content_pieces")
      .update({ composed_urls: composedUrls, status: "composed" })
      .eq("id", piece.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update piece: ${updateError.message}`);
    }

    console.log(
      `Piece ${piece.id} composed: ${composedUrls.length} output(s)`
    );

    return NextResponse.json({
      success: true,
      piece: updated,
      composed_urls: composedUrls,
    });
  } catch (error) {
    console.error("Compose error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Composition failed",
      },
      { status: 500 }
    );
  }
}
