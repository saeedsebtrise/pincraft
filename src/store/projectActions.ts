/**
 * Project-level workflows used by the dashboard and editor: create from a
 * template, duplicate, fresh variations and batch variations.
 */
import { findPreset } from '../config/canvasPresets';
import { assignImages, frames, instantiateTemplate, invertBlocks, readHeadline, slotFrames, switchTemplate } from '../model/docOps';
import { clone, createDocument, createProject, newId, normalizeProject } from '../model/factory';
import type { BrandKit, PinDocument, Project, Template } from '../model/types';
import { parseTitle, titleCase } from '../services/headlines';
import { repos } from '../storage/repositories';
import { BLANK_TEMPLATE_ID, BUILTIN_TEMPLATES } from '../templates/builtins';
import { useAssets } from './assetStore';
import { useLibrary } from './libraryStore';

export function allTemplates(): Template[] {
  return [...useLibrary.getState().userTemplates, ...BUILTIN_TEMPLATES];
}

export function findTemplate(id: string | null | undefined): Template | undefined {
  return id ? allTemplates().find((t) => t.id === id) : undefined;
}

import { buildCustomPinDocument, type CustomPinLayoutId } from '../model/customPinLayouts';

export interface NewPinOptions {
  width: number;
  height: number;
  presetId: string;
  templateId: string | null;
  articleTitle?: string;
  headline?: string;
  customLayout?: CustomPinLayoutId;
}

export async function createPin(o: NewPinOptions): Promise<Project> {
  const brand = useLibrary.getState().activeKit();
  const template = findTemplate(o.templateId);
  let doc: PinDocument;
  if (o.customLayout) {
    doc = buildCustomPinDocument({
      width: o.width,
      height: o.height,
      presetId: o.presetId,
      layoutId: o.customLayout,
      headline: o.headline || o.articleTitle,
      brand,
    });
  } else if (template && template.id !== BLANK_TEMPLATE_ID) {
    doc = instantiateTemplate(template, {
      width: o.width,
      height: o.height,
      presetId: o.presetId,
      headline: o.headline,
      subtitle: o.articleTitle ? titleCase(parseTitle(o.articleTitle).tail) || undefined : undefined,
      website: brand.website,
      brand: null, // templates keep their designed typography; brand fonts are one click away
    });
  } else {
    doc = createDocument(o.width, o.height, o.presetId);
  }
  const preset = findPreset(o.presetId, useLibrary.getState().customPresets);
  const name = o.headline || o.articleTitle || `${template && template.id !== BLANK_TEMPLATE_ID ? template.name : 'Blank Pin'} — ${preset?.aspectRatio ?? `${o.width}×${o.height}`}`;
  const p = createProject(doc, name);
  p.meta = { ...p.meta, templateId: template?.id ?? null, articleTitle: o.articleTitle ?? '', headline: o.headline ?? '', brandKitId: brand.id };
  await repos.projects.put(p);
  return p;
}

export async function saveProject(p: Project): Promise<Project> {
  const next = { ...normalizeProject(p), meta: { ...p.meta, updatedAt: Date.now() } };
  await repos.projects.put(next);
  return next;
}

export function cloneProject(p: Project, name: string, doc: PinDocument = p.doc): Project {
  const now = Date.now();
  return {
    ...clone(p),
    id: newId('p_'),
    name,
    doc: clone(doc),
    pages: [clone(doc)],
    activePage: 0,
    meta: { ...p.meta, createdAt: now, updatedAt: now },
  };
}

export async function duplicateProject(p: Project): Promise<Project> {
  const src = normalizeProject(p);
  const copy = { ...cloneProject(src, `${p.name} (copy)`), pages: clone(src.pages), activePage: src.activePage };
  await repos.projects.put(copy);
  return copy;
}

export type VariationKind = 'duplicate' | 'shuffle-images' | 'swap-blocks' | 'next-template';

function variationName(p: Project, label: string) {
  return `${p.name.replace(/ — Variation.*$/, '')} — Variation (${label})`;
}

/** "Create Variation": a fresh copy of the current Pin, optionally remixed. */
export function makeVariation(p: Project, kind: VariationKind, brand: BrandKit | null): Project {
  let doc = clone(p.doc);
  let label = 'copy';
  if (kind === 'shuffle-images') {
    const assigned = slotFrames(doc).concat(frames(doc).filter((f) => f.slot === null)).map((f) => f.assetId);
    const pool = [...new Set([...assigned.filter(Boolean), ...p.assetIds])] as string[];
    // rotate the pool by one so every frame gets a different image when possible
    const rotated = pool.length > 1 ? [...pool.slice(1), pool[0]] : pool;
    doc = { ...doc, layers: doc.layers.map((l) => (l.type === 'frame' && l.role !== 'logo' ? { ...l, assetId: null } : l)) };
    doc = assignImages(doc, rotated, useAssets.getState().metas, { onlyEmpty: true });
    label = 'new images';
  } else if (kind === 'swap-blocks') {
    doc = invertBlocks(doc);
    label = 'swapped colors';
  } else if (kind === 'next-template') {
    const list = allTemplates().filter((t) => t.imageCount > 0);
    const i = list.findIndex((t) => t.id === p.meta.templateId);
    const want = Math.max(1, frames(doc).filter((f) => f.assetId).length);
    const next = [...list.slice(i + 1), ...list.slice(0, i + 1)].find((t) => t.imageCount === want && t.id !== p.meta.templateId) ?? list[(i + 1) % list.length];
    doc = switchTemplate(doc, next, p.assetIds, useAssets.getState().metas, brand);
    const v = cloneProject(p, variationName(p, next.name), doc);
    v.meta.templateId = next.id;
    return v;
  }
  return cloneProject(p, variationName(p, label), doc);
}

/** Batch variations: the same article, images and headline across several templates. */
export function generateBatch(p: Project, templates: Template[]): Project[] {
  const metas = useAssets.getState().metas;
  const brand = useLibrary.getState().activeKit();
  return templates.map((t) => {
    const doc = switchTemplate(p.doc, t, p.assetIds, metas, null);
    const v = cloneProject(p, `${readHeadline(p.doc) || p.name} — ${t.name}`, doc);
    v.meta.templateId = t.id;
    v.meta.brandKitId = brand.id;
    return v;
  });
}

