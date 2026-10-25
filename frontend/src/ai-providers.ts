export type AIProviderId = "gemini" | "openai-compatible" | "anthropic" | "custom";

export type AIProvider = {
  id: AIProviderId;
  label: string;
  defaultModel: string;
  supportsModelDiscovery: boolean;
};

export const AI_PROVIDERS: AIProvider[] = [
  { id: "gemini", label: "Gemini · default", defaultModel: "gemini-2.5-flash", supportsModelDiscovery: true },
  { id: "openai-compatible", label: "OpenAI-compatible", defaultModel: "", supportsModelDiscovery: false },
  { id: "anthropic", label: "Anthropic", defaultModel: "", supportsModelDiscovery: false },
  { id: "custom", label: "Custom provider", defaultModel: "", supportsModelDiscovery: false },
];

const preferredGeminiModels = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"];

export async function discoverGeminiModel(token: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(token)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Could not discover Gemini models");
  const available = (data.models || [])
    .filter((model: { name?: string; supportedGenerationMethods?: string[] }) => model.supportedGenerationMethods?.includes("generateContent"))
    .map((model: { name?: string }) => String(model.name || "").replace(/^models\//, ""));
  return preferredGeminiModels.find((model) => available.includes(model)) || available[0] || "gemini-2.5-flash";
}

export function isGeminiDefaultModel(model: string) {
  return !model || model === "Gemini" || model === "Gemini Flash" || model === "Auto (Gemini)";
}
