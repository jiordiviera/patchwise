const GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

export interface GroqModel {
  id: string;
  name: string;
  active: boolean;
}

export async function fetchGroqModels(apiKey: string): Promise<GroqModel[]> {
  const response = await fetch(GROQ_MODELS_URL, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch models (${response.status}). Check your API key.`,
    );
  }

  const data = (await response.json()) as {
    data?: Array<{ id: string; active?: boolean }>;
  };

  return (data.data ?? [])
    .filter((m) => m.active !== false)
    .map((m) => ({
      id: m.id,
      name: formatModelName(m.id),
      active: m.active ?? true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function formatModelName(id: string): string {
  return id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
