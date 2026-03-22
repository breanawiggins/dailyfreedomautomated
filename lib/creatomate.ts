// Creatomate Compositing Layer — renders compositions via the Creatomate REST API

const CREATOMATE_API_URL = "https://api.creatomate.com/v2";
const POLL_INTERVAL_MS = 5_000;
const RENDER_TIMEOUT_MS = 120_000;

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.CREATOMATE_API_KEY!}`,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Core render helper
// ---------------------------------------------------------------------------

interface CreatomateElement {
  type: string;
  [key: string]: unknown;
}

interface RenderComposition {
  output_format: "jpg" | "mp4";
  width: number;
  height: number;
  frame_rate?: number;
  duration?: number;
  elements: CreatomateElement[];
}

async function renderComposition(composition: RenderComposition): Promise<string> {
  const res = await fetch(`${CREATOMATE_API_URL}/renders`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(composition),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Creatomate render request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  // The API returns an array; take the first render object
  const render = Array.isArray(data) ? data[0] : data;
  const renderId: string = render.id;

  const deadline = Date.now() + RENDER_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(`${CREATOMATE_API_URL}/renders/${renderId}`, {
      headers: getHeaders(),
    });

    if (!pollRes.ok) {
      throw new Error(`Creatomate poll failed (${pollRes.status})`);
    }

    const pollData = await pollRes.json();
    const status: string = pollData.status;

    if (status === "succeeded") {
      return pollData.url as string;
    }
    if (status === "failed") {
      throw new Error(`Creatomate render failed: ${pollData.error_message ?? "unknown"}`);
    }
    // status is "planned" or "rendering" — keep polling
  }

  throw new Error(`Creatomate render timed out after ${RENDER_TIMEOUT_MS / 1000}s`);
}

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

function bgImage(source: string, overlayOpacity = 0.45): CreatomateElement {
  return {
    type: "image",
    source,
    width: "100%",
    height: "100%",
    color_overlay: `rgba(0,0,0,${overlayOpacity})`,
  };
}

function bgVideo(source: string, overlayOpacity = 0.45): CreatomateElement {
  return {
    type: "video",
    source,
    width: "100%",
    height: "100%",
    color_overlay: `rgba(0,0,0,${overlayOpacity})`,
  };
}

function textEl(
  text: string,
  opts: {
    font_family: string;
    font_size: string;
    x: string;
    y: string;
    width?: string;
    fill_color?: string;
    font_style?: string;
    font_weight?: string;
    text_transform?: string;
    text_alignment?: string;
    x_alignment?: string;
    y_alignment?: string;
    shadow_color?: string;
    shadow_blur?: string;
    line_height?: string;
    letter_spacing?: string;
  }
): CreatomateElement {
  const el: CreatomateElement = {
    type: "text",
    text,
    font_family: opts.font_family,
    font_size: opts.font_size,
    fill_color: opts.fill_color ?? "#FFFFFF",
    x: opts.x,
    y: opts.y,
    width: opts.width ?? "85%",
    x_alignment: opts.x_alignment ?? "50%",
    y_alignment: opts.y_alignment ?? "50%",
    text_alignment: opts.text_alignment ?? "center",
  };
  if (opts.font_style) el.font_style = opts.font_style;
  if (opts.font_weight) el.font_weight = opts.font_weight;
  if (opts.text_transform) el.text_transform = opts.text_transform;
  if (opts.shadow_color) el.shadow_color = opts.shadow_color;
  if (opts.shadow_blur) el.shadow_blur = opts.shadow_blur;
  if (opts.line_height) el.line_height = opts.line_height;
  if (opts.letter_spacing) el.letter_spacing = opts.letter_spacing;
  return el;
}

function swipeArrow(): CreatomateElement {
  return textEl("→", {
    font_family: "Caveat",
    font_size: "52 px",
    fill_color: "rgba(255,255,255,0.80)",
    x: "90%",
    y: "92%",
    width: "10%",
    x_alignment: "50%",
    y_alignment: "50%",
    text_alignment: "center",
  });
}

// ---------------------------------------------------------------------------
// Public compose functions
// ---------------------------------------------------------------------------

// Detect hook style for dynamic reel font selection
function detectHookStyle(hookText: string): "personal" | "statement" {
  const lower = hookText.toLowerCase();
  const personalPrefixes = [
    "me ", "pov:", "i used to", "i made", "i started", "i was",
    "i quit", "i create", "i batch", "i automated",
    "woman to woman", "imagine ",
  ];
  const statementPrefixes = [
    "the biggest", "nobody tells", "your reels", "you are not",
    "still posting", "if you have been", "what if", "can you really",
    "what does", "the algorithm", "this is why", "the truth about",
    "stop doing",
  ];

  for (const p of statementPrefixes) {
    if (lower.startsWith(p) || lower.includes(p)) return "statement";
  }
  for (const p of personalPrefixes) {
    if (lower.startsWith(p) || lower.includes(p)) return "personal";
  }
  return "personal"; // default fallback
}

/** REEL — 1080×1920 mp4, video bg + overlay + hook text */
export async function composeReel(
  videoUrl: string,
  hookText: string,
  audioUrl?: string
): Promise<string> {
  const hookStyle = detectHookStyle(hookText);
  console.log(`Reel hook style: ${hookStyle} for: "${hookText.slice(0, 40)}..."`);

  const textConfig = {
    font_family: "Playfair Display",
    font_style: "italic",
    font_size: hookStyle === "statement" ? "66 px" : "68 px",
    x: "50%",
    y: "42%",
    width: "82%",
    text_alignment: "center" as const,
    shadow_color: "rgba(0,0,0,0.45)",
    shadow_blur: "8 px",
    line_height: "145%",
    letter_spacing: "1%",
  };

  // When audio is provided, mute the video track so only the MP3 plays
  const videoElement = bgVideo(videoUrl, 0.45);
  if (audioUrl) {
    videoElement.volume = 0;
  }

  const elements: CreatomateElement[] = [
    videoElement,
    textEl(hookText, textConfig),
  ];

  if (audioUrl) {
    elements.push({
      type: "audio",
      source: audioUrl,
      track: 2,
      time: 0,
      duration: 5,
      audio_fade_out: 0.3,
      volume: "160%",
    });
  }

  return renderComposition({
    output_format: "mp4",
    width: 1080,
    height: 1920,
    frame_rate: 30,
    duration: 5,
    elements,
  });
}

/** CAROUSEL COVER — 1080×1350 jpg */
export async function composeCarouselCoverSlide(
  imageUrl: string,
  headlineScript: string,
  headlineFactual: string,
  subtext: string
): Promise<string> {
  const elements: CreatomateElement[] = [
    bgImage(imageUrl, 0.45),
    // thin decorative line above headline
    {
      type: "shape",
      path: "M 0 0 L 1 0",
      width: "120 px",
      height: "1 px",
      fill_color: "rgba(255,255,255,0.40)",
      x: "50%",
      y: "22%",
      x_alignment: "50%",
      y_alignment: "50%",
    } as CreatomateElement,
    // main headline — Playfair Display italic at 30% from top
    textEl(headlineScript, {
      font_family: "Playfair Display",
      font_style: "italic",
      font_size: "88 px",
      x: "50%",
      y: "30%",
      width: "85%",
      text_alignment: "center",
      line_height: "130%",
    }),
    // thin divider line between headline and subtitle
    {
      type: "shape",
      path: "M 0 0 L 1 0",
      width: "100 px",
      height: "1 px",
      fill_color: "rgba(255,255,255,0.30)",
      x: "50%",
      y: "48%",
      x_alignment: "50%",
      y_alignment: "50%",
    } as CreatomateElement,
    // thin decorative line below headline
    {
      type: "shape",
      path: "M 0 0 L 1 0",
      width: "120 px",
      height: "1 px",
      fill_color: "rgba(255,255,255,0.40)",
      x: "50%",
      y: "42%",
      x_alignment: "50%",
      y_alignment: "50%",
    } as CreatomateElement,
    // secondary headline — Montserrat bold at 58% from top
    textEl(headlineFactual, {
      font_family: "Montserrat",
      font_weight: "bold",
      font_size: "38 px",
      x: "50%",
      y: "58%",
      width: "85%",
      text_alignment: "center",
    }),
    // subtext at 75% from top
    textEl(subtext, {
      font_family: "Caveat",
      font_size: "40 px",
      fill_color: "rgba(255,255,255,0.85)",
      x: "50%",
      y: "75%",
      width: "85%",
      text_alignment: "center",
    }),
    // swipe arrow at 92%
    swipeArrow(),
  ];

  return renderComposition({
    output_format: "jpg",
    width: 1080,
    height: 1350,
    elements,
  });
}

/** CAROUSEL BODY SLIDE — 1080×1350 jpg */
export async function composeCarouselBodySlide(
  imageUrl: string,
  bodyText: string,
  slideNumber: number,
  totalSlides: number
): Promise<string> {
  const elements: CreatomateElement[] = [
    bgImage(imageUrl, 0.45),
    // body text — left-aligned, vertically centered, 40px padding via reduced width
    textEl(bodyText, {
      font_family: "Caveat",
      font_size: "68 px",
      x: "50%",
      y: "50%",
      width: "88%",
      text_alignment: "left",
      line_height: "160%",
      letter_spacing: "1%",
    }),
  ];

  // swipe arrow on all slides except the last
  if (slideNumber < totalSlides) {
    elements.push(swipeArrow());
  }

  return renderComposition({
    output_format: "jpg",
    width: 1080,
    height: 1350,
    elements,
  });
}

/** CAROUSEL STEP SLIDE — 1080×1350 jpg */
export async function composeCarouselStepSlide(
  imageUrl: string,
  stepNumber: number,
  stepName: string,
  bullets: string[]
): Promise<string> {
  const bulletText = bullets.map((b) => `✅ ${b}`).join("\n");

  return renderComposition({
    output_format: "jpg",
    width: 1080,
    height: 1350,
    elements: [
      bgImage(imageUrl, 0.45),
      // step label
      textEl(`STEP ${stepNumber}`, {
        font_family: "Montserrat",
        font_weight: "bold",
        font_size: "36 px",
        fill_color: "rgba(255,255,255,0.80)",
        text_transform: "uppercase",
        x: "50%",
        y: "22%",
        width: "85%",
        text_alignment: "left",
      }),
      // step name
      textEl(stepName, {
        font_family: "Playfair Display",
        font_style: "italic",
        font_size: "72 px",
        x: "50%",
        y: "35%",
        width: "85%",
        text_alignment: "left",
      }),
      // bullets
      textEl(bulletText, {
        font_family: "Caveat",
        font_size: "54 px",
        x: "50%",
        y: "58%",
        width: "85%",
        text_alignment: "left",
      }),
      // swipe arrow
      swipeArrow(),
    ],
  });
}

// Truncate helper — hard cut, never splits words across layers
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trim() + "…";
}

// Truncate at last complete word boundary (no ellipsis)
function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const trimmed = text.slice(0, maxLen);
  const lastSpace = trimmed.lastIndexOf(" ");
  return lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed;
}

/** CAROUSEL CTA SLIDE — 1080×1350 jpg, lighter overlay */
export async function composeCarouselCTASlide(
  imageUrl: string,
  setupLine: string,
  keyword: string,
  subtext: string
): Promise<string> {
  // Hard truncate all text — never overflow
  const safeSetup = truncate(setupLine, 55);
  const safeKeyword = truncate(`COMMENT "${keyword}"`, 30);
  const safeSub = truncateAtWord(subtext, 65);

  return renderComposition({
    output_format: "jpg",
    width: 1080,
    height: 1350,
    elements: [
      bgImage(imageUrl, 0.35),
      // setup line
      textEl(safeSetup, {
        font_family: "Caveat",
        font_size: "52 px",
        fill_color: "rgba(255,255,255,0.85)",
        x: "50%",
        y: "35%",
        width: "85%",
        text_alignment: "center",
      }),
      // keyword — always COMMENT "KEYWORD" format
      textEl(safeKeyword, {
        font_family: "Montserrat",
        font_weight: "bold",
        font_size: "80 px",
        text_transform: "uppercase",
        x: "50%",
        y: "50%",
        width: "90%",
        text_alignment: "center",
      }),
      // subtext
      textEl(safeSub, {
        font_family: "Caveat",
        font_size: "44 px",
        fill_color: "rgba(255,255,255,0.85)",
        x: "50%",
        y: "65%",
        width: "85%",
        text_alignment: "center",
      }),
    ],
  });
}

/** SINGLE IMAGE QUOTE — 1080×1350 jpg, lightest overlay */
export async function composeSingleImagePost(
  imageUrl: string,
  quoteText: string,
  secondLine?: string
): Promise<string> {
  const elements: CreatomateElement[] = [
    bgImage(imageUrl, 0.30),
    // quote text
    textEl(quoteText, {
      font_family: "Playfair Display",
      font_style: "italic",
      font_size: "72 px",
      x: "50%",
      y: "42%",
      width: "85%",
      text_alignment: "center",
    }),
  ];

  if (secondLine) {
    elements.push(
      textEl(secondLine, {
        font_family: "Caveat",
        font_size: "52 px",
        x: "50%",
        y: "60%",
        width: "85%",
        text_alignment: "center",
      })
    );
  }

  // @handle watermark
  elements.push(
    textEl("@herdailyfreedom", {
      font_family: "Montserrat",
      font_size: "24 px",
      fill_color: "rgba(255,255,255,0.40)",
      x: "50%",
      y: "92%",
      width: "60%",
      text_alignment: "center",
    })
  );

  return renderComposition({
    output_format: "jpg",
    width: 1080,
    height: 1350,
    elements,
  });
}

// ---------------------------------------------------------------------------
// Full carousel orchestrator
// ---------------------------------------------------------------------------

interface CarouselSlide {
  slide_number: number;
  heading: string;
  body: string;
  font_style_hint?: string;
}

interface ContentPieceForCarousel {
  copy: Record<string, unknown> | CarouselSlide[];
  image_urls: string[];
  hook?: string;
  suggested_cta_keyword?: string;
}

function isStepSlide(slide: CarouselSlide): boolean {
  if (slide.font_style_hint?.toLowerCase().includes("bold sans")) return true;
  if (/^step\s*\d/i.test(slide.heading)) return true;
  if (/[✅✓]/.test(slide.body)) return true;
  return false;
}

function parseCTAText(text: string, ctaKeyword?: string): {
  setupLine: string;
  keyword: string;
  subtext: string;
} {
  const kw = ctaKeyword || "FREEDOM";

  // Try to parse "Comment X" pattern
  const commentMatch = text.match(
    /(.+?)\bcomment\s+['"\u201c]?([^'"\u201d]+)['"\u201d]?\s*(.*)$/i
  );
  if (commentMatch) {
    return {
      setupLine: commentMatch[1].trim(),
      keyword: kw,
      subtext: commentMatch[3].trim() || "& I'll send it straight to your DMs",
    };
  }

  // Fallback: use text as setup, keyword from settings
  return {
    setupLine: text.length > 55 ? text.slice(0, 54).trim() + "\u2026" : text,
    keyword: kw,
    subtext: "& I'll send it straight to your DMs",
  };
}

function parseBullets(body: string): string[] {
  return body
    .split("\n")
    .map((line) => line.replace(/^[✅✓•\-\d.)\s]+/, "").trim())
    .filter(Boolean);
}

/** Orchestrate a full carousel: cover → body/step slides → CTA */
export async function composeFullCarousel(
  contentPiece: ContentPieceForCarousel,
  imageUrl: string
): Promise<string[]> {
  const slides: CarouselSlide[] = Array.isArray(contentPiece.copy)
    ? (contentPiece.copy as CarouselSlide[])
    : ((contentPiece.copy as Record<string, unknown>).slides as CarouselSlide[]) ??
      (Object.values(contentPiece.copy) as CarouselSlide[]);

  if (!slides || slides.length === 0) {
    throw new Error("No carousel slides found in content piece copy");
  }

  const totalSlides = slides.length;
  const urls: string[] = [];

  // Detect carousel type from middle slides
  const middleSlides = slides.slice(1, -1);
  const isBlueprintType =
    middleSlides.length > 0 && middleSlides.some((s) => isStepSlide(s));

  // --- Slide 1: Cover ---
  const coverSlide = slides[0];
  const headlineScript = coverSlide.heading;
  const headlineFactual = coverSlide.body || "";
  const subtext = "";

  const coverUrl = await composeCarouselCoverSlide(
    imageUrl,
    headlineScript,
    headlineFactual,
    subtext
  );
  urls.push(coverUrl);
  console.log(`[carousel] Cover slide composed`);

  // --- Middle slides ---
  for (let i = 1; i < totalSlides - 1; i++) {
    const slide = slides[i];
    const slideImg =
      contentPiece.image_urls[i] ?? contentPiece.image_urls[0] ?? imageUrl;

    if (isBlueprintType) {
      const stepNum = i;
      const stepName = slide.heading.replace(/^step\s*\d+[:\s]*/i, "").trim();
      const bullets = parseBullets(slide.body);
      const stepUrl = await composeCarouselStepSlide(
        slideImg,
        stepNum,
        stepName,
        bullets
      );
      urls.push(stepUrl);
    } else {
      const bodyUrl = await composeCarouselBodySlide(
        slideImg,
        slide.body || slide.heading,
        i + 1,
        totalSlides
      );
      urls.push(bodyUrl);
    }
    console.log(`[carousel] Slide ${i + 1}/${totalSlides} composed`);
  }

  // --- Last slide: CTA ---
  if (totalSlides > 1) {
    const ctaSlide = slides[totalSlides - 1];
    const ctaText = `${ctaSlide.heading} ${ctaSlide.body}`.trim();
    // Extract CTA keyword from the content piece, not from text parsing
    const pieceKeyword = contentPiece.suggested_cta_keyword || "FREEDOM";
    const { setupLine, keyword, subtext: ctaSub } = parseCTAText(ctaText, pieceKeyword);
    const ctaImg =
      contentPiece.image_urls[totalSlides - 1] ??
      contentPiece.image_urls[0] ??
      imageUrl;

    const ctaUrl = await composeCarouselCTASlide(
      ctaImg,
      setupLine,
      keyword,
      ctaSub
    );
    urls.push(ctaUrl);
    console.log(`[carousel] CTA slide composed`);
  }

  return urls;
}
