// Types for server/aiRoutes.mjs (used by the tests).
type Client = { beta: { messages: { create: (params: Record<string, unknown>) => Promise<{ stop_reason: string; content: { type: string; text?: string }[] }> } } };
type Fetch = (url: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Env = Record<string, string | undefined>;

export const AI_TEXT_MODEL: string;
export const MAX_BODY: Record<string, number>;
export const AI_ROUTES: Record<string, (client: Client, input: Record<string, unknown>) => Promise<unknown>>;
export function suggestText(client: Client, input: Record<string, unknown>): Promise<unknown>;
export function loginRequired(env?: Env): boolean;
export function authorizeAi(route: string, authorization: string | undefined, opts?: { env?: Env; fetch?: Fetch }): Promise<void>;
export function handleAi(
  route: string,
  input: unknown,
  authorization: string | undefined,
  opts?: { client?: Client; env?: Env; fetch?: Fetch; onError?: (...args: unknown[]) => void },
): Promise<{ status: number; body: Record<string, unknown> }>;
