import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { deletePost } from "@/lib/buffer";

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

    // Fetch piece to check if it has a Buffer post
    const { data: piece, error: fetchError } = await supabase
      .from("content_pieces")
      .select("status, buffer_post_id")
      .eq("id", contentPieceId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // If scheduled with a buffer_post_id, delete from Buffer
    let bufferDeleted = false;
    if (piece?.status === "scheduled" && piece?.buffer_post_id) {
      try {
        await deletePost(piece.buffer_post_id);
        bufferDeleted = true;
      } catch {
        // Log but don't block rejection
      }
    }

    const { error } = await supabase
      .from("content_pieces")
      .update({
        status: "rejected",
        buffer_post_id: null,
      })
      .eq("id", contentPieceId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, buffer_deleted: bufferDeleted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
