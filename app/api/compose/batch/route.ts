import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  composeReel,
  composeFullCarousel,
  composeSingleImagePost,
} from "@/lib/creatomate";

async function composePiece(
  piece: {
    id: string;
    type: string;
    hook: string | null;
    copy: Record<string, unknown> | unknown[];
    image_urls: string[];
  },
  supabase: ReturnType<typeof createServiceClient>
): Promise<{ id: string; success: boolean; error?: string }> {
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
    composedUrls = await composeFullCarousel(
      { copy: piece.copy as Record<string, unknown>, image_urls: piece.image_urls },
      piece.image_urls[0]
    );
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
    return { id: piece.id, success: false, error: `Unknown type: ${piece.type}` };
  }

  const { error } = await supabase
    .from("content_pieces")
    .update({ composed_urls: composedUrls, status: "composed" })
    .eq("id", piece.id);

  if (error) throw new Error(`DB update failed: ${error.message}`);

  return { id: piece.id, success: true };
}

export async function POST(request: NextRequest) {
  try {
    const { batchId } = (await request.json()) as { batchId: string };

    if (!batchId) {
      return NextResponse.json(
        { error: "batchId is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch pieces that have image_urls populated but no composed_urls
    const { data: pieces, error: fetchError } = await supabase
      .from("content_pieces")
      .select("*")
      .eq("batch_id", batchId)
      .not("image_urls", "eq", "[]");

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch pieces: ${fetchError.message}` },
        { status: 500 }
      );
    }

    // Filter to pieces that need composing (no composed_urls yet)
    const toCompose = (pieces ?? []).filter(
      (p: { composed_urls: string[] | null }) =>
        !p.composed_urls || p.composed_urls.length === 0
    );

    if (toCompose.length === 0) {
      return NextResponse.json(
        { error: "No pieces need composing for this batch" },
        { status: 404 }
      );
    }

    console.log(
      `Composing batch ${batchId}: ${toCompose.length} pieces`
    );

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const piece of toCompose) {
      try {
        const result = await composePiece(piece, supabase);
        results.push(result);
        console.log(`[${piece.id}] Composition succeeded`);
      } catch (error) {
        console.error(
          `[${piece.id}] First attempt failed, retrying in 10s…`,
          error
        );
        await new Promise((r) => setTimeout(r, 10_000));

        try {
          const result = await composePiece(piece, supabase);
          results.push(result);
          console.log(`[${piece.id}] Composition succeeded on retry`);
        } catch (retryError) {
          const errMsg =
            retryError instanceof Error
              ? retryError.message
              : "Unknown error";
          console.error(
            `[${piece.id}] Retry also failed, skipping:`,
            errMsg
          );
          results.push({ id: piece.id, success: false, error: errMsg });
        }
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `Batch ${batchId} compose complete: ${succeeded} succeeded, ${failed} failed`
    );

    return NextResponse.json({
      success: true,
      batch_id: batchId,
      total: toCompose.length,
      succeeded,
      failed,
      results,
    });
  } catch (error) {
    console.error("Batch compose error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Batch composition failed",
      },
      { status: 500 }
    );
  }
}
