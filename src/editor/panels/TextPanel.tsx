import { Bot, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { applyHeadline, readHeadline } from '../../model/docOps';
import type { TextLayer } from '../../model/types';
import { aiProvider, type TextAssistResult } from '../../services/ai/provider';
import { useEditor } from '../../store/editorStore';
import { useLibrary } from '../../store/libraryStore';
import { useUi } from '../../store/uiStore';
import { Field, Toggle } from '../../ui/controls';
import { addCenterBand, FOOTER_STYLES, newBadge, newComposition, newFooter, newTextLayer, TEXT_STYLES, type BadgeShape, type BandStyle, type CompositionId, type TextKind } from '../blocks';
import type { FooterStyle } from '../../templates/builtins';
import { applySuggestion, runAssistant } from '../textAssist';

export function HeadlineAssistant() {
  const project = useEditor((s) => s.project!);
  const aiEnabled = useUi((s) => s.aiEnabled);
  const [title, setTitle] = useState(project.meta.articleTitle);
  const [keyword, setKeyword] = useState(project.meta.keyword);
  const [result, setResult] = useState<TextAssistResult | null>(null);
  const [busy, setBusy] = useState(false);
  const ed = useEditor.getState();
  const current = readHeadline(project.doc);
  const [pinHeadline, setPinHeadline] = useState(current);

  useEffect(() => {
    setPinHeadline(current);
  }, [current]);

  const applyTopicToCanvas = (textToApply: string) => {
    const val = textToApply.trim();
    if (!val) {
      useUi.getState().toast('Enter an article title or topic first.', 'info');
      return;
    }
    ed.setDoc(applyHeadline(ed.project!.doc, val));
    ed.updateMeta({ headline: val, articleTitle: title.trim() || val });
    setPinHeadline(val);
    useUi.getState().toast('Topic auto-adjusted on canvas!', 'success');
  };

  const run = async (useAi: boolean) => {
    if (!title.trim()) {
      useUi.getState().toast('Enter your article title first.', 'info');
      return;
    }
    ed.updateMeta({ articleTitle: title.trim(), keyword: keyword.trim() });
    setBusy(true);
    try {
      setResult(await runAssistant({ articleTitle: title, keyword, website: useLibrary.getState().activeKit().website }, useAi));
    } finally {
      setBusy(false);
    }
  };

  const use = (h: string) => {
    setPinHeadline(h);
    applySuggestion('headline', h);
  };

  return (
    <div className="panel-section">
      <span className="section-title">Pin headline</span>
      <Field label="Article title / Topic">
        <textarea
          className="textarea"
          rows={2}
          value={title}
          placeholder="e.g. 50 Lob Haircut Ideas to Take to Your Next Salon Appointment"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyTopicToCanvas(title);
            }
          }}
        />
      </Field>
      <div className="row" style={{ marginBottom: 6 }}>
        <button
          type="button"
          className="btn btn-pink btn-sm grow"
          style={{ justifyContent: 'center' }}
          onClick={() => applyTopicToCanvas(title)}
          disabled={!title.trim()}
          title="Auto-adjusts your topic onto the canvas with optimal typography and contrast"
        >
          <Sparkles size={14} /> Auto-Adjust Topic to Canvas
        </button>
      </div>
      <Field label="Primary keyword (optional)">
        <input className="input" value={keyword} placeholder="e.g. lob haircut" onChange={(e) => setKeyword(e.target.value)} />
      </Field>
      <div className="row">
        <button className="btn btn-dark btn-sm grow" onClick={() => run(false)} disabled={busy}>
          {busy ? <Loader2 size={14} /> : <Wand2 size={14} />} Suggest headlines
        </button>
        {aiProvider && aiEnabled && (
          <button className="btn btn-sm" onClick={() => run(true)} disabled={busy} data-tip="Sends only the title & keyword to your AI proxy">
            <Bot size={14} /> AI
          </button>
        )}
      </div>
      {aiProvider && (
        <Toggle label="Enable AI text assistant (sends text only, never images)" checked={aiEnabled} onChange={(v) => useUi.getState().set({ aiEnabled: v })} />
      )}
      {result && (
        <div className="stack-sm" role="list" aria-label="Headline suggestions">
          <span className="subtle">{result.source === 'ai' ? 'AI + on-device suggestions' : 'On-device suggestions'} — click to use</span>
          {result.headlines.map((h) => (
            <button key={h} type="button" role="listitem" className="suggestion" onClick={() => use(h)} aria-pressed={h === current}>
              <span>{h}</span>
              <span className="subtle">{h.length}</span>
            </button>
          ))}
          {result.ctas.length > 0 && (
            <>
              <span className="subtle">Call-to-action ideas</span>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                {result.ctas.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    className="filter-chip"
                    onClick={() => {
                      const kit = useLibrary.getState().activeKit();
                      const cta = newTextLayer(project.doc, 'cta', kit.headingFont, kit.bodyFont);
                      ed.addLayers([{ ...cta, text: c }]);
                    }}
                  >
                    + {c}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <Field label="Headline on the Pin">
        <input
          className="input"
          value={pinHeadline}
          placeholder="Type headline directly on canvas..."
          onChange={(e) => {
            const val = e.target.value;
            setPinHeadline(val);
            if (val.trim()) {
              ed.setDoc(applyHeadline(ed.project!.doc, val.trim()));
              ed.updateMeta({ headline: val.trim() });
            }
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </Field>
    </div>
  );
}

export function TextPanel() {
  const project = useEditor((s) => s.project!);
  const selection = useEditor((s) => s.selection);
  const kit = useLibrary((s) => s.activeKit());
  const ed = useEditor.getState();
  const doc = project.doc;
  const [footerStyle, setFooterStyle] = useState<FooterStyle>('dark-pill');
  const [footerPanel, setFooterPanel] = useState(false);
  const [footerSep, setFooterSep] = useState(false);
  const [bandDividers, setBandDividers] = useState(false);
  const selectedText = doc.layers.filter((l): l is TextLayer => l.type === 'text' && selection.includes(l.id));

  const add = (kind: TextKind) => ed.addLayers([newTextLayer(doc, kind, kit.headingFont, kit.bodyFont)]);
  const applyStyle = (id: string) => {
    const preset = TEXT_STYLES.find((t) => t.id === id)!;
    if (selectedText.length) ed.updateLayers(selectedText.map((t) => t.id), (l) => ({ ...l, ...preset.patch(l as TextLayer) } as TextLayer));
    else {
      const t = newTextLayer(doc, 'heading', kit.headingFont, kit.bodyFont);
      ed.addLayers([{ ...t, ...preset.patch(t) }]);
    }
  };

  return (
    <div>
      <div className="panel-head">
        <h2>Text</h2>
      </div>
      <HeadlineAssistant />

      <div className="panel-section">
        <span className="section-title">Add text</span>
        <button className="text-preset" onClick={() => add('heading')} style={{ fontFamily: kit.headingFont, fontWeight: 800, fontSize: 22 }}>
          Add a heading
        </button>
        <button className="text-preset" onClick={() => add('subheading')} style={{ fontWeight: 600, letterSpacing: 2, fontSize: 13, textTransform: 'uppercase' }}>
          Add a subheading
        </button>
        <button className="text-preset" onClick={() => add('body')} style={{ fontSize: 13 }}>
          Add body text
        </button>
        <div className="grid-2">
          <button className="btn btn-sm" onClick={() => add('cta')}>
            + Call to action
          </button>
          <button className="btn btn-sm" onClick={() => add('custom')}>
            + Custom text
          </button>
        </div>
      </div>

      <div className="panel-section">
        <span className="section-title">Typography compositions</span>
        {(
          [
            ['script-bold', 'Script + bold caps', 'Stunning / BALCONY DECOR IDEAS'],
            ['stacked-blocks', 'Stacked editorial blocks', 'LOB / HAIRCUT / IDEAS'],
            ['number-keyword', 'Number + keyword', '32 / MINIMALIST BALCONY…'],
          ] as [CompositionId, string, string][]
        ).map(([id, label, sample]) => (
          <button key={id} className="text-preset" onClick={() => ed.addLayers(newComposition(doc, id))}>
            <strong style={{ fontSize: 13 }}>{label}</strong>
            <br />
            <span className="subtle">{sample}</span>
          </button>
        ))}
      </div>

      <div className="panel-section">
        <span className="section-title">Text styles {selectedText.length ? '(applies to selection)' : '(adds new text)'}</span>
        <div className="grid-2">
          {TEXT_STYLES.map((t) => (
            <button key={t.id} className="text-preset" onClick={() => applyStyle(t.id)} title={t.label} style={{ padding: 8, overflow: 'hidden' }}>
              <span style={{ ...t.css, display: 'inline-block', whiteSpace: 'nowrap', fontSize: Math.min(Number(t.css.fontSize ?? 15), 18) }}>{t.sample}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <span className="section-title">Number badge</span>
        <div className="grid-2">
          {(
            [
              ['circle', 'Circle'],
              ['rounded', 'Rounded square'],
              ['square', 'Square'],
              ['pill', 'Pill'],
            ] as [BadgeShape, string][]
          ).map(([shape, label]) => (
            <button key={shape} className="btn btn-sm" onClick={() => ed.addLayers([newBadge(doc, shape, '25', kit.primary)])}>
              <span
                aria-hidden
                style={{
                  width: shape === 'pill' ? 26 : 16,
                  height: 16,
                  background: '#111',
                  borderRadius: shape === 'circle' || shape === 'pill' ? 999 : shape === 'rounded' ? 4 : 0,
                  display: 'inline-block',
                }}
              />
              {label}
            </button>
          ))}
        </div>
        <span className="subtle">Select a badge to edit its number, colors, border, shadow, size and position.</span>
      </div>

      <div className="panel-section">
        <span className="section-title">Center text band</span>
        <div className="grid-3">
          {(
            [
              ['white', 'White', '#fff'],
              ['cream', 'Cream', '#F3EBDD'],
              ['color', 'Color', '#C7797D'],
              ['dark', 'Dark', '#111'],
              ['split', 'Split', 'linear-gradient(#fff 50%, #111 50%)'],
            ] as [BandStyle, string, string][]
          ).map(([style, label, bg]) => (
            <button
              key={style}
              className="btn btn-sm"
              onClick={() => ed.setDoc(addCenterBand(doc, style, bandDividers, readHeadline(doc) || 'Your Pin Headline', kit.accent))}
            >
              <span aria-hidden style={{ width: 14, height: 14, background: bg, border: '1px solid #ccc', borderRadius: 3 }} />
              {label}
            </button>
          ))}
        </div>
        <Toggle label="Add divider lines" checked={bandDividers} onChange={setBandDividers} />
        <span className="subtle">On “2 top + band + 2/3 bottom” layouts the image rows move apart to open the band.</span>
      </div>

      <div className="panel-section">
        <span className="section-title">Website footer</span>
        <select className="select input-sm" value={footerStyle} onChange={(e) => setFooterStyle(e.target.value as FooterStyle)} aria-label="Footer style">
          {FOOTER_STYLES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <Toggle label="Light panel behind footer" checked={footerPanel} onChange={setFooterPanel} />
        <Toggle label="Separator line" checked={footerSep} onChange={setFooterSep} />
        <button
          className="btn btn-dark btn-sm"
          onClick={() => {
            const existing = doc.layers.filter((l) => l.role === 'website').map((l) => l.id);
            if (existing.length) ed.removeLayers(existing);
            ed.addLayers(newFooter(useEditor.getState().project!.doc, footerStyle, kit.website, footerPanel, footerSep));
          }}
        >
          Add website footer
        </button>
        <span className="subtle">Uses {kit.website || 'your Brand Kit website'}. Replaces any existing footer.</span>
      </div>
    </div>
  );
}
