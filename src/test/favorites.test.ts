import { beforeEach, describe, expect, it } from 'vitest';
import { autoDesign } from '../services/autoDesign';
import { buildTaste, tasteBoost, tasteSummary, tasteTraits } from '../services/tasteProfile';
import { currentTaste, favoriteTemplates, keepOnlyFavorites } from '../store/favorites';
import { allTemplates } from '../store/projectActions';
import { useLibrary } from '../store/libraryStore';
import { BUILTIN_TEMPLATES } from '../templates/builtins';

const photoTemplates = BUILTIN_TEMPLATES.filter((t) => t.imageCount > 0);

describe('learned taste from favorites', () => {
  it('describes a template as traits and scores favorites and look-alikes', () => {
    const fav = photoTemplates[5];
    expect(tasteTraits(fav).length).toBeGreaterThan(3);
    const taste = buildTaste([fav])!;
    expect(tasteBoost(fav, taste)).toBe(1);
    expect(tasteBoost(fav, null)).toBe(0);
    const others = photoTemplates.filter((t) => t.id !== fav.id).map((t) => tasteBoost(t, taste));
    expect(Math.max(...others)).toBeLessThanOrEqual(1);
    expect(Math.max(...others)).toBeGreaterThan(Math.min(...others));
    expect(buildTaste([])).toBeNull();
  });

  it('puts the hearted style first in Auto Design', () => {
    const input = { title: '25 Stunning Wedding Hairstyles for Long Hair', cta: false as const };
    const plain = autoDesign(input, BUILTIN_TEMPLATES, { measure: () => 1, limit: 12 });
    // Heart three designs Auto Design did NOT lead with, all from one family.
    const shown = new Set(plain.map((r) => r.template.id));
    const family = photoTemplates.find((t) => !shown.has(t.id))!.family;
    const favs = photoTemplates.filter((t) => t.family === family && !shown.has(t.id)).slice(0, 3);
    const liked = autoDesign(input, BUILTIN_TEMPLATES, { measure: () => 1, limit: 12, taste: buildTaste(favs) });
    const favIds = new Set(favs.map((t) => t.id));
    expect(plain.slice(0, 6).some((r) => favIds.has(r.template.id))).toBe(false);
    expect(liked.slice(0, 6).some((r) => favIds.has(r.template.id))).toBe(true);
    expect(liked.slice(0, 6).filter((r) => r.template.family === family).length).toBeGreaterThan(plain.slice(0, 6).filter((r) => r.template.family === family).length);
  });

  it('says what it learned in plain words', () => {
    const banded = photoTemplates.filter((t) => tasteTraits(t).includes('text:solid-band')).slice(0, 4);
    expect(tasteSummary(buildTaste(banded))).toContain('bold headline bands');
    expect(tasteSummary(null)).toEqual([]);
  });
});

describe('favorites list', () => {
  beforeEach(() => {
    localStorage.clear();
    useLibrary.setState({ favoriteTemplateIds: [], userTemplates: [], hiddenTemplateIds: [] });
  });

  it('hearts and un-hearts, newest first, and remembers across reloads', () => {
    const [a, b] = photoTemplates;
    expect(useLibrary.getState().toggleFavorite(a.id)).toBe(true);
    expect(useLibrary.getState().toggleFavorite(b.id)).toBe(true);
    expect(favoriteTemplates().map((t) => t.id)).toEqual([b.id, a.id]);
    expect(JSON.parse(localStorage.getItem('pinforge.favoriteTemplates')!)).toEqual([b.id, a.id]);
    expect(currentTaste()?.count).toBe(2);
    expect(useLibrary.getState().toggleFavorite(a.id)).toBe(false);
    expect(favoriteTemplates().map((t) => t.id)).toEqual([b.id]);
  });

  it('adds a design the user saves as a template, and forgets it when deleted', async () => {
    const t = await useLibrary.getState().saveTemplate('My bridal look', photoTemplates[0].doc, ['Hair']);
    expect(useLibrary.getState().favoriteTemplateIds[0]).toBe(t.id);
    expect(currentTaste()?.favoriteIds.has(t.id)).toBe(true);
    await useLibrary.getState().deleteTemplate(t.id);
    expect(useLibrary.getState().favoriteTemplateIds).not.toContain(t.id);
  });

  it('keeps only the favorites, and Restore brings the rest back', () => {
    const [a, b] = photoTemplates;
    useLibrary.getState().toggleFavorite(a.id);
    useLibrary.getState().toggleFavorite(b.id);
    expect(keepOnlyFavorites()).toBe(BUILTIN_TEMPLATES.length - 2);
    expect(allTemplates().map((t) => t.id).sort()).toEqual([a.id, b.id].sort());
    expect(autoDesign({ title: 'Wedding Hairstyles', cta: false }, allTemplates(), { measure: () => 1 }).every((r) => [a.id, b.id].includes(r.template.id))).toBe(true);
    useLibrary.getState().restoreHiddenTemplates();
    expect(allTemplates()).toHaveLength(BUILTIN_TEMPLATES.length);
  });
});
