import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const contentPieceId = formData.get("contentPieceId") as string | null;

    if (!file || !contentPieceId) {
      return NextResponse.json(
        { error: "Missing file or contentPieceId" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
    if (!["mp3", "m4a", "wav"].includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Accepted: .mp3, .m4a, .wav" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Ensure audio bucket exists (idempotent)
    await supabase.storage.createBucket("audio", { public: true }).catch(() => {
      // Bucket already exists — that's fine
    });

    const filename = `${contentPieceId}-audio.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("audio")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("audio")
      .getPublicUrl(filename);

    const audioUrl = urlData.publicUrl;

    // Update content_pieces with audio URL
    const { error: updateError } = await supabase
      .from("content_pieces")
      .update({ audio_url: audioUrl })
      .eq("id", contentPieceId);

    if (updateError) {
      throw new Error(`Failed to update piece: ${updateError.message}`);
    }

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error("Upload audio error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
