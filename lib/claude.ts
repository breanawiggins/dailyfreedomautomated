import Anthropic from "@anthropic-ai/sdk";
import type { NicheSettings } from "@/types";
import type {
  WeeklyBatchOutput,
  ReelScript,
  Carousel,
  CarouselType,
} from "@/types/content";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `You are a content strategist for @herdailyfreedom, a faceless Instagram account in the make money online / digital freedom niche. The creator is a woman who has made $150k+ online in 2 years selling digital products and courses, and is now building a brand new faceless Instagram account from scratch while documenting the journey and teaching others.

VOICE: First person, warm, woman-to-woman, conversational, never corporate. Personal story first, lesson second. Always specific — real numbers, real steps, real timelines.

ETHICS RULE: Never fabricate income claims. The creator has made $150k+ from digital products and courses over 2 years. Do not invent follower counts for the new account — it is brand new and growing from 0. Be honest about the journey.

CONTENT PILLARS: (1) Proof + Story, (2) Grow the Page, (3) AI + Automation

OUTPUT: Always respond with valid JSON only. No preamble, no explanation, just the JSON object.`;

const HOOK_FORMULAS = `HOOK FORMULAS (rotate between these):
- "Me [doing something relatable] because [bold honest claim]"
- "I used to [pain point]... until [shift]"
- "The biggest mistake I made with [topic]..."
- "[Audience pain point] because you skipped this step"
- "POV: You finally [dream outcome]"
- "If I had to start over with $0 and 0 followers, I would..."
- "What if [dream outcome] only cost you 30 min a day?"
- "[Provocative honest statement]. Here's what I actually did ↓"
- "Nobody tells you this about [topic]..."
- "I've made $150k+ online. Here's what actually moved the needle..."`;

const REEL_FORMAT = `REEL SCRIPT FORMAT:
Reels are 5-7 seconds. Text only on screen — no voiceover. One single text block that stays on screen the entire reel. Hook IS the entire content. Keep it to 2-3 sentences max. Must stop the scroll in the first half second.

Each reel must return:
- hook_text: The main hook line
- full_overlay_text: The complete text shown on screen (2-3 sentences max)
- image_prompt: A description for generating a background image (aesthetic, moody, lifestyle — no text in the image)`;

const CAROUSEL_FORMATS = `CAROUSEL FORMATS:

TYPE 1 - STORY CAROUSEL (7-8 slides):
- Slide 1: Big hook (script font emphasis + clean sans body)
- Slides 2-3: Personal struggle / what wasn't working
- Slide 4: The turning point / realization
- Slide 5: The framework or numbered list (3 things)
- Slide 6: Proof reference (describe what screenshot to use)
- Slide 7: Offer or value bridge
- Slide 8: CTA — Comment "[KEYWORD]" and I'll send you [thing]

TYPE 2 - BLUEPRINT CAROUSEL (7-8 slides):
- Slide 1: Hook + proof number (big result)
- Slides 2-5: Step 1, Step 2, Step 3, Step 4 — each with a script heading + 3-4 bullet points
- Slide 6: Results/proof confirmation slide
- Slide 7: Bridge — "And now I'm sharing it with you"
- Slide 8: CTA — Comment "[KEYWORD]"

TYPE 3 - RESULT-FIRST CAROUSEL (7-8 slides):
- Slide 1: Cover — "How I [big result] with [method]" — most elaborate typography
- Slide 2: Proof slide — revenue screenshot reference + context
- Slides 3-6: Numbered steps with emoji checkmarks and bullet breakdowns
- Slide 7: Profit potential math slide (show the numbers)
- Slide 8: CTA — Comment "[KEYWORD]"

CTA SLIDE CHARACTER LIMITS (critical for rendering):
- The CTA slide heading (setup line) must be max 60 characters
- The CTA keyword must be max 20 characters
- The CTA slide body (subtext below keyword) must be max 80 characters
- Keep CTA text short and punchy. Example: heading="Want the blueprint?", body="& I'll send it straight to your DMs"

Each carousel slide must return:
- slide_number: number
- heading: the main heading text
- body: the body text / bullet points
- font_style_hint: suggested font pairing (e.g. "script heading + sans body")`;

