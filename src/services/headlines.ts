import { ACCENT_WORDS } from '../model/docOps';

/**
 * Local, rule-based Pin headline suggestions. Runs entirely in the browser and
 * is always available; the AI provider (services/ai) adds to it when enabled.
 */

export interface HeadlineInput {
  articleTitle: string;
  keyword?: string;
  audience?: string;
}

const TRAILING_CLAUSE = /\s+((?:to|for|that|which|you|when|if|in\s+\d{4}|this|from|with|without|using)\s+.*)$/i;
const UNCOUNTABLE = /^(decor|makeup|hair|furniture|clothing|inspiration|inspo|skincare|art|lighting|storage)$/i;
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
  /** Leading descriptive word ("Stunning", "Minimalist"), if any. */
  descriptor: string | null;
  subject: string;
  listNoun: string | null;
  core: string;
  /** What follows the core ("to Take to Your Next Salon Appointment"), used for subtitles. */
  tail: string;
}

export function parseTitle(title: string): ParsedTitle {
  let t = title.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  const sep = t.match(SEPARATORS);
  let tail = sep ? sep[0].replace(/^\s*[:|–—(-]\s*/, '').replace(/\)$/, '') : '';
  t = t.replace(SEPARATORS, '');
  const numberMatch = t.match(/^(\d+\+?)\s+/);
  const number = numberMatch ? numberMatch[1] : null;
  let rest = number ? t.slice(numberMatch![0].length) : t;
  // "How to …" titles: the "to" belongs to the headline, so look for the clause after it.
  const howTo = rest.match(/^how\s+to\s+/i)?.[0] ?? '';
  const body = rest.slice(howTo.length);
  const clause = body.match(TRAILING_CLAUSE);
  if (clause && body.replace(TRAILING_CLAUSE, '').trim()) {
    tail = tail || clause[1];
    rest = howTo + body.replace(TRAILING_CLAUSE, '').trim();
  }
  const words = rest.split(' ');
  const last = words[words.length - 1]?.toLowerCase() ?? '';
  const listNoun = LIST_NOUNS.includes(last) ? words.pop()! : null;
  const descriptor = words.length > 1 && ACCENT_WORDS.test(words[0]) ? words.shift()! : null;
  const subject = words.join(' ').replace(/^(the|best|top)\s+/i, '');
  const core = [number, rest].filter(Boolean).join(' ');
  return { number, descriptor, subject, listNoun, core, tail: tail.trim() };
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
    const lastWord = words[words.length - 1];
    const pluralSubject = UNCOUNTABLE.test(lastWord) ? `${subj} ${noun}` : [...words.slice(0, -1), pluralize(lastWord)].join(' ');
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

const TOPIC_SUBTITLES: [RegExp, string[]][] = [
  [/hair|haircut|bob\b|lob\b|braid|bangs|balayage|blonde|bronde|brunette/i, ['For Your Next Salon Appointment', 'Easy Looks to Show Your Stylist', 'Low-Maintenance Styles You’ll Love']],
  [/decor|room|balcon|patio|home|kitchen|bedroom|living/i, ['To Transform Your Space', 'Easy Ideas for Every Budget', 'Cozy Inspiration to Save Now']],
  [/outfit|fashion|wear|wardrobe/i, ['Easy Looks to Recreate', 'Effortless Outfits for Every Day']],
  [/recipe|dinner|meal|food|bake|chicken|pasta/i, ['Easy Recipes Ready in 30 Minutes', 'Simple Weeknight Favorites']],
  [/makeup|nail|skin|beauty/i, ['Easy Looks to Try This Week', 'Pretty Ideas for Every Occasion']],
  [/love|relationship|marriage|dating|couple/i, ['Simple Habits for a Stronger Bond', 'Advice Worth Saving']],
];

/** Short supporting lines for under a headline (subtitle / ribbon text). */
export function suggestSubtitles(input: HeadlineInput, max = 6): string[] {
  const title = input.articleTitle.trim();
  if (!title) return [];
  const { tail } = parseTitle(title);
  const out: string[] = [];
  const push = (v: string) => {
    const c = titleCase(v.replace(/\s+/g, ' ').trim());
    if (c && c.length <= 48 && !out.some((o) => o.toLowerCase() === c.toLowerCase())) out.push(c);
  };
  if (tail) push(tail);
  const topic = `${title} ${input.keyword ?? ''}`;
  for (const [re, lines] of TOPIC_SUBTITLES) if (re.test(topic)) lines.forEach(push);
  ['Ideas You’ll Want to Save', 'Everything You Need to Know', 'Simple Ideas You Can Copy'].forEach(push);
  return out.slice(0, max);
}

/** Longer, sentence-style alternatives of the headline (title cards, Pin titles). */
export function suggestVariations(input: HeadlineInput, max = 6): string[] {
  const title = input.articleTitle.trim();
  if (!title) return [];
  const { number, descriptor, subject, listNoun, tail } = parseTitle(title);
  const subj = titleCase(subject || input.keyword || '');
  if (!subj) return [];
  const noun = listNoun ? titleCase(listNoun) : 'Ideas';
  const n = number ? `${number} ` : '';
  const benefit = titleCase(tail || suggestSubtitles(input, 1)[0] || 'You’ll Love');
  const adj = [...new Set([descriptor ? titleCase(descriptor) : 'Stunning', 'Beautiful', 'Creative', 'Easy', 'Gorgeous'])];
  const out = [
    `${n}${adj[0]} ${subj} ${noun} ${benefit}`,
    `${n}${adj[1]} ${subj} ${noun} ${benefit}`,
    `${n}${adj[2]} ${subj} ${noun}`,
    number ? `${subj} ${noun}: ${number} ${adj[3]} Ideas to Try` : `${adj[3]} ${subj} ${noun} to Try Today`,
    `The Ultimate Guide to ${subj} ${noun}`,
    `${n}${adj[4]} ${subj} ${noun} You Need to See`,
  ].map((v) => titleCase(v.replace(/\s+/g, ' ').trim()).replace(/: (\w)/, (_, c: string) => `: ${c.toUpperCase()}`));
  return [...new Set(out)].slice(0, max);
}

export function suggestCtas(website?: string): string[] {
  const list = ['Read More', 'Get the Full List', 'Save for Later', 'See All the Ideas', 'Get the Recipe', 'Tap for More'];
  if (website) list.splice(1, 0, `More on ${website}`);
  return list;
}
