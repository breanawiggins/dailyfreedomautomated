// Creatomate Compositing Layer — renders compositions via the Creatomate REST API

const CREATOMATE_API_URL = "https://api.creatomate.com/v1";
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

function bgImage(source: string): CreatomateElement {
  return { type: "image", source, width: "100%", height: "100%" };
}

function bgVideo(source: string): CreatomateElement {
  return { type: "video", source, width: "100%", height: "100%" };
}

function overlay(opacity: number): CreatomateElement {
  return {
    type: "rectangle",
    width: "100%",
    height: "100%",
    fill_color: `rgba(0,0,0,${opacity})`,
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

/** REEL — 1080×1920 mp4, video bg + overlay + hook text */
export async function composeReel(
  videoUrl: string,
  hookText: string
): Promise<string> {
  return renderComposition({
    output_format: "mp4",
    width: 1080,
    height: 1920,
    elements: [
      bgVideo(videoUrl),
      overlay(0.45),
      textEl(hookText, {
        font_family: "Caveat",
        font_size: "76 px",
        x: "50%",
        y: "40%",
        width: "85%",
        text_alignment: "center",
        shadow_color: "rgba(0,0,0,0.60)",
        shadow_blur: "4 px",
      }),
    ],
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
    bgImage(imageUrl),
    overlay(0.45),
    // sparkle decoration
    textEl("✦", {
      font_family: "Caveat",
      font_size: "48 px",
      fill_color: "rgba(255,255,255,0.70)",
      x: "50%",
      y: "25%",
      width: "20%",
      text_alignment: "center",
    }),
    // main headline — Playfair Display italic
    textEl(headlineScript, {
      font_family: "Playfair Display",
      font_style: "italic",
      font_size: "96 px",
      x: "50%",
      y: "35%",
      width: "85%",
      text_alignment: "center",
    }),
    // secondary headline — Montserrat bold
    textEl(headlineFactual, {
      font_family: "Montserrat",
      font_weight: "bold",
      font_size: "48 px",
      x: "50%",
      y: "50%",
      width: "85%",
      text_alignment: "center",
    }),
    // subtext
    textEl(subtext, {
      font_family: "Caveat",
      font_size: "42 px",
      fill_color: "rgba(255,255,255,0.85)",
      x: "50%",
      y: "70%",
      width: "85%",
      text_alignment: "center",
    }),
    // swipe arrow
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
    bgImage(imageUrl),
    overlay(0.45),
    // body text — left-aligned, vertically centered
    textEl(bodyText, {
      font_family: "Caveat",
      font_size: "58 px",
      x: "50%",
      y: "50%",
      width: "85%",
      text_alignment: "left",
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
      bgImage(imageUrl),
      overlay(0.45),
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
        font_size: "48 px",
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

/** CAROUSEL CTA SLIDE — 1080×1350 jpg, lighter overlay */
export async function composeCarouselCTASlide(
  imageUrl: string,
  setupLine: string,
  keyword: string,
  subtext: string
): Promise<string> {
  return renderComposition({
    output_format: "jpg",
    width: 1080,
    height: 1350,
    elements: [
      bgImage(imageUrl),
      overlay(0.35),
      // setup line
      textEl(setupLine, {
        font_family: "Caveat",
        font_size: "52 px",
        fill_color: "rgba(255,255,255,0.85)",
        x: "50%",
        y: "35%",
        width: "85%",
        text_alignment: "center",
      }),
      // keyword — Montserrat bold uppercase
      textEl(keyword, {
        font_family: "Montserrat",
        font_weight: "bold",
        font_size: "88 px",
        text_transform: "uppercase",
        x: "50%",
        y: "50%",
        width: "85%",
        text_alignment: "center",
      }),
      // subtext
      textEl(subtext, {
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
    bgImage(imageUrl),
    overlay(0.3),
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
}

function isStepSlide(slide: CarouselSlide): boolean {
  if (slide.font_style_hint?.toLowerCase().includes("bold sans")) return true;
  if (/^step\s*\d/i.test(slide.heading)) return true;
  if (/[✅✓]/.test(slide.body)) return true;
  return false;
}

function parseCTAText(text: string): {
  setupLine: string;
  keyword: string;
  subtext: string;
} {
  // Look for pattern like: "Ready to start? Comment "FREEDOM" below to get..."
  const commentMatch = text.match(
    /(.+?)\bcomment\s+[""]([^""]+)[""](.*)$/i
  );
  if (commentMatch) {
    return {
      setupLine: commentMatch[1].trim(),
      keyword: `COMMENT "${commentMatch[2].trim()}"`,
      subtext: commentMatch[3].trim(),
    };
  }
  // Fallback: split at midpoint
  const mid = Math.floor(text.length / 2);
  return {
    setupLine: text.slice(0, mid).trim(),
    keyword: "SAVE THIS",
    subtext: text.slice(mid).trim(),
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
    const { setupLine, keyword, subtext: ctaSub } = parseCTAText(ctaText);
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