const BRAND_VOICE = `BRAND VOICE RULES:
- Always first person ("I", "me", "my")
- Conversational, warm, woman-to-woman
- Never corporate, never preachy
- Personal story first, lesson second
- Specific and concrete — use real numbers, real steps, real timelines
- Never fabricate income claims beyond what is real ($150k+ in 2 years from digital products and courses)
- Empathetic to beginners — speak to women in 9-5s, moms, women scared to show their face`;

function buildNicheContext(settings: NicheSettings): string {
  return `NICHE SETTINGS:
- Account: @${settings.instagram_handle}
- Niche: ${settings.niche_topic}
- Tone: ${settings.tone}
- Target Audience: ${settings.target_audience}
- Content Pillars: ${settings.content_pillars.join(", ")}
- CTA Keyword: "${settings.cta_keyword}"`;
}

function parseJsonResponse<T>(text: string): T {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return JSON.parse(cleaned) as T;
}

const SINGLE_IMAGE_FORMAT = `SINGLE IMAGE FORMAT:
Single image posts are a beautiful lifestyle background with a short quote or tip overlaid (composed later by Creatomate). Keep copy very concise.

Each single_image must return:
- full_copy: { "quote_text": "short motivational or tip quote", "attribution": "@herdailyfreedom" }`;

const WEEKLY_SCHEDULE = `WEEKLY SCHEDULE (21 pieces total, 3 per day):

Monday:
  1. reel — Proof+Story pillar, image_style: "woman_lifestyle", post_time_slot: "08:00"
  2. carousel — Grow the Page pillar, image_style: "aesthetic_flatlay", post_time_slot: "12:00"
  3. single_image — motivational, image_style: "aesthetic_only", post_time_slot: "18:00"

Tuesday:
  4. reel — AI+Automation pillar, image_style: "aesthetic_flatlay", post_time_slot: "08:00"
  5. carousel — Proof+Story pillar, image_style: "woman_lifestyle", post_time_slot: "12:00"
  6. single_image — Grow the Page tip, image_style: "aesthetic_flatlay", post_time_slot: "18:00"

Wednesday:
  7. reel — Grow the Page pillar, image_style: "aesthetic_flatlay", post_time_slot: "08:00"
  8. carousel — AI+Automation pillar, image_style: "aesthetic_flatlay", post_time_slot: "12:00"
  9. single_image — motivational, image_style: "aesthetic_only", post_time_slot: "18:00"

Thursday:
  10. reel — Proof+Story pillar, image_style: "woman_lifestyle", post_time_slot: "08:00"
  11. carousel — Grow the Page pillar, image_style: "aesthetic_flatlay", post_time_slot: "12:00"
  12. single_image — AI+Automation tip, image_style: "aesthetic_flatlay", post_time_slot: "18:00"

Friday:
  13. reel — Grow the Page pillar, image_style: "aesthetic_flatlay", post_time_slot: "08:00"
  14. carousel — Proof+Story pillar, image_style: "woman_lifestyle", post_time_slot: "12:00"
  15. single_image — motivational, image_style: "aesthetic_only", post_time_slot: "18:00"

Saturday:
  16. reel — AI+Automation pillar, image_style: "aesthetic_flatlay", post_time_slot: "08:00"
  17. carousel — Grow the Page pillar, image_style: "aesthetic_flatlay", post_time_slot: "12:00"
  18. single_image — Proof+Story, image_style: "aesthetic_only", post_time_slot: "18:00"

Sunday:
  19. reel — motivational/mindset, image_style: "aesthetic_only", post_time_slot: "08:00"
  20. carousel — AI+Automation pillar, image_style: "aesthetic_flatlay", post_time_slot: "12:00"
  21. single_image — Grow the Page tip, image_style: "aesthetic_flatlay", post_time_slot: "18:00"`;

