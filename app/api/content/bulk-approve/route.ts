import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { generateCaption, schedulePost } from "@/lib/buffer";
import { ContentPiece } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { contentPieceIds } = await req.json();

    if (!contentPieceIds || !Array.isArray(contentPieceIds) || contentPieceIds.length === 0) {
      return NextResponse.json(
        { error: "contentPieceIds array is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const profileId = process.env.BUFFER_PROFILE_ID!;

    // Fetch all pieces
    const { data: pieces, error: fetchError } = await supabase
      .from("content_pieces")
      .select("*")
      .in("id", contentPieceIds);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const results: {
      id: string;
      scheduled: boolean;
      buffer_post_id: string | null;
      error: string | null;
    }[] = [];

    // Process each piece individually
    for (const piece of (pieces || []) as ContentPiece[]) {
      let bufferPostId: string | null = null;
      let bufferError: string | null = null;

      try {
        const caption = generateCaption(piece);
        const mediaUrls = piece.composed_urls || [];
        const isVideo = piece.type === "reel";
        const scheduledAt = piece.post_time || new Date().toISOString();

        const result = await schedulePost({
          profileId,
          caption,
          mediaUrls,
          scheduledAt,
          isVideo,
        });

        if (result.success && result.updates?.length > 0) {
          bufferPostId = result.updates[0].id;
        }
      } catch (err) {
        bufferError = err instanceof Error ? err.message : "Buffer scheduling failed";
      }

      const updateData: Record<string, unknown> = bufferPostId
        ? {
            status: "scheduled",
            buffer_post_id: bufferPostId,
            scheduled_time: piece.post_time,
          }
        : { status: "approved" };

      await supabase
        .from("content_pieces")
        .update(updateData)
        .eq("id", piece.id);

      results.push({
        id: piece.id,
        scheduled: !!bufferPostId,
        buffer_post_id: bufferPostId,
        error: bufferError,
      });
    }

    const scheduledCount = results.filter((r) => r.scheduled).length;
    const errorCount = results.filter((r) => r.error).length;

    return NextResponse.json({
      success: true,
      count: contentPieceIds.length,
      scheduled: scheduledCount,
      errors: errorCount,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
