import { GoogleGenAI } from "@google/genai";
import { createServiceClient } from "@/lib/supabase";
import type { ImageStyle } from "@/types/content";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// 15-scene rotation pool (replaces 3 locked prompts)
// ---------------------------------------------------------------------------

/** Flatlay scenes (indices 0-5) — for aesthetic_flatlay pieces */
const FLATLAY_SCENES: string[] = [
  "cozy home desk flat lay from above, open journal with gold pen, ceramic latte mug, small lit candle in ceramic holder, dried flowers in white vase, gold paper clips, neutral linen surface, soft morning light, no people, no text, cream and taupe, cinematic lifestyle photography, ultra realistic",
  "overhead flat lay on white marble surface, open MacBook, ceramic matcha latte, fresh white peonies in glass vase, rose gold pen, small notebook, morning window light, no people, no text, clean minimal aesthetic, ultra realistic",
  "cozy desk corner from above, spiral notebook open to blank page, espresso in small ceramic cup, single eucalyptus sprig, reading glasses, warm afternoon light, neutral beige tones, no people, no text, quiet luxury, ultra realistic",
  "flat lay on rustic wooden table, open book face down, ceramic candle burning, dried lavender bunch, small succulent, soft diffused light, muted sage and cream tones, no people, no text, cottagecore minimal, ultra realistic",
  "minimal desk setup flat lay, closed laptop with sticker, iced coffee with cream swirl, small crystal, airpods case, linen napkin, bright airy light, cream and white tones, no people, no text, clean aesthetic, ultra realistic",
  "overhead shot of bed with white linen, open journal, morning coffee, book splayed open, reading glasses, candle on nightstand visible at edge, soft morning light, no people, no text, slow morning aesthetic, ultra realistic",
];

/** Woman scenes (indices 0-4) — for woman_lifestyle pieces */
const WOMAN_SCENES: string[] = [
  "faceless woman from behind sitting at window cafe table, iced latte on table, open laptop, golden afternoon light through glass, cream linen top, hair down, no face visible, cinematic, ultra realistic",
  "faceless woman from behind sitting cross legged on white bed in oversized cream sweater, looking out window, morning light, white linen, candle on nightstand, peaceful and slow, ultra realistic",
  "faceless woman from behind walking on quiet street holding coffee cup, wearing neutral trench coat, soft autumn light, blurred background, cinematic lifestyle, ultra realistic",
  "faceless woman from behind sitting at outdoor cafe table, golden hour light, journal open, espresso on table, greenery in background, cream and warm tones, ultra realistic",
  "faceless woman from behind lying on white linen bed reading book, knit blanket, afternoon light through sheer curtains, candle burning, peaceful cozy aesthetic, ultra realistic",
];

/** Aesthetic scenes (indices 0-3) — for aesthetic_only pieces */
const AESTHETIC_SCENES: string[] = [
  "minimalist cream wall background, single lit pillar candle on concrete surface, dried pampas grass in ceramic vase, soft window shadow casting diagonally, no people, no text, quiet luxury, ultra realistic",
  "cozy coffee shop corner, two ceramic mugs on wooden table, steam rising, autumn leaves visible through window, warm amber light, no people, no text, cinematic lifestyle, ultra realistic",
  "bedside table vignette, stack of books with gold bookmarks, ceramic lamp glowing warmly, small candle, dried flower in bud vase, evening light, no people, no text, quiet luxury interior, ultra realistic",
  "morning kitchen window, ceramic pour over coffee setup, steam rising from mug, fresh flowers in mason jar, soft white light, clean minimal, no people, no text, slow morning lifestyle, ultra realistic",
];

/** Map image_style to its scene pool */
function getScenePool(imageStyle: ImageStyle): string[] {
  switch (imageStyle) {
    case "aesthetic_flatlay":
      return FLATLAY_SCENES;
    case "woman_lifestyle":
      return WOMAN_SCENES;
    case "aesthetic_only":
      return AESTHETIC_SCENES;
  }
}

/**
 * Pick a scene from the correct pool that hasn't been used yet.
 * If all scenes in pool are used, reset and allow reuse.
 */
export function getSceneForStyle(
  imageStyle: ImageStyle,
  usedScenes: number[]
): { index: number; prompt: string } {
  const pool = getScenePool(imageStyle);
  const allIndices = pool.map((_, i) => i);
  const available = allIndices.filter((i) => !usedScenes.includes(i));

  // If all scenes used, reset
  const candidates = available.length > 0 ? available : allIndices;

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  return { index: picked, prompt: pool[picked] };
}

/**
 * Get scene prompt by index (for looking up a stored scene).
 */
export function getScenePrompt(imageStyle: ImageStyle, sceneIndex: number): string {
  const pool = getScenePool(imageStyle);
  return pool[sceneIndex % pool.length];
}

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error("Imagen 3 call failed, retrying in 10s…", error);
    await new Promise((r) => setTimeout(r, 10_000));
    return await fn();
  }
}

// ---------------------------------------------------------------------------
// Upload to Supabase Storage and return public URL
// ---------------------------------------------------------------------------

async function uploadToSupabase(imageBytes: Buffer, filename: string): Promise<string> {
  const supabase = createServiceClient();
  const bucket = "generated-images";

  // Ensure bucket exists (idempotent)
  await supabase.storage.createBucket(bucket, { public: true }).catch(() => {
    // Bucket may already exist
  });

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, imageBytes, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
  return urlData.publicUrl;
}

// ---------------------------------------------------------------------------
// Imagen 3 generation via @google/genai SDK
// ---------------------------------------------------------------------------

export async function generateBackground(
  imageStyle: ImageStyle,
  sceneIndex?: number
): Promise<string> {
  // If sceneIndex provided, use that scene; otherwise pick a random one
  const pool = getScenePool(imageStyle);
  const idx = sceneIndex !== undefined ? sceneIndex % pool.length : Math.floor(Math.random() * pool.length);
  const prompt = pool[idx];

  console.log(`Generating Imagen 3 background (style: ${imageStyle}, scene: ${idx})…`);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const result = await callWithRetry(async () => {
    const response = await ai.models.generateImages({
      model: "imagen-4.0-generate-001",
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "3:4", // portrait for carousels/single images (896x1280)
      },
    });
    return response;
  });

  if (!result.generatedImages || result.generatedImages.length === 0) {
    throw new Error("No image generated by Imagen 3");
  }

  const image = result.generatedImages[0];
  const imageBytes = image.image?.imageBytes;
  if (!imageBytes) {
    throw new Error("Imagen 3 returned empty image data");
  }

  // Convert to Buffer and upload to Supabase Storage
  const buffer = Buffer.from(imageBytes as string, "base64");
  const filename = `${imageStyle}/${randomUUID()}.png`;
  const publicUrl = await uploadToSupabase(buffer, filename);

  console.log("Imagen 3 background generated and uploaded:", publicUrl);
  return publicUrl;
}
