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
    throw new Error(`Buffer API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function createPost(profileIds: string[], text: string, media: Record<string, unknown>, scheduledAt?: string) {
  const body: Record<string, unknown> = {
    profile_ids: profileIds,
    text,
    media,
    now: !scheduledAt,
  };

  if (scheduledAt) {
    body.scheduled_at = scheduledAt;
  }

  const response = await fetch(`${BUFFER_API_URL}/updates/create.json`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Buffer API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
