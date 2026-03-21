import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { generateWeeklyBatch } from "@/lib/claude";
import type { NicheSettings } from "@/types";

const DAY_OFFSETS: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

function getNextMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() + daysUntilMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function calculatePostTime(dayOfWeek: string, timeSlot: string): string {
  const monday = getNextMonday();
  const offset = DAY_OFFSETS[dayOfWeek] ?? 0;
  const [hours, minutes] = timeSlot.split(":").map(Number);
  const utcHours = hours - 7;
  const postDate = new Date(monday);
  postDate.setUTCDate(postDate.getUTCDate() + offset);
  postDate.setUTCHours(utcHours, minutes, 0, 0);
  return postDate.toISOString();
}

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: niches, error: nichesError } = await supabase
      .from("niche_settings")
      .select("*")
      .eq("is_active", true);

    if (nichesError) {
      throw new Error(`Failed to fetch niches: ${nichesError.message}`);
    }

    if (!niches || niches.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active niches found",
        results: [],
      });
    }

    const results = [];

    for (const niche of niches as NicheSettings[]) {
      try {
        console.log(`Generating weekly batch for niche: ${niche.name}`);
        const batch = await generateWeeklyBatch(niche);

        const { data: batchRow, error: batchError } = await supabase
          .from("content_batches")
          .insert({
            week_of: batch.week_of,
            niche: niche.name,
            status: "ready",
            total_pieces: batch.pieces.length,
          })
          .select()
          .single();

        if (batchError || !batchRow) {
          throw new Error(`Failed to create batch: ${batchError?.message}`);
        }

        const pieceRows = batch.pieces.map((piece) => ({
          batch_id: batchRow.id,
          type: piece.type,
          status: "draft",
          hook: piece.hook,
          copy: piece.full_copy,
          content_subtype: piece.content_subtype,
          image_style: piece.image_style,
          post_time: calculatePostTime(piece.day_of_week, piece.post_time_slot),
        }));

        const { error: piecesError } = await supabase
          .from("content_pieces")
          .insert(pieceRows);

        if (piecesError) {
          throw new Error(`Failed to save pieces: ${piecesError.message}`);
        }

        results.push({
          niche: niche.name,
          success: true,
          batch_id: batchRow.id,
          pieces_count: batch.pieces.length,
        });

        console.log(
          `Batch created for ${niche.name}: ${batch.pieces.length} pieces`
        );
      } catch (nicheError) {
        console.error(`Failed to generate for ${niche.name}:`, nicheError);
        results.push({
          niche: niche.name,
          success: false,
          error:
            nicheError instanceof Error
              ? nicheError.message
              : "Generation failed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      total_niches: niches.length,
      results,
    });
  } catch (error) {
    console.error("Cron generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron job failed" },
      { status: 500 }
    );
  }
}
