// Content Generation Engine Types

export interface ReelScript {
  hook_text: string;
  full_overlay_text: string;
  image_prompt: string;
}

export interface CarouselSlide {
  slide_number: number;
  heading: string;
  body: string;
  font_style_hint: string;
}

export interface Carousel {
  cover_hook: string;
  slides: CarouselSlide[];
  cta_keyword: string;
  image_prompt: string;
}

export type CarouselType = "story" | "blueprint" | "result_first";

export interface GeneratedContentPiece {
  type: "reel" | "carousel";
  hook: string;
  full_copy: CarouselSlide[] | ReelScript;
  suggested_cta_keyword: string;
  content_pillar: string;
  image_prompt_suggestion: string;
}

export interface WeeklyBatchOutput {
  pieces: GeneratedContentPiece[];
  week_of: string;
}