export async function generateWeeklyBatch(
  settings: NicheSettings
): Promise<WeeklyBatchOutput> {
  const nicheContext = buildNicheContext(settings);
  const today = new Date();
  const weekOf = today.toISOString().split("T")[0];

  const userPrompt = `${nicheContext}

${BRAND_VOICE}

${HOOK_FORMULAS}

${REEL_FORMAT}

${CAROUSEL_FORMATS}

${SINGLE_IMAGE_FORMAT}

${WEEKLY_SCHEDULE}

Generate EXACTLY 21 pieces — no more, no fewer. Follow the schedule above precisely. Each piece must use a DIFFERENT hook formula — rotate through all 10 formulas and repeat as needed across 21 pieces.

CTA subtext must be maximum 60 characters. Keep it punchy. Example: "and I'll send you my free content blueprint"

Be concise — short hooks, tight copy, no fluff. We need all 21 pieces to fit.

The CTA keyword for all carousels should be "${settings.cta_keyword}".

For each piece return:
- type: "reel" | "carousel" | "single_image"
- content_subtype: "reel" | "carousel" | "single_image" (same as type)
- day_of_week: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"
- post_time_slot: "08:00" | "12:00" | "18:00"
- image_style: "aesthetic_flatlay" | "aesthetic_only" | "woman_lifestyle"
- hook: "the hook text"
- full_copy: for reels: { "hook_text": "...", "full_overlay_text": "...", "image_prompt": "..." }, for carousels: [{ "slide_number": 1, "heading": "...", "body": "...", "font_style_hint": "..." }, ...], for single_image: { "quote_text": "...", "attribution": "@herdailyfreedom" }
- suggested_cta_keyword: "${settings.cta_keyword}"
- content_pillar: "Proof + Story" | "Grow the Page" | "AI + Automation" | "motivational"

Return valid JSON:
{
  "pieces": [ ... all 21 pieces ... ],
  "week_of": "${weekOf}"
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16384,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return parseJsonResponse<WeeklyBatchOutput>(textBlock.text);
}

export async function generateReelScript(
  hook: string,
  pillar: string,
  settings: NicheSettings
): Promise<ReelScript> {
  const nicheContext = buildNicheContext(settings);

  const userPrompt = `${nicheContext}

${BRAND_VOICE}

${HOOK_FORMULAS}

${REEL_FORMAT}

Generate a single reel script for the content pillar "${pillar}" using this hook direction: "${hook}"

Return valid JSON matching this exact structure:
{
  "hook_text": "the main hook line",
  "full_overlay_text": "complete 2-3 sentence text shown on screen",
  "image_prompt": "aesthetic background image description, no text in image"
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return parseJsonResponse<ReelScript>(textBlock.text);
}

export async function generateCarousel(
  type: CarouselType,
  pillar: string,
  topic: string,
  settings: NicheSettings
): Promise<Carousel> {
  const nicheContext = buildNicheContext(settings);

  const typeLabel =
    type === "story"
      ? "STORY CAROUSEL (Type 1)"
      : type === "blueprint"
        ? "BLUEPRINT CAROUSEL (Type 2)"
        : "RESULT-FIRST CAROUSEL (Type 3)";

  const userPrompt = `${nicheContext}

${BRAND_VOICE}

${HOOK_FORMULAS}

${CAROUSEL_FORMATS}

Generate a single ${typeLabel} for the content pillar "${pillar}" on the topic: "${topic}"

The CTA keyword should be "${settings.cta_keyword}".

Return valid JSON matching this exact structure:
{
  "cover_hook": "the cover slide hook text",
  "slides": [
    {
      "slide_number": 1,
      "heading": "slide heading",
      "body": "slide body text / bullet points",
      "font_style_hint": "e.g. script heading + sans body"
    }
  ],
  "cta_keyword": "${settings.cta_keyword}",
  "image_prompt": "aesthetic background image description for the carousel"
}

Generate 7-8 slides following the ${typeLabel} structure exactly.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return parseJsonResponse<Carousel>(textBlock.text);
}

export { anthropic };
