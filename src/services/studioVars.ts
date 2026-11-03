/**
 * Design Studio variables: text layers can hold {{title}}, {{cta}}… and image
 * placeholders are frames named after {{image_1}}…. One design then renders
 * many Pins: preview values fill it once, and every row of a CSV (Canva Bulk
 * style, columns named like the variables) fills a copy.
 */
import { clone } from '../model/factory';
import { isFrame, isText, reId } from '../model/docOps';
import type { Id, PinDocument } from '../model/types';

export const TEXT_VARS = ['title', 'description', 'cta', 'website', 'logo'] as const;
export const IMAGE_VARS = ['image_1', 'image_2', 'image_3', 'image_4'] as const;
export const STUDIO_VARS = [...TEXT_VARS, ...IMAGE_VARS] as const;

export const SAMPLE_VALUES: Record<string, string> = {
  title: 'Easy Chicken Recipe',
  description: 'Best Family Dinner',
  cta: 'Save Recipe',
  website: 'example.com',
};

const TOKEN = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/gi;

export const token = (name: string) => `{{${name}}}`;

/** The variable an image placeholder frame stands for ("image_1"), from its name. */
export function frameVariable(name: string): string | null {
  const m = /\{\{\s*(image_\d+)\s*\}\}/i.exec(name);
  return m ? m[1].toLowerCase() : null;
}

/** Every variable the design uses, in first-seen order (text first, then images). */
export function findVariables(doc: PinDocument): string[] {
  const found: string[] = [];
  const add = (v: string) => !found.includes(v) && found.push(v);
  for (const l of doc.layers) {
    if (isText(l)) for (const m of l.text.matchAll(TOKEN)) add(m[1].toLowerCase());
  }
  for (const l of doc.layers) {
    const v = isFrame(l) ? frameVariable(l.name) : null;
    if (v) add(v);
  }
  return found;
}

/** Replaces {{name}} in every text layer; unknown or empty variables are left as they are. */
export function fillText(text: string, values: Record<string, string>): string {
  return text.replace(TOKEN, (all, name: string) => {
    const v = values[name.toLowerCase()];
    return v != null && v.trim() !== '' ? v : all;
  });
}

/**
 * A copy of the design with the values in place. `images` maps an image
 * variable to an asset id for its placeholder frame.
 */
export function fillVariables(doc: PinDocument, values: Record<string, string>, images: Record<string, Id> = {}): PinDocument {
  const d = clone(doc);
  d.layers = d.layers.map((l) => {
    if (isText(l)) return { ...l, text: fillText(l.text, values) };
    if (isFrame(l)) {
      const v = frameVariable(l.name);
      if (v && images[v]) return { ...l, assetId: images[v] };
    }
    return l;
  });
  return d;
}

/** A filled copy for a new page: fresh layer ids so pages never share selection. */
export const fillAsPage = (doc: PinDocument, values: Record<string, string>, images: Record<string, Id> = {}) => reId(fillVariables(doc, values, images));

/** RFC-4180-ish CSV: quoted fields, "" escapes, commas/newlines inside quotes, CRLF. Blank lines dropped. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

/** CSV rows as value maps keyed by the (lower-cased, {{ }}-stripped) header names. */
export function csvRecords(text: string): { headers: string[]; records: Record<string, string>[] } {
  const [head = [], ...rest] = parseCsv(text);
  const headers = head.map((h) => h.trim().replace(/^\{\{\s*|\s*\}\}$/g, '').toLowerCase().replace(/\s+/g, '_'));
  const records = rest.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
  return { headers, records };
}

/** Row values with fallbacks for the blank or missing ones (e.g. the Brand Kit website). */
export function withDefaults(values: Record<string, string>, defaults: Record<string, string>): Record<string, string> {
  const out = { ...defaults };
  for (const [k, v] of Object.entries(values)) if (v && v.trim()) out[k] = v;
  return out;
}
