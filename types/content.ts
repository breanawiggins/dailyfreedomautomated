// Content Generation Engine Types

export type ImageStyle = "aesthetic_flatlay" | "aesthetic_only" | "woman_lifestyle";
export type ContentSubtype = "reel" | "carousel" | "single_image";

export interface ReelScript {
  hook_text: string;
  full_overlay_text: string;
  image_prompt: string;
}

export interface SingleImageCopy {
  quote_text: string;
  attribution: string;
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
  type: "reel" | "carousel" | "single_image";
  hook: string;
  full_copy: CarouselSlide[] | ReelScript | SingleImageCopy;
  suggested_cta_keyword: string;
  content_pillar: string;
  image_style: ImageStyle;
  content_subtype: ContentSubtype;
  day_of_week: string;
  post_time_slot: string;
}

export interface WeeklyBatchOutput {
  pieces: GeneratedContentPiece[];
  week_of: string;
}
