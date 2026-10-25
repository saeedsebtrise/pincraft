// Types for server/aiDesign.mjs (used by the tests).
import type { ZodType } from 'zod';

export const AI_DESIGN_MODEL: string;
export function designSchema(layoutIds: string[], fonts: string[]): ZodType;
export function designPins(
  client: { beta: { messages: { create: (params: Record<string, unknown>) => Promise<{ stop_reason: string; content: { type: string; text?: string }[] }> } } },
  input: Record<string, unknown>,
): Promise<{ designs: unknown[] }>;
