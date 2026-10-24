import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DESIGN_TYPES, templateDesignTypes, type DesignType } from '../../config/designTypes';
import { switchTemplate } from '../../model/docOps';
import type { Template, TemplateCategory } from '../../model/types';
import { recommendTemplates } from '../../services/recommend';
import { useAssets } from '../../store/assetStore';
import { useEditor } from '../../store/editorStore';
import { useLibrary } from '../../store/libraryStore';
import { allTemplates } from '../../store/projectActions';
import { useUi } from '../../store/uiStore';
import { useTemplateThumb } from '../../templates/useThumb';
import { Select } from '../../ui/controls';

export const CATEGORY_FILTERS: TemplateCategory[] = [
  'Hair', 'Beauty', 'Home Decor', 'Balcony', 'Patio', 'Living Room', 'Fall Decor', 'Fashion', 'Lifestyle',
  'Relationship', 'Quote', 'Listicle', 'Food / Recipe', 'How-To', 'Custom Blog Pin', 'My Templates',
];

export function MiniTemplate({ t, onPick, note }: { t: Template; onPick: (t: Template) => void; note?: string }) {
  const src = useTemplateThumb(t, 200);
  return (
    <button type="button" className="mini-tpl" onClick={() => onPick(t)} title={`${t.name} — ${t.description}`}>
      {src ? <img src={src} alt="" /> : <div style={{ aspectRatio: '2/3', background: 'var(--surface-3)' }} />}
      <span>
        {t.name}
        <br />
        <span className="subtle">{note ?? `${t.imageCount} image${t.imageCount === 1 ? '' : 's'}`}</span>
      </span>
    </button>
  );
}

export function TemplatesPanel() {
  const project = useEditor((s) => s.project!);
  useLibrary((s) => s.userTemplates); // re-render when user templates change
  const [type, setType] = useState<DesignType | 'all'>('all');
  const [cat, setCat] = useState<TemplateCategory | 'all'>('all');
  const templates = allTemplates();

  const filtered = useMemo(
    () =>
      templates.filter(
        (t) => (type === 'all' || templateDesignTypes(t).includes(type)) && (cat === 'all' || t.categories.includes(cat)),
      ),
    [templates, type, cat],
  );
  const recs = useMemo(
    () => recommendTemplates(project.meta.articleTitle || project.meta.headline, templates, { presetId: project.doc.presetId, imageCount: project.assetIds.length, limit: 4 }),
    [project.meta.articleTitle, project.meta.headline, templates, project.doc.presetId, project.assetIds.length],
  );

  const apply = (t: Template) => {
    const doc = switchTemplate(project.doc, t, project.assetIds, useAssets.getState().metas, null);
    useEditor.getState().setDoc(doc);
    useEditor.getState().updateMeta({ templateId: t.id });
    useEditor.getState().select([]);
    useUi.getState().toast(`Applied “${t.name}” — your images and headline were kept. Undo to go back.`, 'success');
  };

  return (
    <div>
      <div className="panel-head">
        <h2>Templates</h2>
      </div>
      <div className="panel-section">
        <Select
          label="Design type"
          value={type}
          onChange={setType}
          options={[{ value: 'all', label: 'All design types' }, ...DESIGN_TYPES.map((d) => ({ value: d.id, label: d.label }))]}
        />
        <Select label="Category" value={cat} onChange={setCat} options={[{ value: 'all', label: 'All categories' }, ...CATEGORY_FILTERS.map((c) => ({ value: c, label: c }))]} />
        <span className="subtle">Switching keeps your images, headline and website. Everything stays editable.</span>
      </div>
      {recs.length > 0 && type === 'all' && cat === 'all' && (
        <div className="panel-section">
          <span className="section-title row">
            <Sparkles size={13} /> Recommended for your title
          </span>
          <div className="mini-tpl-grid">
            {recs.map((r) => (
              <MiniTemplate key={r.template.id} t={r.template} onPick={apply} note={r.reasons[0]} />
            ))}
          </div>
        </div>
      )}
      <div className="panel-section">
        <span className="section-title">{filtered.length} templates</span>
        {filtered.length === 0 && <span className="subtle">No templates match these filters.</span>}
        <div className="mini-tpl-grid">
          {filtered.map((t) => (
            <MiniTemplate key={t.id} t={t} onPick={apply} />
          ))}
        </div>
      </div>
    </div>
  );
}
