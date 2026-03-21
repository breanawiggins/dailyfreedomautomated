// Buffer GraphQL API Client for DailyFreedomAutomated
// Endpoint: https://api.buffer.com (GraphQL)
// Auth: Bearer token via BUFFER_ACCESS_TOKEN env var

const BUFFER_API_URL = "https://api.buffer.com";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.BUFFER_ACCESS_TOKEN!}`,
    "Content-Type": "application/json",
  };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(BUFFER_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Buffer API error (${res.status}): ${body}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;

  if (json.errors && json.errors.length > 0) {
    throw new Error(`Buffer GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`);
  }

  if (!json.data) {
    throw new Error("Buffer API returned no data");
  }

  return json.data;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BufferOrganization {
  id: string;
}

export interface BufferChannel {
  id: string;
  name: string;
  displayName: string;
  service: string;
  avatar: string;
}

export interface BufferPost {
  id: string;
  text: string;
  createdAt?: string;
  dueAt?: string;
  status?: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getOrganizations(): Promise<BufferOrganization[]> {
  const data = await graphql<{ account: { organizations: BufferOrganization[] } }>(`
    query GetOrganizations {
      account {
        organizations {
          id
        }
      }
    }
  `);
  return data.account.organizations;
}

export async function getChannels(organizationId: string): Promise<BufferChannel[]> {
  const data = await graphql<{ channels: BufferChannel[] }>(`
    query GetChannels($input: ChannelsInput!) {
      channels(input: $input) {
        id
        name
        displayName
        service
        avatar
      }
    }
  `, { input: { organizationId } });
  return data.channels;
}

export async function getScheduledPosts(organizationId: string): Promise<BufferPost[]> {
  const data = await graphql<{ posts: { edges: { node: BufferPost }[] } }>(`
    query GetScheduledPosts($input: PostsInput!) {
      posts(input: $input, first: 50) {
        edges {
          node {
            id
            text
            createdAt
          }
        }
      }
    }
  `, {
    input: {
      organizationId,
      sort: [{ field: "dueat", direction: "asc" }],
    },
  });
  return data.posts.edges.map((e) => e.node);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

interface SchedulePostParams {
  channelId: string;
  caption: string;
  mediaUrls: string[];
  scheduledAt: string; // ISO 8601
  isVideo: boolean;
}

export async function schedulePost(params: SchedulePostParams): Promise<string> {
  const { channelId, caption, mediaUrls, scheduledAt, isVideo } = params;

  // Build assets input
  const assets: Record<string, unknown> = {};
  if (isVideo && mediaUrls.length > 0) {
    assets.videos = mediaUrls.map((url) => ({ url }));
  } else if (mediaUrls.length > 0) {
    assets.images = mediaUrls.map((url) => ({ url }));
  }

  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
            text
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;

  // Instagram requires post type metadata
  const instagramType = isVideo ? "reel" : "post";

  const input: Record<string, unknown> = {
    channelId,
    text: caption,
    schedulingType: "automatic",
    mode: "customScheduled",
    dueAt: scheduledAt,
    assets,
    metadata: {
      instagram: {
        type: instagramType,
        shouldShareToFeed: true,
      },
    },
  };

  const data = await graphql<{ createPost: { post?: BufferPost; message?: string } }>(
    mutation,
    { input }
  );

  if (data.createPost.message) {
    throw new Error(`Buffer createPost failed: ${data.createPost.message}`);
  }

  if (!data.createPost.post) {
    throw new Error("Buffer createPost returned no post");
  }

  console.log(`Buffer post created: ${data.createPost.post.id}`);
  return data.createPost.post.id;
}

export async function deletePost(postId: string): Promise<void> {
  const mutation = `
    mutation DeletePost($input: DeletePostInput!) {
      deletePost(input: $input) {
        ... on DeletePostSuccess {
          post {
            id
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;

  await graphql(mutation, { input: { postId } });
  console.log(`Buffer post deleted: ${postId}`);
}

// ---------------------------------------------------------------------------
// Caption generation
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";

export interface ContentPieceForCaption {
  type: string;
  content_subtype?: string;
  hook: string;
  copy: Record<string, unknown>;
  content_pillar?: string;
}

const PRIMARY_HASHTAGS = "#herdailyfreedom #facelessmarketing #digitalfreedom";
const SECONDARY_HASHTAGS = [
  "#makemoneyonline",
  "#onlinebusiness",
  "#contentcreator",
  "#facelesscontent",
  "#womeninbusiness",
  "#digitalproducts",
  "#passiveincome",
  "#motivation",
];

function pickHashtags(count: number): string {
  const shuffled = [...SECONDARY_HASHTAGS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).join(" ");
}

const CAPTION_SYSTEM_PROMPT = `You are a caption writer for @herdailyfreedom, an Instagram account about building a faceless digital marketing business and living life on your own terms.

Write captions in a warm, personal, story-driven style. The tone is aspirational but grounded — like a friend sharing what she's learned. Use short paragraphs (1-3 sentences each). Mix vulnerability with confidence.

Rules:
- 150-300 words (not counting hashtags)
- Start with a hook that stops the scroll (can be the provided hook or a variation)
- Tell a mini-story or share a relatable moment
- Weave in the content from the slides/reel naturally — don't just list them
- Include a clear CTA using the keyword "FREEDOM" (e.g., Comment "FREEDOM" and I'll send you...)
- End with a line of relevant hashtags — always include #herdailyfreedom
- No emojis in the story body, but emojis are OK in the CTA line and hashtag line
- Write in first person
- Never use the word "journey"`;

function extractCopyContent(copy: Record<string, unknown>): string {
  // Handle array of slides
  if (Array.isArray(copy)) {
    return copy
      .map((slide: Record<string, unknown>, i: number) => {
        const heading = slide.heading || slide.slide_heading || "";
        const body = slide.body || slide.slide_body || "";
        return `Slide ${i + 1}: ${heading}\n${body}`;
      })
      .join("\n\n");
  }

  // Handle slides nested in object
  if (copy.slides && Array.isArray(copy.slides)) {
    return (copy.slides as Record<string, unknown>[])
      .map((slide, i) => {
        const heading = slide.heading || slide.slide_heading || "";
        const body = slide.body || slide.slide_body || "";
        return `Slide ${i + 1}: ${heading}\n${body}`;
      })
      .join("\n\n");
  }

  // Handle reel copy
  const parts: string[] = [];
  if (copy.full_overlay_text) parts.push(`Overlay: ${copy.full_overlay_text}`);
  if (copy.hook_text) parts.push(`Hook: ${copy.hook_text}`);
  if (copy.script) parts.push(`Script: ${copy.script}`);
  if (copy.quote_text) parts.push(`Quote: ${copy.quote_text}`);

  return parts.join("\n") || JSON.stringify(copy);
}

async function generateCaptionWithClaude(piece: ContentPieceForCaption): Promise<string> {
  const anthropic = new Anthropic();

  const copyContent = extractCopyContent(piece.copy || {});
  const contentPillar = piece.content_pillar || "digital freedom";

  const userPrompt = `Write an Instagram caption for this ${piece.content_subtype || piece.type} post.

Hook: ${piece.hook}

Content/slides:
${copyContent}

Content pillar: ${contentPillar}
CTA keyword: FREEDOM

Here's an example of the style and format I want (use as a reference, don't copy):

---
She satisfies her online shopping addiction AND makes money doing it.

Six months ago, I was scrolling through Instagram at 2am, adding things to my cart I didn't need, wondering why my bank account looked the way it did.

Now I channel that same energy into building something that actually pays me back.

I turned my eye for aesthetics into a faceless digital marketing business. No showing my face. No dancing on camera. Just creating content about the things I already love — and watching the sales come in while I sleep.

The truth is, you don't need a huge following or a business degree. You need a system, consistency, and the willingness to start before you feel ready.

If I can do this from my couch in pajamas with a coffee in hand, so can you.

Comment "FREEDOM" and I'll send you exactly how I set this up 🔑

#herdailyfreedom #facelessmarketing #digitalfreedom #makemoneyonline #onlinebusiness #contentcreator #passiveincome #womeninbusiness
---

Now write a unique caption for the content above. Return ONLY the caption text, nothing else.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: CAPTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  if (!text || text.length < 50) {
    throw new Error("Claude returned insufficient caption text");
  }

  return text;
}

function generateFallbackCaption(piece: ContentPieceForCaption): string {
  const subtype = piece.content_subtype || piece.type;
  const copy = piece.copy || {};

  if (subtype === "reel") {
    const overlayText =
      (copy.full_overlay_text as string) ||
      (copy.hook_text as string) ||
      piece.hook;

    return [
      piece.hook,
      "",
      overlayText !== piece.hook ? overlayText : "",
      "",
      'Comment "FREEDOM" and I\'ll send you my exact strategy 🔑',
      "",
      `${PRIMARY_HASHTAGS} ${pickHashtags(4)}`,
    ]
      .filter((line, i) => !(line === "" && i === 2))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  if (subtype === "carousel") {
    const firstSlide = Array.isArray(copy)
      ? (copy[0] as { body?: string })
      : null;
    const expansion = firstSlide?.body || "";

    return [
      piece.hook,
      "",
      expansion ? expansion.slice(0, 150) : "",
      "",
      "Swipe to see the full breakdown →",
      "",
      'Comment "FREEDOM" below 👇',
      "",
      `${PRIMARY_HASHTAGS} ${pickHashtags(4)}`,
    ]
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  // single_image
  const quoteText = (copy.quote_text as string) || piece.hook;

  return [
    quoteText,
    "",
    "Save this if it resonates 🤍",
    "",
    `${PRIMARY_HASHTAGS} ${pickHashtags(4)}`,
  ].join("\n");
}

export async function generateCaption(piece: ContentPieceForCaption): Promise<string> {
  try {
    const caption = await generateCaptionWithClaude(piece);
    return caption;
  } catch (error) {
    console.error("Claude caption generation failed, using fallback:", error);
    return generateFallbackCaption(piece);
  }
}
