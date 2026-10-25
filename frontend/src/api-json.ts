export async function readApiJson<T extends Record<string, any> = Record<string, any>>(response: Response): Promise<T & { __invalidJson?: boolean }> {
  const body = await response.text();
  if (!body.trim()) return {} as T;
  try {
    return JSON.parse(body) as T;
  } catch {
    return {
      __invalidJson: true,
      detail: response.ok ? "The server returned an invalid response. AI Review can be skipped." : `Request failed (${response.status}). AI Review can be skipped.`,
    } as unknown as T & { __invalidJson: boolean };
  }
}
