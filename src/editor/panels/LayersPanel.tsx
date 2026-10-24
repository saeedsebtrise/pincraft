import { Copy, Eye, EyeOff, GripVertical, Image as ImageIcon, Lock, Shapes, Trash2, Type, Unlock } from 'lucide-react';
import { useState } from 'react';
import type { Layer } from '../../model/types';
import { useEditor } from '../../store/editorStore';
import { IconButton } from '../../ui/controls';

const ICON = { frame: <ImageIcon size={14} />, text: <Type size={14} />, shape: <Shapes size={14} /> };

export function LayersPanel() {
  const layers = useEditor((s) => s.project!.doc.layers);
  const selection = useEditor((s) => s.selection);
  const ed = useEditor.getState();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  // top of the list = front-most layer
  const list = [...layers].reverse();

  const patch = (l: Layer, p: Partial<Layer>) => ed.updateLayer(l.id, p);

  return (
    <div>
      <div className="panel-head">
        <h2>Layers</h2>
        <span className="subtle">{layers.length}</span>
      </div>
      <div className="panel-section" style={{ gap: 2 }}>
        {list.length === 0 && <span className="subtle">No layers yet. Add text, images or shapes.</span>}
        <div role="listbox" aria-label="Layers" aria-multiselectable="true">
          {list.map((l, i) => (
            <div
              key={l.id}
              role="option"
              aria-selected={selection.includes(l.id)}
              className={`layer-row ${dragId === l.id ? 'dragging' : ''} ${overIdx === i && dragId !== l.id ? 'drop-before' : ''}`}
              draggable
              tabIndex={0}
              onDragStart={() => setDragId(l.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIdx(i);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverIdx(null);
              }}
              onDrop={() => {
                if (dragId && overIdx !== null) {
                  // list index → stack index (list is reversed)
                  ed.moveLayer(dragId, layers.length - 1 - overIdx);
                }
                setDragId(null);
                setOverIdx(null);
              }}
              onClick={(e) => (e.shiftKey || e.metaKey || e.ctrlKey ? ed.toggleSelect(l.id) : ed.select([l.id]))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') ed.select([l.id]);
              }}
            >
              <GripVertical size={14} className="subtle" aria-hidden />
              <span className="subtle" aria-hidden>
                {ICON[l.type]}
              </span>
              <input
                className="layer-name"
                defaultValue={l.name}
                key={l.name}
                aria-label="Layer name"
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => e.target.value.trim() && e.target.value !== l.name && patch(l, { name: e.target.value.trim() })}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                style={{ opacity: l.visible ? 1 : 0.5 }}
              />
              <IconButton label={l.visible ? 'Hide layer' : 'Show layer'} onClick={() => patch(l, { visible: !l.visible })}>
                {l.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </IconButton>
              <IconButton label={l.locked ? 'Unlock layer' : 'Lock layer'} pressed={l.locked} onClick={() => patch(l, { locked: !l.locked })}>
                {l.locked ? <Lock size={14} /> : <Unlock size={14} />}
              </IconButton>
              <IconButton label="Duplicate layer" onClick={() => ed.duplicate([l.id])}>
                <Copy size={14} />
              </IconButton>
              <IconButton label="Delete layer" onClick={() => ed.removeLayers([l.id])}>
                <Trash2 size={14} />
              </IconButton>
            </div>
          ))}
        </div>
        <span className="subtle" style={{ marginTop: 8 }}>
          Drag rows to reorder. Top of the list is in front.
        </span>
      </div>
    </div>
  );
}
