/**
 * Text-assistant provider abstraction. The editor talks only to this interface;
 * providers can be swapped (local rules, a server proxy for Claude or any other
 * model) without touching UI code.
 *
 * Privacy: providers receive text inputs only (title, keyword, audience) — never
 * images — and the remote provider is used only when the user turns AI on.
 * Security: no API key ever reaches the browser; the remote provider calls YOUR
 * proxy (server/ai-proxy.mjs), which holds the key in a server env variable.
 */
import { suggestCtas, suggestHeadlines, suggestSubtitles, suggestVariations } from '../headlines';
import { aiAuthHeaders } from './auth';

export interface TextAssistInput {
  articleTitle: string;
  keyword?: string;
  audience?: string;
  website?: string;
}

export interface TextAssistResult {
  headlines: string[];
  subtitles: string[];
  ctas: string[];
  variations: string[];
  source: 'local' | 'ai';
}

export interface TextAssistProvider {
  id: string;
  label: string;
  suggest(input: TextAssistInput): Promise<TextAssistResult>;
}

export const localProvider: TextAssistProvider = {
  id: 'local',
  label: 'Smart suggestions (on-device)',
  async suggest(input) {
    return {
      headlines: suggestHeadlines(input),
      subtitles: suggestSubtitles(input),
      ctas: suggestCtas(input.website),
      variations: suggestVariations(input),
      source: 'local',
    };
  },
};

export function createProxyProvider(url: string): TextAssistProvider {
  return {
    id: 'proxy',
    label: 'AI suggestions',
    async suggest(input) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await aiAuthHeaders()) },
        body: JSON.stringify({ task: 'pin-text', ...input }),
      });
      if (!res.ok) {
        const msg = await res.json().then((d: { error?: string }) => d.error ?? '', () => '');
        throw new Error(msg || `AI service responded ${res.status}`);
      }
      const data = (await res.json()) as Partial<TextAssistResult>;
      const clean = (a: unknown) => (Array.isArray(a) ? a.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter(Boolean).slice(0, 10) : []);
      return { headlines: clean(data.headlines), subtitles: clean(data.subtitles), ctas: clean(data.ctas), variations: clean(data.variations), source: 'ai' };
    },
  };
}

/** The proxy URL is public configuration (not a secret). Undefined → AI features hidden. */
export const AI_PROXY_URL: string | undefined = import.meta.env.VITE_AI_PROXY_URL || undefined;
export const aiProvider: TextAssistProvider | null = AI_PROXY_URL ? createProxyProvider(AI_PROXY_URL) : null;
