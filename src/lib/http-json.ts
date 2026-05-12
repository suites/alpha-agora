export async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  const statusLabel = response.status ? `HTTP ${response.status}` : "the server";

  if (text.trim().length === 0) {
    throw new Error(`${fallbackMessage} (${statusLabel} returned an empty response)`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${fallbackMessage} (${statusLabel} returned invalid JSON)`);
  }
}
