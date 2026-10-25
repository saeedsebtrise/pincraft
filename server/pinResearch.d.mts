// Types for server/pinResearch.mjs (used by the tests).
export const PIN_RESEARCH_MODEL: string;
export const MAX_IMAGES: number;
export const LAYOUTS: string[];
export const TEXT_STYLES: string[];
export const FONT_STYLES: string[];
export function researchPins(
  client: { beta: { messages: { create: (params: Record<string, unknown>) => Promise<{ stop_reason: string; content: { type: string; text?: string }[] }> } } },
  input: Record<string, unknown>,
): Promise<{ keyword: string; report: Record<string, unknown> }>;
