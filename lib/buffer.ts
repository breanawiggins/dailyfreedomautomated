import { ContentPiece } from "@/types";

const BUFFER_API_URL = "https://api.bufferapp.com/1";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.BUFFER_ACCESS_TOKEN!}`,
    "Content-Type": "application/json",
  };
}

export async function getProfiles() {
  const response = await fetch(`${BUFFER_API_URL}/profiles.json`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Buffer API error ${response.status}: ${text}`);
  }

  return response.json();
}

interface SchedulePostParams {
  profileId: string;
  caption: string;
  mediaUrls: string[];
  scheduledAt: string;
  isVideo: boolean;
}

export async function schedulePost({
  profileId,
  caption,
  mediaUrls,
  scheduledAt,
  isVideo,
}: SchedulePostParams): Promise<{ success: boolean; updates: { id: string }[] }> {
  const media: Record<string, string> = {};
  if (mediaUrls.length > 0) {
    if (isVideo) {
      media.video = mediaUrls[0];
    } else {
      media.picture = mediaUrls[0];
    }
  }

  const body = {
    profile_ids: [profileId],
    text: caption,
    media,
    scheduled_at: scheduledAt,
    now: false,
  };

  const response = await fetch(`${BUFFER_API_URL}/updates/create.json`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Buffer API error ${response.status}: ${text}`);
  }

  return response.json();
}

export async function getScheduledPosts(profileId: string) {
  const response = await fetch(
    `${BUFFER_API_URL}/profiles/${profileId}/updates/pending.json`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Buffer API error ${response.status}: ${text}`);
  }

  return response.json();
}

export async function deletePost(postId: string) {
  const response = await fetch(
    `${BUFFER_API_URL}/updates/${postId}/destroy.json`,
    {
      method: "POST",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Buffer API error ${response.status}: ${text}`);
  }

  return response.json();
}

export function generateCaption(piece: ContentPiece): string {
  const { type, hook, copy } = piece;

  if (type === "reel") {
    const overlayText = extractOverlayText(copy);
    return [
      hook,
      "",
      overlayText,
      "",
      'Comment "FREEDOM" and I\'ll send you my exact strategy \u{1F511}',
      "",
      "#herdailyfreedom #facelessmarketing #digitalfreedom #makemoneyonline #facelesscontent",
    ].join("\n");
  }

  if (type === "carousel") {
    const firstSlideBody = extractFirstSlideBody(copy);
    return [
      hook,
      "",
      firstSlideBody,
      "",
      "Swipe to see the full breakdown \u2192",
      "",
      'Comment "FREEDOM" below \u{1F447}',
      "",
      "#herdailyfreedom #facelessmarketing #digitalfreedom #onlinebusiness #contentcreator",
    ].join("\n");
  }

  // single_image
  const quoteText = extractQuoteText(copy, hook);
  return [
    quoteText,
    "",
    "Save this if it resonates \u{1F90D}",
    "",
    "#herdailyfreedom #facelessmarketing #digitalfreedom #motivation #womeninbusiness",
  ].join("\n");
}

function extractOverlayText(copy: Record<string, unknown> | string[]): string {
  if (Array.isArray(copy)) {
    return copy.join("\n");
  }
  if (copy && typeof copy === "object") {
    if (typeof copy.full_overlay_text === "string") return copy.full_overlay_text;
    if (typeof copy.body === "string") return copy.body;
    if (typeof copy.text === "string") return copy.text;
  }
  return "";
}

function extractFirstSlideBody(copy: Record<string, unknown> | string[]): string {
  if (Array.isArray(copy)) {
    return copy[0] || "";
  }
  if (copy && typeof copy === "object") {
    const slides = copy.slides as Array<{ body?: string }> | undefined;
    if (slides && slides.length > 0 && slides[0].body) {
      return slides[0].body;
    }
    if (typeof copy.body === "string") return copy.body;
  }
  return "";
}

function extractQuoteText(copy: Record<string, unknown> | string[], hook: string): string {
  if (Array.isArray(copy)) {
    return copy[0] || hook;
  }
  if (copy && typeof copy === "object") {
    if (typeof copy.quote_text === "string") return copy.quote_text;
    if (typeof copy.text === "string") return copy.text;
    if (typeof copy.body === "string") return copy.body;
  }
  return hook;
}
