import { ChevronLeft, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
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
import { matchesQuery } from '../../templates/search';
import { useTemplateThumb } from '../../templates/useThumb';
import { IconButton } from '../../ui/controls';

export const CATEGORY_FILTERS: TemplateCategory[] = [
  'Hair', 'Beauty', 'Home Decor', 'Balcony', 'Patio', 'Living Room', 'Fall Decor', 'Fashion', 'Lifestyle',
  'Relationship', 'Quote', 'Listicle', 'Food / Recipe', 'How-To', 'Custom Blog Pin', 'My Templates',
];

/** Thumbnail tile; inside the editor it previews the template with the project's own photos. */
export function MiniTemplate({ t, onPick, note }: { t: Template; onPick: (t: Template) => void; note?: string }) {
  const src = useTemplateThumb(t, 220, true);
  return (
    <button type="button" className="tpl-tile" onClick={() => onPick(t)} title={`${t.name} — ${t.description}`} aria-label={`Apply template ${t.name}`}>
      {src ? <img src={src} alt="" /> : <span className="tpl-tile-blank" />}
      <span className="tpl-tile-name">{note ?? t.name}</span>
    </button>
  );
}

export function TemplatesPanel({ onClose }: { onClose?: () => void }) {
  const project = useEditor((s) => s.project!);
  useLibrary((s) => s.userTemplates); // re-render when user templates change
  useLibrary((s) => s.hiddenTemplateIds); // …or built-ins are removed / restored
  const [query, setQuery] = useState('');
  const [type, setType] = useState<DesignType | 'all'>('all');
  const [cat, setCat] = useState<TemplateCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const templates = allTemplates();

  const filtered = useMemo(
    () =>
      templates.filter(
        (t) =>
          (type === 'all' || templateDesignTypes(t).includes(type)) &&
          (cat === 'all' || t.categories.includes(cat)) &&
          matchesQuery(t, query),
      ),
    [templates, type, cat, query],
  );
  const recs = useMemo(
    () => recommendTemplates(project.meta.articleTitle || project.meta.headline, templates, { presetId: project.doc.presetId, imageCount: project.assetIds.length, limit: 3 }),
    [project.meta.articleTitle, project.meta.headline, templates, project.doc.presetId, project.assetIds.length],
  );
  const filtering = type !== 'all' || cat !== 'all' || !!query.trim();

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
        {onClose && (
          <IconButton label="Collapse panel" onClick={onClose}>
            <ChevronLeft size={18} />
          </IconButton>
        )}
      </div>
      <div className="panel-section panel-section-tight">
        <div className="search-row">
          <label className="search-box">
            <Search size={17} />
            <input placeholder="Search templates…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search templates" />
          </label>
          <IconButton label="Filter by design type" pressed={showFilters || type !== 'all'} onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal size={18} />
          </IconButton>
        </div>
        {showFilters && (
          <select className="select" aria-label="Design type" value={type} onChange={(e) => setType(e.target.value as DesignType | 'all')}>
            <option value="all">All design types</option>
            {DESIGN_TYPES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        )}
        <div className="pill-row" role="group" aria-label="Category">
          <button type="button" className="pill" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
            All
          </button>
          {CATEGORY_FILTERS.map((c) => (
            <button key={c} type="button" className="pill" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {recs.length > 0 && !filtering && (
        <div className="panel-section panel-section-tight">
          <span className="section-title row">
            <Sparkles size={13} /> Recommended for your title
          </span>
          <div className="tpl-tiles">
            {recs.map((r) => (
              <MiniTemplate key={r.template.id} t={r.template} onPick={apply} />
            ))}
          </div>
        </div>
      )}
      <div className="panel-section panel-section-tight">
        <span className="section-title">
          {filtered.length} template{filtered.length === 1 ? '' : 's'} · switching keeps your images & headline
        </span>
        {filtered.length === 0 && <span className="subtle">No templates match. Try another search or category.</span>}
        <div className="tpl-tiles">
          {filtered.map((t) => (
            <MiniTemplate key={t.id} t={t} onPick={apply} />
          ))}
        </div>
      </div>
    </div>
  );
}
