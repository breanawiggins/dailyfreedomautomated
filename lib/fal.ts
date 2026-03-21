import { fal } from "@fal-ai/client";
import type { ImageStyle } from "@/types/content";

fal.config({
  credentials: process.env.FAL_KEY!,
});

// ---------------------------------------------------------------------------
// Locked prompt constants
// ---------------------------------------------------------------------------

const PROMPT_AESTHETIC_FLATLAY =
  "cozy home desk flat lay shot from above, open journal with pen, ceramic coffee mug with latte art, small lit candle flickering gently, dried flowers in mini white vase, gold paper clips scattered, neutral linen surface, gentle ambient motion, soft diffused morning light, no people, no text, muted and slightly desaturated, film photography aesthetic, cream and warm taupe palette, quiet luxury minimal styling, cinematic lifestyle photography, ultra realistic, 4k";

const PROMPT_WOMAN_LIFESTYLE =
  "cozy bedroom reading nook, faceless woman sitting on white linen bed from behind wearing cream knit sweater, open book in lap, lit candle on wooden nightstand, soft muted morning light through sheer white curtains, woman positioned in bottom half of frame, top 40% of image is empty window and curtains with no subject, muted and slightly desaturated, film photography aesthetic, cooler warm tones not orange, cream and taupe palette, no text, cinematic lifestyle photography, ultra realistic, 4k";

const PROMPT_AESTHETIC_ONLY =
  "minimalist cream background with subtle linen texture, soft warm light casting gentle shadow diagonally from left side, small lit cream pillar candle in ceramic holder bottom center, single dried flower stem laying diagonally across frame, no people, no text, no words, muted and slightly desaturated, film photography aesthetic, cream and warm taupe palette, quiet luxury, lots of empty negative space in center and upper half for text overlay, soft bokeh background, cinematic lifestyle photography, ultra realistic, 4k";

const PROMPT_VIDEO =
  "cozy home desk flat lay from above, open journal with pen, ceramic coffee mug with latte art, small lit candle flickering gently, dried flowers in mini white vase, gold paper clips scattered, neutral linen surface, gentle ambient motion, very slow subtle zoom out, soft diffused morning light, no people, no text, muted and slightly desaturated, warm taupe and cream palette, quiet luxury, cinematic lifestyle reel, ultra realistic";

// ---------------------------------------------------------------------------
// Helpers
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

export function getPromptForStyle(imageStyle: ImageStyle): string {
  switch (imageStyle) {
    case "aesthetic_flatlay":
      return PROMPT_AESTHETIC_FLATLAY;
    case "woman_lifestyle":
      return PROMPT_WOMAN_LIFESTYLE;
    case "aesthetic_only":
      return PROMPT_AESTHETIC_ONLY;
  }
}

// ---------------------------------------------------------------------------
// fal.ai generation functions
// ---------------------------------------------------------------------------

export async function generateBackground(imageStyle: ImageStyle): Promise<string> {
  const prompt = getPromptForStyle(imageStyle);
  console.log(`Generating background image (style: ${imageStyle})…`);

  const result = await callWithRetry(() =>
    fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt,
        image_size: { width: 1080, height: 1350 },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
      },
    })
  );

  const url = (result.data as { images: { url: string }[] }).images[0].url;
  console.log("Background image generated:", url);
  return url;
}

export async function generateReelVideo(): Promise<string> {
  console.log("Generating reel video…");

  const result = await callWithRetry(() =>
    fal.subscribe("fal-ai/kling-video/v1.6/pro/text-to-video", {
      input: {
        prompt: PROMPT_VIDEO,
        duration: "5",
        aspect_ratio: "9:16",
        cfg_scale: 0.5,
        negative_prompt:
          "text, watermark, face, harsh lighting, fast motion, jump cuts",
      },
    })
  );

  const url = (result.data as { video: { url: string } }).video.url;
  console.log("Reel video generated:", url);
  return url;
}
