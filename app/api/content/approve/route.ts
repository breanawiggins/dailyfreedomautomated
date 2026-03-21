import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { generateCaption, schedulePost } from "@/lib/buffer";
import { ContentPiece } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { contentPieceId } = await req.json();

    if (!contentPieceId) {
      return NextResponse.json(
        { error: "contentPieceId is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch the full piece for caption generation and media URLs
    const { data: piece, error: fetchError } = await supabase
      .from("content_pieces")
      .select("*")
      .eq("id", contentPieceId)
      .single();

    if (fetchError || !piece) {
      return NextResponse.json(
        { error: fetchError?.message || "Content piece not found" },
        { status: 404 }
      );
    }

    const typedPiece = piece as ContentPiece;
    const profileId = process.env.BUFFER_PROFILE_ID!;
    let bufferPostId: string | null = null;
    let bufferError: string | null = null;

    // Generate caption and schedule to Buffer
    try {
      const caption = generateCaption(typedPiece);
      const mediaUrls = typedPiece.composed_urls || [];
      const isVideo = typedPiece.type === "reel";
      const scheduledAt = typedPiece.post_time || new Date().toISOString();

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

    // Update Supabase — scheduled if Buffer succeeded, approved if not
    const updateData: Record<string, unknown> = bufferPostId
      ? {
          status: "scheduled",
          buffer_post_id: bufferPostId,
          scheduled_time: typedPiece.post_time,
        }
      : { status: "approved" };

    const { error: updateError } = await supabase
      .from("content_pieces")
      .update(updateData)
      .eq("id", contentPieceId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      scheduled: !!bufferPostId,
      buffer_post_id: bufferPostId,
      buffer_error: bufferError,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
