import { Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { aiProvider, type TextAssistResult } from '../../services/ai/provider';
import { useEditor } from '../../store/editorStore';
import { useLibrary } from '../../store/libraryStore';
import { useUi } from '../../store/uiStore';
import { Field, Modal, Toggle } from '../../ui/controls';
import { applySuggestion, runAssistant, type SuggestionKind } from '../textAssist';

const TABS: { id: SuggestionKind; label: string; key: keyof Omit<TextAssistResult, 'source'> }[] = [
  { id: 'headline', label: 'Pin Headlines', key: 'headlines' },
  { id: 'subtitle', label: 'Subtitles', key: 'subtitles' },
  { id: 'cta', label: 'CTA Text', key: 'ctas' },
  { id: 'variation', label: 'Variations', key: 'variations' },
];

/** AI Text Assistant: article title → headlines, subtitles, CTAs and variations, each one click to use. */
export function AiAssistantModal() {
  const project = useEditor((s) => s.project!);
  const aiEnabled = useUi((s) => s.aiEnabled);
  const [title, setTitle] = useState(project.meta.articleTitle);
  const [keyword, setKeyword] = useState(project.meta.keyword);
  const [tab, setTab] = useState<SuggestionKind>('headline');
  const [result, setResult] = useState<TextAssistResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [used, setUsed] = useState<string | null>(null);
  const close = () => useUi.getState().set({ modal: null });

  const generate = async () => {
    if (!title.trim()) {
      useUi.getState().toast('Enter your article title first.', 'info');
      return;
    }
    useEditor.getState().updateMeta({ articleTitle: title.trim(), keyword: keyword.trim() });
    setBusy(true);
    try {
      setResult(await runAssistant({ articleTitle: title, keyword, website: useLibrary.getState().activeKit().website }, aiEnabled));
    } finally {
      setBusy(false);
    }
  };

  // Show suggestions straight away when the project already has an article title.
  useEffect(() => {
    if (project.meta.articleTitle) void generate();
  }, []);

  const items = result ? result[TABS.find((t) => t.id === tab)!.key] : [];

  return (
    <Modal title="AI Text Assistant" onClose={close}>
      <div className="stack">
        <Field label="Enter your article title">
          <div className="row">
            <input
              className="input grow"
              value={title}
              placeholder="e.g. 28 Stunning Balcony Decor Ideas to Transform Your Space"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generate()}
            />
            <button className="btn btn-pink" onClick={generate} disabled={busy}>
              {busy ? <Loader2 size={16} /> : <Sparkles size={16} />} Generate
            </button>
          </div>
        </Field>
        <Field label="Primary keyword (optional)">
          <input className="input" value={keyword} placeholder="e.g. balcony decor" onChange={(e) => setKeyword(e.target.value)} />
        </Field>
        {aiProvider ? (
          <Toggle label="Use AI (sends the title and keyword only — never images)" checked={aiEnabled} onChange={(v) => useUi.getState().set({ aiEnabled: v })} />
        ) : (
          <span className="subtle">Suggestions are generated on your device. Connect an AI proxy (see README) for AI-written options.</span>
        )}
        <div className="tabs tabs-sm" role="tablist" aria-label="Suggestion type">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {!result && !busy && <p className="subtle">Enter a title and press Generate.</p>}
        {result && items.length === 0 && <p className="subtle">No suggestions of this kind for this title.</p>}
        <div className="suggest-list" role="list">
          {items.map((text) => (
            <div key={text} className="suggest-row" role="listitem">
              <span className="grow">{text}</span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Copy"
                data-tip={copied === text ? 'Copied' : 'Copy'}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(text);
                    setCopied(text);
                  } catch {
                    useUi.getState().toast("Couldn't copy — your browser blocked clipboard access.", 'error');
                  }
                }}
              >
                {copied === text ? <Check size={15} /> : <Copy size={15} />}
              </button>
              <button
                type="button"
                className="btn btn-pink btn-sm"
                onClick={() => {
                  applySuggestion(tab, text);
                  setUsed(text);
                }}
              >
                {used === text ? 'Used' : 'Use'}
              </button>
            </div>
          ))}
        </div>
        {result && <span className="subtle">{result.source === 'ai' ? 'AI + on-device suggestions.' : 'On-device suggestions.'} “Use” puts the text on the Pin — undo with Ctrl+Z.</span>}
      </div>
    </Modal>
  );
}
