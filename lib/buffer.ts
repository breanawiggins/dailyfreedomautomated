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

interface ContentPieceForCaption {
  type: string;
  content_subtype?: string;
  hook: string;
  copy: Record<string, unknown>;
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

export function generateCaption(piece: ContentPieceForCaption): string {
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
