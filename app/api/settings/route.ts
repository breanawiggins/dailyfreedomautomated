import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("niche_settings")
      .select("*")
      .eq("is_active", true)
      .single();

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

export async function POST(req: NextRequest) {
  try {
    const updates = await req.json();
    const supabase = createServiceClient();

    // Get the active niche setting ID first
    const { data: current, error: fetchError } = await supabase
      .from("niche_settings")
      .select("id")
      .eq("is_active", true)
      .single();

    if (fetchError || !current) {
      return NextResponse.json(
        { error: fetchError?.message || "No active niche settings found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("niche_settings")
      .update(updates)
      .eq("id", current.id)
      .select()
      .single();

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
