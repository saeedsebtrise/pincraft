/**
 * CSV Import: one CSV row per Pin. Rows give the title, description, link,
 * board, keyword, image URLs and (optionally) a publish date/time; rows
 * without a time are spread across the coming days inside a daily window.
 */
import type { Id } from '../model/types';
import { useAssets } from '../store/assetStore';
import { csvRecords } from './studioVars';

export interface CsvPin {
  row: number;
  title: string;
  description: string;
  link: string;
  board: string;
  keyword: string;
  images: string[];
  /** The raw row, for Studio Template Import ({{variables}}). */
  values: Record<string, string>;
  /** From publish_date + publish_time when both are given (local time). */
  fixedAt: number | null;
}

export const CSV_COLUMNS: { name: string; required?: boolean; help: string }[] = [
  { name: 'title', required: true, help: 'Pin title / headline (also {{title}})' },
  { name: 'description', help: 'Pin description (also {{description}})' },
  { name: 'link', help: 'Destination URL — your blog post' },
  { name: 'image_url', help: 'Photo URL. More photos: image_2, image_3, image_4 (or image_1…image_4)' },
  { name: 'board', help: 'Pinterest board name' },
  { name: 'keyword', help: 'Main keyword — helps pick the design' },
  { name: 'cta', help: 'Call to action (Studio templates: {{cta}})' },
  { name: 'website', help: 'Website shown on the Pin (defaults to your Brand Kit)' },
  { name: 'publish_date', help: 'YYYY-MM-DD — with publish_time keeps that slot' },
  { name: 'publish_time', help: 'HH:MM (24h) — leave both blank to auto-schedule' },
];

export const SAMPLE_CSV = [
  'title,description,link,image_url,image_2,board,keyword,cta,publish_date,publish_time',
  '"Easy Chicken Recipe","A 20-minute family dinner everyone loves",https://example.com/chicken,https://images.unsplash.com/photo-1604908176997-125f25cc6f3d,,Dinner Recipes,chicken recipe,Save Recipe,,',
  '"25 Balcony Decor Ideas","Small space, big style",https://example.com/balcony,https://images.unsplash.com/photo-1600585154340-be6161a56a0c,https://images.unsplash.com/photo-1600210492486-724fe5c67fb0,Home Decor,balcony decor,Read More,2026-11-10,09:30',
].join('\n');

const pick = (r: Record<string, string>, ...keys: string[]) => keys.map((k) => r[k]).find((v) => v && v.trim()) ?? '';

function parseFixed(date: string, time: string): number | null {
  const d = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!d || !t) return null;
  const at = new Date(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]).getTime();
  return Number.isFinite(at) ? at : null;
}

export function readCsvPins(text: string): { pins: CsvPin[]; headers: string[]; skipped: number[] } {
  const { headers, records } = csvRecords(text);
  const pins: CsvPin[] = [];
  const skipped: number[] = [];
  records.forEach((r, i) => {
    const title = pick(r, 'title', 'pin_title', 'headline', 'name');
    if (!title) {
      skipped.push(i + 2); // spreadsheet row number (header is row 1)
      return;
    }
    const images = [pick(r, 'image_url', 'image', 'image_1', 'media_url'), r.image_2, r.image_3, r.image_4]
      .map((u) => (u ?? '').trim())
      .filter((u, j, all) => /^https?:\/\//i.test(u) && all.indexOf(u) === j);
    pins.push({
      row: i + 2,
      title,
      description: pick(r, 'description', 'pin_description'),
      link: pick(r, 'link', 'url', 'destination_link'),
      board: pick(r, 'board', 'board_name'),
      keyword: pick(r, 'keyword', 'keywords'),
      images,
      values: { ...r, title, ...(images[0] && !r.image_1 ? { image_1: images[0] } : {}) },
      fixedAt: parseFixed(r.publish_date ?? '', r.publish_time ?? ''),
    });
  });
  return { pins, headers, skipped };
}

export interface ScheduleOptions {
  minPerDay: number;
  maxPerDay: number;
  /** Daily window, local hours. */
  startHour: number;
  endHour: number;
  /** First day to fill (local midnight is taken from it). Defaults to tomorrow. */
  from?: Date;
}

/**
 * Publish times for every Pin: fixed rows keep theirs, the rest fill the days
 * from `from` on, `perDay` evenly spaced slots a day (perDay = clamp(ceil(n/14), min, max),
 * i.e. spread over about two weeks).
 */
export function schedulePins(pins: Pick<CsvPin, 'fixedAt'>[], o: ScheduleOptions): number[] {
  const min = Math.max(1, Math.floor(o.minPerDay));
  const max = Math.max(min, Math.floor(o.maxPerDay));
  const open = pins.filter((p) => p.fixedAt == null).length;
  const perDay = Math.min(max, Math.max(min, Math.ceil(open / 14)));
  const start = o.from ? new Date(o.from) : new Date(Date.now() + 86_400_000);
  start.setHours(0, 0, 0, 0);
  const span = Math.max(1, o.endHour - o.startHour) * 60; // minutes
  const step = span / perDay;
  let n = 0;
  return pins.map((p) => {
    if (p.fixedAt != null) return p.fixedAt;
    const day = Math.floor(n / perDay);
    const slot = n % perDay;
    n++;
    const d = new Date(start);
    d.setDate(d.getDate() + day);
    d.setMinutes(o.startHour * 60 + Math.round(step * slot + step / 2));
    return d.getTime();
  });
}

/** Downloads a photo through the server's image proxy into the asset library. */
export async function importImageUrl(url: string): Promise<Id | null> {
  try {
    const res = await fetch(`/api/image?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'photo.jpg');
    const { ids } = await useAssets.getState().importFiles([Object.assign(blob, { name })]);
    return ids[0] ?? null;
  } catch {
    return null;
  }
}

export function downloadText(name: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
