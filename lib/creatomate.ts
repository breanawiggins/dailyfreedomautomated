const CREATOMATE_API_URL = "https://api.creatomate.com/v1";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.CREATOMATE_API_KEY!}`,
    "Content-Type": "application/json",
  };
}

export async function renderTemplate(templateId: string, modifications: Record<string, unknown>) {
  const response = await fetch(`${CREATOMATE_API_URL}/renders`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      template_id: templateId,
      modifications,
    }),
  });

  if (!response.ok) {
    throw new Error(`Creatomate API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getRenderStatus(renderId: string) {
  const response = await fetch(`${CREATOMATE_API_URL}/renders/${renderId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Creatomate API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
