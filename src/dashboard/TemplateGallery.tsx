import { Copy, Eye, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { simplifyRatio } from '../config/canvasPresets';
import { DESIGN_TYPES, TEMPLATE_FAMILIES, templateDesignTypes, type DesignType, type TemplateFamilyId } from '../config/designTypes';
import type { Template, TemplateCategory } from '../model/types';
import { useLibrary } from '../store/libraryStore';
import { allTemplates } from '../store/projectActions';
import { useUi } from '../store/uiStore';
import { useTemplateThumb } from '../templates/useThumb';
import { IconButton, Modal } from '../ui/controls';
import { CATEGORY_FILTERS } from '../editor/panels/TemplatesPanel';

export function TemplateCard({ t, onUse, selected, compact }: { t: Template; onUse: (t: Template) => void; selected?: boolean; compact?: boolean }) {
  const src = useTemplateThumb(t, 300);
  const [preview, setPreview] = useState(false);
  const lib = useLibrary();
  return (
    <div className="tpl-card card" style={{ borderColor: selected ? 'var(--text)' : undefined, boxShadow: selected ? '0 0 0 1px var(--text)' : undefined }}>
      <div className="tpl-thumb">
        {src ? <img src={src} alt={`${t.name} template preview`} /> : null}
        <div className="tpl-actions">
          <button className="btn btn-primary btn-sm grow" onClick={() => onUse(t)}>
            Use template
          </button>
          <IconButton label="Preview" onClick={() => setPreview(true)}>
            <Eye size={15} />
          </IconButton>
        </div>
      </div>
      <div className="tpl-info">
        <strong>{t.name}</strong>
        <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
          <span className="chip">
            {t.imageCount} image{t.imageCount === 1 ? '' : 's'}
          </span>
          <span className="chip">{simplifyRatio(t.doc.width, t.doc.height)}</span>
          {!compact && t.categories.slice(0, 2).map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </div>
        {!compact && (
          <div className="row" style={{ gap: 0 }}>
            <IconButton
              label="Duplicate to My Templates"
              onClick={async () => {
                await lib.duplicateTemplate(t);
                useUi.getState().toast(`Duplicated “${t.name}” to My Templates`, 'success');
              }}
            >
              <Copy size={14} />
            </IconButton>
            {t.source === 'user' && (
              <>
                <IconButton
                  label="Rename"
                  onClick={() => {
                    const n = prompt('Template name', t.name);
                    if (n?.trim()) lib.renameTemplate(t.id, n.trim());
                  }}
                >
                  <Pencil size={14} />
                </IconButton>
                <IconButton label="Delete" onClick={() => confirm(`Delete “${t.name}”?`) && lib.deleteTemplate(t.id)}>
                  <Trash2 size={14} />
                </IconButton>
              </>
            )}
          </div>
        )}
      </div>
      {preview && (
        <Modal
          title={t.name}
          onClose={() => setPreview(false)}
          footer={
            <button className="btn btn-primary" onClick={() => onUse(t)}>
              Use template
            </button>
          }
        >
          <div className="row" style={{ alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            {src && <img src={src} alt="" style={{ width: 240, boxShadow: 'var(--canvas-shadow)' }} />}
            <div className="stack grow" style={{ minWidth: 200 }}>
              <p className="muted">{t.description}</p>
              <span className="subtle">Family: {TEMPLATE_FAMILIES[t.family].name}</span>
              <span className="subtle">
                Native size {t.doc.width}×{t.doc.height} — adapts to any Pin size
              </span>
              <span className="subtle">Design types: {templateDesignTypes(t).map((d) => DESIGN_TYPES.find((x) => x.id === d)?.label).join(', ')}</span>
              <span className="subtle">Categories: {t.categories.join(', ') || '—'}</span>
              <span className="subtle">Every element stays fully editable after you pick it.</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Gallery: design type → template family sections → cards, with category filters. */
export function TemplateGallery({ onUse, initialType = 'all', compact, selectedId }: { onUse: (t: Template) => void; initialType?: DesignType | 'all'; compact?: boolean; selectedId?: string }) {
  useLibrary((s) => s.userTemplates);
  const [type, setType] = useState<DesignType | 'all'>(initialType);
  const [cat, setCat] = useState<TemplateCategory | 'all'>('all');
  const templates = allTemplates();
  const filtered = useMemo(
    () => templates.filter((t) => (type === 'all' || templateDesignTypes(t).includes(type)) && (cat === 'all' || t.categories.includes(cat))),
    [templates, type, cat],
  );
  const families = ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as TemplateFamilyId[]).map((f) => ({ f, list: filtered.filter((t) => t.family === f && t.source === 'builtin') }));
  const mine = filtered.filter((t) => t.source === 'user');
  const counts = (d: DesignType) => templates.filter((t) => templateDesignTypes(t).includes(d)).length;

  return (
    <div className="gallery">
      <nav className="gallery-side" aria-label="Design types">
        <button type="button" aria-pressed={type === 'all'} onClick={() => setType('all')}>
          All designs <span>{templates.length}</span>
        </button>
        {DESIGN_TYPES.map((d) => (
          <button key={d.id} type="button" aria-pressed={type === d.id} onClick={() => setType(d.id)}>
            {d.label} <span>{counts(d.id)}</span>
          </button>
        ))}
      </nav>
      <div className="stack">
        <div className="row" style={{ flexWrap: 'wrap' }} role="group" aria-label="Category">
          <button type="button" className="filter-chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
            All categories
          </button>
          {CATEGORY_FILTERS.map((c) => (
            <button key={c} type="button" className="filter-chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        {filtered.length === 0 && <p className="muted">No templates match. Try another design type or category.</p>}
        {mine.length > 0 && (
          <section>
            <div className="family-title">
              <h3>My Templates</h3>
              <span className="subtle">Designs you saved</span>
            </div>
            <div className="tpl-grid">
              {mine.map((t) => (
                <TemplateCard key={t.id} t={t} onUse={onUse} compact={compact} selected={selectedId === t.id} />
              ))}
            </div>
          </section>
        )}
        {families
          .filter((x) => x.list.length)
          .map(({ f, list }) => (
            <section key={f}>
              <div className="family-title">
                <h3>
                  {f}. {TEMPLATE_FAMILIES[f].name}
                </h3>
                <span className="subtle">{TEMPLATE_FAMILIES[f].summary}</span>
              </div>
              <div className="tpl-grid">
                {list.map((t) => (
                  <TemplateCard key={t.id} t={t} onUse={onUse} compact={compact} selected={selectedId === t.id} />
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
