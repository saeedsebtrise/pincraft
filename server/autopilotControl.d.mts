// Types for server/autopilotControl.mjs (used by the tests).
export const MAX_CONTROL_BODY: number;
export function controlConfig(env?: Record<string, string | undefined>): { sheetUrl: string | null; missing: string[] };
export function keyMatches(given: unknown, expected: string | undefined): boolean;
export function sheetRequest(op: string, body?: Record<string, unknown>): Record<string, unknown> | null;
export function handleAutopilotControl(
  op: string,
  req: { method?: string; headers: Record<string, string | undefined> },
  body?: Record<string, unknown>,
  deps?: { env?: Record<string, string | undefined>; fetch?: (url: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> },
): Promise<{ status: number; body: Record<string, unknown> }>;
