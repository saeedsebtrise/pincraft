import { Copy, Eye, Heart, ImagePlus, Pencil, RotateCcw, Search, Sparkles, Trash2 } from 'lucide-react';
import { matchesQuery } from '../templates/search';
import { useMemo, useState } from 'react';
import { simplifyRatio } from '../config/canvasPresets';
import { DESIGN_TYPES, TEMPLATE_FAMILIES, templateDesignTypes, type DesignType, type TemplateFamilyId } from '../config/designTypes';
import type { Template, TemplateCategory } from '../model/types';
import { useLibrary } from '../store/libraryStore';
import { keepOnlyFavorites, useIsFavorite } from '../store/favorites';
import { FavoriteButton, TasteNote } from '../templates/FavoriteButton';
import { allTemplates } from '../store/projectActions';
import { useUi } from '../store/uiStore';
import { useLazyTemplateThumb } from '../templates/useThumb';
import { IconButton, Modal } from '../ui/controls';
import { CATEGORY_FILTERS } from '../editor/panels/TemplatesPanel';
import { ReferenceTemplateModal } from './ReferenceTemplateModal';

export function TemplateCard({ t, onUse, selected, compact }: { t: Template; onUse: (t: Template) => void; selected?: boolean; compact?: boolean }) {
  const [thumbRef, src] = useLazyTemplateThumb(t, 300);
  const [preview, setPreview] = useState(false);
  const lib = useLibrary();
  const fav = useIsFavorite(t.id);
  return (
    <div className="tpl-card card" style={{ borderColor: selected ? 'var(--text)' : undefined, boxShadow: selected ? '0 0 0 1px var(--text)' : undefined }}>
      <div className="tpl-thumb" ref={thumbRef}>
        {src ? <img src={src} alt={`${t.name} template preview`} /> : null}
        <FavoriteButton t={t} on={fav} />
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
            {t.source === 'builtin' && (
              <IconButton
                label="Remove from my library"
                onClick={() => {
                  if (!confirm(`Remove “${t.name}” from your templates and Auto Design? You can bring it back with “Restore removed templates”.`)) return;
                  lib.hideTemplate(t.id);
                  useUi.getState().toast(`Removed “${t.name}”`, 'success');
                }}
              >
                <Trash2 size={14} />
              </IconButton>
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
export function TemplateGallery({ onUse, initialType = 'all', initialQuery = '', compact, selectedId }: { onUse: (t: Template) => void; initialType?: DesignType | 'all'; initialQuery?: string; compact?: boolean; selectedId?: string }) {
  useLibrary((s) => s.userTemplates);
  const hidden = useLibrary((s) => s.hiddenTemplateIds); // re-render when templates are removed or restored
  const favIds = useLibrary((s) => s.favoriteTemplateIds);
  const [favOnly, setFavOnly] = useState(false);
  const [fromImage, setFromImage] = useState(false);
  const [type, setType] = useState<DesignType | 'all'>(initialType);
  const [cat, setCat] = useState<TemplateCategory | 'all'>('all');
  const [query, setQuery] = useState(initialQuery);
  // A named collection (e.g. "Luxe Hair Collection") shown on its own.
  const [coll, setColl] = useState<string | null>(null);
  const templates = allTemplates();
  const collectionNames = [...new Set(templates.map((t) => t.collection).filter((c): c is string => !!c))];
  const filtered = useMemo(
    () => templates.filter((t) => (type === 'all' || templateDesignTypes(t).includes(type)) && (cat === 'all' || t.categories.includes(cat)) && (!favOnly || favIds.includes(t.id)) && (!coll || t.collection === coll) && matchesQuery(t, query)),
    [templates, type, cat, query, favOnly, favIds, coll],
  );
  const families = ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as TemplateFamilyId[]).map((f) => ({ f, list: filtered.filter((t) => t.family === f && t.source === 'builtin' && !t.collection) }));
  const collections = collectionNames.map((name) => ({ name, list: filtered.filter((t) => t.collection === name) })).filter((c) => c.list.length);
  const mine = filtered.filter((t) => t.source === 'user');
  const favorites = favIds.map((id) => filtered.find((t) => t.id === id)).filter((t): t is Template => !!t);
  const counts = (d: DesignType) => templates.filter((t) => templateDesignTypes(t).includes(d)).length;

  return (
    <div className="gallery">
      <nav className="gallery-side" aria-label="Design types">
        <button type="button" aria-pressed={type === 'all' && !favOnly && !coll} onClick={() => { setType('all'); setFavOnly(false); setColl(null); }}>
          All designs <span>{templates.length}</span>
        </button>
        <button type="button" aria-pressed={favOnly} onClick={() => setFavOnly((v) => !v)}>
          <span className="row" style={{ gap: 6 }}><Heart size={14} fill={favOnly ? 'currentColor' : 'none'} /> Favorites</span> <span>{templates.filter((t) => favIds.includes(t.id)).length}</span>
        </button>
        {collectionNames.map((name) => (
          <button key={name} type="button" aria-pressed={coll === name} onClick={() => setColl((c) => (c === name ? null : name))}>
            <span className="row" style={{ gap: 6 }}><Sparkles size={14} /> {name}</span> <span>{templates.filter((t) => t.collection === name).length}</span>
          </button>
        ))}
        {DESIGN_TYPES.map((d) => (
          <button key={d.id} type="button" aria-pressed={type === d.id} onClick={() => setType(d.id)}>
            {d.label} <span>{counts(d.id)}</span>
          </button>
        ))}
      </nav>
      <div className="stack">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-pink btn-sm" onClick={() => setFromImage(true)}>
            <ImagePlus size={15} /> Create template from a Pin image
          </button>
          {favIds.length > 0 && templates.some((t) => t.source === 'builtin' && !favIds.includes(t.id)) && (
            <button
              className="btn btn-sm"
              onClick={() => {
                const others = templates.filter((t) => t.source === 'builtin' && !favIds.includes(t.id)).length;
                if (!confirm(`Keep only your ${favIds.length} favorite template${favIds.length === 1 ? '' : 's'}?

${others} other templates will be removed from the gallery and Auto Design. Your own saved templates stay. You can bring them all back any time with “Restore removed templates”.`)) return;
                const n = keepOnlyFavorites();
                setFavOnly(false);
                useUi.getState().toast(`Kept your favorites — ${n} other templates removed. “Restore removed templates” brings them back.`, 'success');
              }}
            >
              <Heart size={14} fill="currentColor" style={{ color: '#e60023' }} /> Keep only my Favorites
            </button>
          )}
          {hidden.length > 0 && (
            <button className="btn btn-sm" onClick={() => useLibrary.getState().restoreHiddenTemplates()}>
              <RotateCcw size={14} /> Restore removed templates ({hidden.length})
            </button>
          )}
        </div>
        {fromImage && (
          <ReferenceTemplateModal
            onClose={() => setFromImage(false)}
            onUse={(t) => {
              setFromImage(false);
              onUse(t);
            }}
          />
        )}
        <label className="search-box">
          <Search size={17} />
          <input placeholder="Search templates…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search templates" />
        </label>
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
        {filtered.length === 0 && <p className="muted">{favOnly ? 'No favorites yet — tap the heart on any design you like.' : 'No templates match. Try another design type or category.'}</p>}
        {!favOnly && collections.map(({ name, list }) => (
          <section key={name}>
            <div className="family-title">
              <h3>
                <Sparkles size={16} style={{ verticalAlign: -2 }} /> {name}
              </h3>
              <span className="subtle">Exact recreations of top-performing Pins — every box stays in place, just swap the photos and words.</span>
            </div>
            <div className="tpl-grid">
              {list.map((t) => (
                <TemplateCard key={`coll-${t.id}`} t={t} onUse={onUse} compact={compact} selected={selectedId === t.id} />
              ))}
            </div>
          </section>
        ))}
        {(favorites.length > 0 || favOnly) && (
          <section>
            <div className="family-title">
              <h3>
                <Heart size={16} fill="currentColor" style={{ color: 'var(--pink, #e60023)', verticalAlign: -2 }} /> Your Favorites
              </h3>
              <TasteNote />
            </div>
            <div className="tpl-grid">
              {favorites.map((t) => (
                <TemplateCard key={`fav-${t.id}`} t={t} onUse={onUse} compact={compact} selected={selectedId === t.id} />
              ))}
            </div>
          </section>
        )}
        {favorites.length === 0 && !favOnly && <TasteNote />}
        {mine.length > 0 && !favOnly && (
          <section>
            <div className="family-title">
              <h3>My Templates</h3>
              <span className="subtle">Designs you saved or made from a Pin image</span>
            </div>
            <div className="tpl-grid">
              {mine.map((t) => (
                <TemplateCard key={t.id} t={t} onUse={onUse} compact={compact} selected={selectedId === t.id} />
              ))}
            </div>
          </section>
        )}
        {!favOnly && !coll && families
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
