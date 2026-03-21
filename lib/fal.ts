import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY!,
});

// ---------------------------------------------------------------------------
// Lifestyle settings pool — rotated through for image/video prompts
// ---------------------------------------------------------------------------
export const LIFESTYLE_SETTINGS = [
  "cozy home desk with open laptop, pink tulips in glass vase, croissant on ceramic plate, lit candle, journal and pens, warm morning light through window",
  "bedroom reading nook with stacked books, lit candle, knit throw blanket, soft lamp light",
  "coffee shop window seat with iced coffee in tall glass, open journal, warm afternoon light streaming in",
  "outdoor patio at golden hour with open book on wooden table, warm amber light, lush greenery",
  "bedside table with ceramic lamp, lit candle, stack of books, soft morning light through sheer curtains",
  "kitchen counter with coffee being poured, marble surface, small vase of flowers, warm morning light",
  "cozy living room with throw blanket draped over sofa, laptop open, warm lamp glow, neutral tones",
  "home office desk flat lay with laptop, leather notebook, gold pen, coffee cup, neutral warm tones",
  "balcony at sunset with warm golden tones, city skyline in soft focus, potted plants",
  "bed with white linen sheets, open journal, coffee cup on tray, peaceful soft morning light",
];

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

export function buildImagePrompt(
  setting: string,
  timeOfDay: string,
  hasWoman: boolean
): string {
  const womanClause = hasWoman
    ? "faceless woman seen from behind, "
    : "";
  return `${setting}, warm neutral tones, soft natural light, cozy and aspirational, ${womanClause}shot from behind/above/side, no text, cinematic lifestyle photography, cream and warm beige palette, ${timeOfDay}, ultra realistic, 4k`;
}

export function buildVideoPrompt(setting: string): string {
  return `${setting}, gentle ambient motion, slow zoom or subtle camera drift, warm natural light, cozy and cinematic, no text, lifestyle reel aesthetic, faceless, soft life vibes`;
}

// ---------------------------------------------------------------------------
// fal.ai generation functions
// ---------------------------------------------------------------------------

async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error("fal.ai call failed, retrying in 10s…", error);
    await new Promise((r) => setTimeout(r, 10_000));
    return await fn();
  }
}

export async function generateCarouselBackground(
  imagePrompt: string,
  slideCount: number
): Promise<string[]> {
  console.log("Generating carousel background image…");

  const result = await callWithRetry(() =>
    fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: imagePrompt,
        image_size: { width: 1080, height: 1350 },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
      },
    })
  );

  const url = (result.data as { images: { url: string }[] }).images[0].url;
  console.log("Carousel background generated:", url);
  return Array(slideCount).fill(url) as string[];
}

export async function generateReelVideo(
  videoPrompt: string
): Promise<string> {
  console.log("Generating reel video…");

  const result = await callWithRetry(() =>
    fal.subscribe("fal-ai/kling-video/v1.6/standard/text-to-video", {
      input: {
        prompt: videoPrompt,
        duration: "5",
        aspect_ratio: "9:16",
      },
    })
  );

  const url = (result.data as { video: { url: string } }).video.url;
  console.log("Reel video generated:", url);
  return url;
}
