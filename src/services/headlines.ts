/**
 * Local, rule-based Pin headline suggestions. Runs entirely in the browser and
 * is always available; the AI provider (services/ai) adds to it when enabled.
 */

export interface HeadlineInput {
  articleTitle: string;
  keyword?: string;
  audience?: string;
}

const TRAILING_CLAUSE = /\s+(?:to|for|that|which|you|when|if|in\s+\d{4}|this|from|with)\s+.*$/i;
const SEPARATORS = /\s*(?:[:|–—]|\s-\s|\().*$/;
const LIST_NOUNS = ['ideas', 'ways', 'tips', 'looks', 'styles', 'designs', 'recipes', 'outfits', 'hacks', 'examples', 'inspo'];
const ADJECTIVES = ['Chic', 'Stunning', 'Easy', 'Gorgeous', 'Best'];

const SMALL_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'for', 'of', 'to', 'in', 'on', 'at', 'by', 'with', 'vs']);

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .replace(/\b(\d+)(s?)\b/g, '$1$2');
}

function pluralize(word: string): string {
  if (/s$/i.test(word)) return word;
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies';
  if (/(ch|sh|x)$/i.test(word)) return word + 'es';
  return word + 's';
}

export interface ParsedTitle {
  number: string | null;
  subject: string;
  listNoun: string | null;
  core: string;
}

export function parseTitle(title: string): ParsedTitle {
  let t = title.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  t = t.replace(SEPARATORS, '');
  const numberMatch = t.match(/^(\d+\+?)\s+/);
  const number = numberMatch ? numberMatch[1] : null;
  let rest = number ? t.slice(numberMatch![0].length) : t;
  rest = rest.replace(TRAILING_CLAUSE, '').trim() || rest;
  const words = rest.split(' ');
  const last = words[words.length - 1]?.toLowerCase() ?? '';
  const listNoun = LIST_NOUNS.includes(last) ? words.pop()! : null;
  const subject = words.join(' ').replace(/^(the|best|top)\s+/i, '');
  const core = [number, rest].filter(Boolean).join(' ');
  return { number, subject, listNoun, core };
}

/** Returns up to `max` short, distinct overlay headlines for an article title. */
export function suggestHeadlines(input: HeadlineInput, max = 8): string[] {
  const title = input.articleTitle.trim();
  if (!title) return [];
  const { number, subject, listNoun, core } = parseTitle(title);
  const subj = titleCase(subject || input.keyword || '');
  const noun = listNoun ? titleCase(listNoun) : 'Ideas';
  const out: string[] = [];
  const push = (s: string) => {
    const v = titleCase(s.replace(/\s+/g, ' ').trim());
    if (v && v.length <= 60 && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v);
  };

  push(core);
  if (subj) {
    const words = subj.split(' ');
    const pluralSubject = [...words.slice(0, -1), pluralize(words[words.length - 1])].join(' ');
    if (number) {
      push(`${number} ${subj} ${noun}`);
      push(`${number} ${ADJECTIVES[0]} ${pluralSubject}`);
      push(`${number} ${ADJECTIVES[1]} ${subj} ${noun}`);
    }
    push(`${subj} ${noun} You'll Love`);
    push(`The Best ${subj} ${noun}`);
    push(`${ADJECTIVES[2]} ${subj} ${noun}`);
    if (number) push(`${number} ${subj} ${noun} to Try`);
    push(`${pluralSubject} to Save Now`);
  }
  if (input.keyword && !out.some((o) => o.toLowerCase().includes(input.keyword!.toLowerCase()))) {
    push(`${number ? number + ' ' : ''}${input.keyword} ${noun}`);
  }
  if (title.length <= 60) push(title);
  return out.slice(0, max);
}

export function suggestCtas(website?: string): string[] {
  const list = ['Read More', 'Get the Full List', 'Save for Later', 'See All the Ideas', 'Get the Recipe', 'Tap for More'];
  if (website) list.splice(1, 0, `More on ${website}`);
  return list;
}
