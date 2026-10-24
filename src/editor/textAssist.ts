/**
 * Runs the text assistant (on-device rules, plus AI when enabled) and applies a
 * chosen suggestion to the current page as ordinary, undoable edits.
 */
import { applyHeadline, isText } from '../model/docOps';
import type { TextLayer } from '../model/types';
import { aiProvider, localProvider, type TextAssistInput, type TextAssistResult } from '../services/ai/provider';
import { useEditor } from '../store/editorStore';
import { useLibrary } from '../store/libraryStore';
import { useUi } from '../store/uiStore';
import { newTextLayer } from './blocks';

export type SuggestionKind = 'headline' | 'subtitle' | 'cta' | 'variation';

const merge = (a: string[], b: string[]) => [...new Set([...a, ...b])];

export async function runAssistant(input: TextAssistInput, useAi: boolean): Promise<TextAssistResult> {
  const local = await localProvider.suggest(input);
  if (!useAi || !aiProvider) return local;
  try {
    const ai = await aiProvider.suggest(input);
    return {
      headlines: merge(ai.headlines, local.headlines),
      subtitles: merge(ai.subtitles, local.subtitles),
      ctas: merge(ai.ctas, local.ctas),
      variations: merge(ai.variations, local.variations),
      source: 'ai',
    };
  } catch (e) {
    useUi.getState().toast(`AI is unavailable (${(e as Error).message}). Showing on-device suggestions.`, 'error');
    return local;
  }
}

export function applySuggestion(kind: SuggestionKind, text: string) {
  const ed = useEditor.getState();
  const project = ed.project;
  if (!project) return;
  const doc = project.doc;
  const kit = useLibrary.getState().activeKit();

  if (kind === 'headline' || kind === 'variation') {
    ed.setDoc(applyHeadline(doc, text));
    ed.updateMeta({ headline: text });
    if (project.name.startsWith('Untitled') || project.name.includes('—')) ed.updateProject({ name: text });
    return;
  }
  const role = kind === 'subtitle' ? 'subtitle' : 'cta';
  const existing = doc.layers.find((l): l is TextLayer => isText(l) && l.role === role);
  if (existing) {
    ed.updateLayer<TextLayer>(existing.id, { text, visible: true });
    ed.select([existing.id]);
    return;
  }
  // No slot for it yet: add one just below the headline (or near the bottom for a CTA).
  const layer = newTextLayer(doc, kind === 'subtitle' ? 'subheading' : 'cta', kit.headingFont, kit.bodyFont);
  const titles = doc.layers.filter((l) => isText(l) && (l.role === 'title' || l.role === 'title-line'));
  const below = titles.length ? Math.max(...titles.map((t) => t.y + t.height)) + doc.height * 0.01 : layer.y;
  ed.addLayers([{ ...layer, role, text, y: kind === 'subtitle' ? Math.min(below, doc.height - layer.height) : layer.y }]);
}
