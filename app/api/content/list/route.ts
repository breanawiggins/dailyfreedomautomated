import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const batch_id = searchParams.get("batch_id");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const supabase = createServiceClient();
    let query = supabase
      .from("content_pieces")
      .select("*")
      .order("post_time", { ascending: true });

    if (batch_id) {
      query = query.eq("batch_id", batch_id);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
