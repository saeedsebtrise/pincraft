// Types for server/pinterest.mjs (used by the tests).
type Env = Record<string, string | undefined>;
type Req = { method?: string; url: string; headers: Record<string, string | undefined> };
type Fetch = (url: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>; // eslint-disable-line @typescript-eslint/no-explicit-any
export const MAX_PIN_BODY: number;
export function pinterestConfigured(env?: Env): boolean;
export function seal(data: unknown, env?: Env): string;
export function unseal(token: string, env?: Env): any; // eslint-disable-line @typescript-eslint/no-explicit-any
export function readCookies(header?: string): Record<string, string>;
export function handlePinterest(
  op: string,
  req: Req,
  body: Record<string, unknown>,
  opts?: { env?: Env; fetch?: Fetch },
): Promise<{ status: number; body?: any; redirect?: string; cookies: string[] }>; // eslint-disable-line @typescript-eslint/no-explicit-any
export function sendPinterest(res: unknown, out: unknown): void;
