import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { contentPieceId, newHook } = await req.json();

    if (!contentPieceId || newHook === undefined) {
      return NextResponse.json(
        { error: "contentPieceId and newHook are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("content_pieces")
      .update({ hook: newHook })
      .eq("id", contentPieceId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
