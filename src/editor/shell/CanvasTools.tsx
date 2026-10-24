import { ArrowDown, ArrowUp, BadgeCheck, Copy, Image as ImageIcon, Lock, Minus, MousePointer2, Square, Trash2, Type, Unlock } from 'lucide-react';
import { useEditor } from '../../store/editorStore';
import { useLibrary } from '../../store/libraryStore';
import { useUi } from '../../store/uiStore';
import { newBadge, newFrame, newShape, newTextLayer } from '../blocks';

/** Vertical tool strip beside the canvas. Every tool adds a real, editable layer. */
export function ToolStrip() {
  const doc = useEditor((s) => s.project!.doc);
  const mode = useUi((s) => (s.cropId ? 'crop' : s.swapSourceId ? 'swap' : 'select'));
  const kit = useLibrary((s) => s.activeKit());
  const ed = useEditor.getState();
  const tools = [
    { label: 'Frame', icon: <ImageIcon size={20} />, run: () => ed.addLayers([newFrame(doc)]) },
    { label: 'Text', icon: <Type size={20} />, run: () => ed.addLayers([newTextLayer(doc, 'heading', kit.headingFont, kit.bodyFont)]) },
    { label: 'Shape', icon: <Square size={20} />, run: () => ed.addLayers([newShape(doc, 'rounded')]) },
    { label: 'Line', icon: <Minus size={20} />, run: () => ed.addLayers([newShape(doc, 'line')]) },
    { label: 'Badge', icon: <BadgeCheck size={20} />, run: () => ed.addLayers([newBadge(doc, 'circle', '25', kit.accent)]) },
  ];
  return (
    <div className="tool-strip" role="toolbar" aria-label="Add to canvas" aria-orientation="vertical">
      <button
        type="button"
        className="tool"
        aria-pressed={mode === 'select'}
        onClick={() => useUi.getState().set({ cropId: null, swapSourceId: null, editingTextId: null })}
      >
        <MousePointer2 size={20} />
        Select
      </button>
      {tools.map((t) => (
        <button key={t.label} type="button" className="tool" onClick={t.run} aria-label={`Add ${t.label.toLowerCase()}`}>
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Quick actions for the current selection, floating beside the canvas. */
export function CanvasActions() {
  const selection = useEditor((s) => s.selection);
  const doc = useEditor((s) => s.project!.doc);
  const layers = doc.layers.filter((l) => selection.includes(l.id));
  const ed = useEditor.getState();
  const none = selection.length === 0;
  const allLocked = layers.length > 0 && layers.every((l) => l.locked);
  const single = selection.length === 1 ? selection[0] : null;
  return (
    <div className="canvas-actions" role="toolbar" aria-label="Selection actions" aria-orientation="vertical">
      <button type="button" className="icon-btn" aria-label="Duplicate" data-tip="Duplicate" data-tip-pos="left" disabled={none} onClick={() => ed.duplicate(selection)}>
        <Copy size={18} />
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label="Delete"
        data-tip="Delete"
        data-tip-pos="left"
        disabled={none || allLocked}
        onClick={() => ed.removeLayers(layers.filter((l) => !l.locked).map((l) => l.id))}
      >
        <Trash2 size={18} />
      </button>
      <button type="button" className="icon-btn" aria-label="Bring forward" data-tip="Bring forward" data-tip-pos="left" disabled={!single} onClick={() => single && ed.reorder(single, 'forward')}>
        <ArrowUp size={18} />
      </button>
      <button type="button" className="icon-btn" aria-label="Send backward" data-tip="Send backward" data-tip-pos="left" disabled={!single} onClick={() => single && ed.reorder(single, 'backward')}>
        <ArrowDown size={18} />
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label={allLocked ? 'Unlock' : 'Lock'}
        data-tip={allLocked ? 'Unlock' : 'Lock'}
        data-tip-pos="left"
        aria-pressed={allLocked}
        disabled={none}
        onClick={() => ed.updateLayers(selection, (l) => ({ ...l, locked: !allLocked }))}
      >
        {allLocked ? <Unlock size={18} /> : <Lock size={18} />}
      </button>
    </div>
  );
}
