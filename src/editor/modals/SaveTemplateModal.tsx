import { useState } from 'react';
import type { TemplateCategory } from '../../model/types';
import { useEditor } from '../../store/editorStore';
import { useLibrary } from '../../store/libraryStore';
import { useUi } from '../../store/uiStore';
import { Field, Modal } from '../../ui/controls';
import { CATEGORY_FILTERS } from '../panels/TemplatesPanel';

export function SaveTemplateModal() {
  const project = useEditor((s) => s.project!);
  const [name, setName] = useState(project.name);
  const [cats, setCats] = useState<TemplateCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const close = () => useUi.getState().set({ modal: null });
  const toggle = (c: TemplateCategory) => setCats((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  return (
    <Modal
      title="Save as template"
      onClose={close}
      footer={
        <>
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button
            className="btn btn-dark"
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await useLibrary.getState().saveTemplate(name, project.doc, cats);
                useUi.getState().toast(`Saved “${name}” to My Templates`, 'success');
                close();
              } catch {
                useUi.getState().toast("Couldn't save the template.", 'error');
                setBusy(false);
              }
            }}
          >
            Save template
          </button>
        </>
      }
    >
      <div className="stack">
        <p className="muted">Layout, typography, colors, bands, badges and spacing are saved. Your photos are not — frames become empty slots to fill next time.</p>
        <Field label="Template name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <span className="field-label">Categories (helps you find it later)</span>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {CATEGORY_FILTERS.filter((c) => c !== 'My Templates').map((c) => (
            <button key={c} type="button" className="filter-chip" aria-pressed={cats.includes(c)} onClick={() => toggle(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
