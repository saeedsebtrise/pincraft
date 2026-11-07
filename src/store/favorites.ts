import { useMemo } from 'react';
import type { Template } from '../model/types';
import { buildTaste, tasteSummary, type Taste } from '../services/tasteProfile';
import { BUILTIN_TEMPLATES } from '../templates/builtins';
import { useLibrary } from './libraryStore';
import { useUi } from './uiStore';

/** The favorite templates that still exist, newest first. */
export function favoriteTemplates(): Template[] {
  const { favoriteTemplateIds, userTemplates } = useLibrary.getState();
  const byId = new Map([...userTemplates, ...BUILTIN_TEMPLATES].map((t) => [t.id, t]));
  return favoriteTemplateIds.map((id) => byId.get(id)).filter((t): t is Template => !!t);
}

let cache: { key: string; taste: Taste | null } | null = null;
/** The user's learned taste for Auto Design (null until they heart something). */
export function currentTaste(): Taste | null {
  const favs = favoriteTemplates();
  const key = favs.map((t) => t.id).join(',');
  if (cache?.key !== key) cache = { key, taste: buildTaste(favs) };
  return cache.taste;
}

/** Hearts or un-hearts a template and says what that does. */
export function toggleFavorite(t: Template) {
  const on = useLibrary.getState().toggleFavorite(t.id);
  useUi.getState().toast(on ? `Added “${t.name}” to Favorites — Auto Design will lead with this style` : `Removed “${t.name}” from Favorites`, 'success');
}

export function useIsFavorite(id: string): boolean {
  return useLibrary((s) => s.favoriteTemplateIds.includes(id));
}

/** What PinCraft has learned so far, in plain words ("bold headline bands", …). */
export function useTasteSummary(): { count: number; likes: string[] } {
  const ids = useLibrary((s) => s.favoriteTemplateIds);
  const user = useLibrary((s) => s.userTemplates);
  return useMemo(() => {
    void ids; // recomputed when the favorites or the user's own templates change
    void user;
    const taste = currentTaste();
    return { count: taste?.count ?? 0, likes: tasteSummary(taste) };
  }, [ids, user]);
}
