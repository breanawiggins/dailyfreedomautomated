import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

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
    const { error } = await supabase
      .from("content_pieces")
      .update({ status: "approved" })
      .in("id", contentPieceIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: contentPieceIds.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
