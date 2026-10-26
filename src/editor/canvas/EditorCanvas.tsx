/**
 * Interactive canvas: selection, multi-select (shift / marquee), drag with
 * smart guides & snapping, resize/rotate via Transformer, inline text editing,
 * crop mode, collage cell swapping and drag-and-drop of assets.
 */
import Konva from 'konva';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Layer as KLayer, Line, Rect, Stage, Transformer } from 'react-konva';
import { SAFE_AREA } from '../../config/colors';
import { cssFontFamily } from '../../config/fonts';
import { frames, swapFrameImages } from '../../model/docOps';
import { pointInRect, rectsIntersect } from '../../model/geometry';
import type { FrameLayer, Id, Layer, TextLayer } from '../../model/types';
import { useAssets } from '../../store/assetStore';
import { useEditor } from '../../store/editorStore';
import { useUi } from '../../store/uiStore';
import { newFrame } from '../blocks';
import { importAndPlace } from '../importImages';
import { DocLayers, type ImageMap } from './nodes';
import { layoutText } from './textLayout';

export const ASSET_MIME = 'application/x-pinforge-asset';
const SNAP_PX = 6;

interface Guide {
  points: number[];
}

function layerIdOf(target: Konva.Node): Id | null {
  if (target.hasName('layer-node')) return target.id();
  const anc = target.findAncestor('.layer-node', true);
  return anc ? anc.id() : null;
}

export function EditorCanvas() {
  const project = useEditor((s) => s.project)!;
  const doc = project.doc;
  const selection = useEditor((s) => s.selection);
  const { select, toggleSelect, updateLayers, updateLayer, setDoc } = useEditor.getState();
  const ui = useUi();
  const previews = useAssets((s) => s.previews);
  const metas = useAssets((s) => s.metas);

  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [viewport, setViewport] = useState({ w: 800, h: 600 });
  const [guides, setGuides] = useState<Guide[]>([]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [swapHoverId, setSwapHoverId] = useState<Id | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);

  // ---- fit-to-screen scale ----
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setViewport({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = Math.max(0.05, Math.min((viewport.w - 80) / doc.width, (viewport.h - 80) / doc.height));
  const scale = ui.zoom ?? fit;
  useEffect(() => {
    if (Math.abs(useUi.getState().effectiveZoom - scale) > 0.001) useUi.getState().set({ effectiveZoom: scale });
  }, [scale]);

  const images: ImageMap = useMemo(() => {
    const map: ImageMap = {};
    for (const id of Object.keys(previews)) {
      const m = metas[id];
      if (m) map[id] = { image: previews[id], width: m.width, height: m.height };
    }
    return map;
  }, [previews, metas]);

  const layerById = (id: Id) => doc.layers.find((l) => l.id === id);

  // ---- transformer attachment ----
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    const nodes = selection
      .map((id) => layerById(id))
      .filter((l): l is Layer => !!l && !l.locked && l.visible && ui.cropId !== l.id && ui.editingTextId !== l.id)
      .map((l) => stage.findOne('#' + l.id))
      .filter((n): n is Konva.Node => !!n);
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  });

  // ---- pointer helpers ----
  const pointer = () => {
    const p = stageRef.current?.getPointerPosition();
    return p ? { x: p.x / scale, y: p.y / scale } : null;
  };
  const frameAt = (x: number, y: number, exclude?: Id): FrameLayer | undefined =>
    [...doc.layers].reverse().find((l): l is FrameLayer => l.type === 'frame' && l.visible && l.id !== exclude && pointInRect(x, y, l));

  // ---- mouse ----
  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const target = e.target;
    if (target.hasName('crop-image')) return;
    if (target.getParent()?.className === 'Transformer') return;
    const id = layerIdOf(target);
    const shift = 'shiftKey' in e.evt && (e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey);

    if (ui.cropId && id !== ui.cropId) ui.set({ cropId: null });
    if (ui.editingTextId && id !== ui.editingTextId) ui.set({ editingTextId: null });

    if (ui.swapSourceId) {
      const l = id ? layerById(id) : undefined;
      if (l?.type === 'frame' && l.id !== ui.swapSourceId) {
        setDoc(swapFrameImages(doc, ui.swapSourceId, l.id));
        select([l.id]);
      }
      ui.set({ swapSourceId: null });
      return;
    }

    if (!id) {
      if (!shift) select([]);
      const p = pointer();
      if (p) {
        marqueeStart.current = p;
        setMarquee({ x: p.x, y: p.y, w: 0, h: 0 });
      }
      return;
    }
    if (shift) toggleSelect(id);
    else if (!selection.includes(id)) select([id]);
  };

  const onMouseMove = () => {
    if (!marqueeStart.current) return;
    const p = pointer();
    if (!p) return;
    const s = marqueeStart.current;
    setMarquee({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };

  const onMouseUp = () => {
    if (!marqueeStart.current) return;
    marqueeStart.current = null;
    if (marquee && marquee.w > 4 && marquee.h > 4) {
      const box = { x: marquee.x, y: marquee.y, width: marquee.w, height: marquee.h };
      const hit = doc.layers.filter((l) => l.visible && !l.locked && l.role !== 'band' && rectsIntersect(box, l)).map((l) => l.id);
      select([...new Set([...selection, ...hit])]);
    }
    setMarquee(null);
  };

  const onDblClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const id = layerIdOf(e.target);
    const l = id ? layerById(id) : undefined;
    if (!l || l.locked) return;
    if (l.type === 'text') {
      select([l.id]);
      ui.set({ editingTextId: l.id });
    } else if (l.type === 'frame' && l.assetId) {
      select([l.id]);
      ui.set({ cropId: l.id });
    }
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!ui.cropId) return;
    e.evt.preventDefault();
    const l = layerById(ui.cropId);
    if (l?.type !== 'frame') return;
    const zoom = Math.max(1, Math.min(5, l.crop.zoom * (e.evt.deltaY < 0 ? 1.06 : 1 / 1.06)));
    updateLayer<FrameLayer>(l.id, { crop: { ...l.crop, zoom } }, 'crop-zoom-' + l.id);
  };

  // ---- dragging & snapping ----
  const isCell = (l?: Layer) => l?.type === 'frame' && l.slot !== null;

  const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    if (!node.hasName('layer-node')) return;
    const l = layerById(node.id());
    if (!l) return;
    if (isCell(l)) {
      const p = pointer();
      setSwapHoverId(p ? frameAt(p.x, p.y, l.id)?.id ?? null : null);
      return;
    }
    if (selection.length > 1 || !ui.snapEnabled) return;
    const box = node.getClientRect({ relativeTo: stageRef.current! as unknown as Konva.Container });
    const targetsX = [0, doc.width / 2, doc.width];
    const targetsY = [0, doc.height / 2, doc.height];
    for (const o of doc.layers) {
      if (o.id === l.id || !o.visible) continue;
      targetsX.push(o.x, o.x + o.width / 2, o.x + o.width);
      targetsY.push(o.y, o.y + o.height / 2, o.y + o.height);
    }
    const thr = SNAP_PX / scale;
    const snap = (edges: number[], targets: number[]) => {
      let best: { d: number; t: number } | null = null;
      for (const e2 of edges) for (const t of targets) if (Math.abs(t - e2) < thr && (!best || Math.abs(t - e2) < Math.abs(best.d))) best = { d: t - e2, t };
      return best;
    };
    const sx = snap([box.x, box.x + box.width / 2, box.x + box.width], targetsX);
    const sy = snap([box.y, box.y + box.height / 2, box.y + box.height], targetsY);
    const g: Guide[] = [];
    if (sx) {
      node.x(node.x() + sx.d);
      g.push({ points: [sx.t, 0, sx.t, doc.height] });
    }
    if (sy) {
      node.y(node.y() + sy.d);
      g.push({ points: [0, sy.t, doc.width, sy.t] });
    }
    setGuides(g);
  };

  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    if (!node.hasName('layer-node')) return;
    setGuides([]);
    const l = layerById(node.id());
    if (!l) return;
    if (isCell(l)) {
      setSwapHoverId(null);
      const p = pointer();
      const target = p ? frameAt(p.x, p.y, l.id) : undefined;
      node.position({ x: l.x, y: l.y });
      if (target) {
        setDoc(swapFrameImages(doc, l.id, target.id));
        select([target.id]);
      }
      return;
    }
    const ids = new Set([...selection, l.id]);
    const stage = stageRef.current!;
    const pos = new Map<Id, { x: number; y: number }>();
    ids.forEach((id) => {
      const n = stage.findOne('#' + id);
      if (n) pos.set(id, { x: n.x(), y: n.y() });
    });
    updateLayers([...ids], (x) => (pos.has(x.id) ? { ...x, ...pos.get(x.id)! } : x));
  };

  // ---- transform ----
  const onTransformEnd = () => {
    const tr = trRef.current!;
    const anchor = tr.getActiveAnchor() ?? '';
    const corner = /top-left|top-right|bottom-left|bottom-right/.test(anchor);
    const updates = new Map<Id, Partial<Layer>>();
    for (const n of tr.nodes()) {
      const l = layerById(n.id());
      if (!l) continue;
      const sx = Math.abs(n.scaleX());
      const sy = Math.abs(n.scaleY());
      const patch: Partial<Layer> = {
        x: n.x(),
        y: n.y(),
        rotation: Math.round(n.rotation() * 100) / 100,
        width: Math.max(4, l.width * sx),
        height: Math.max(4, l.height * sy),
      };
      if (l.type === 'frame' && l.slot !== null && (sx !== 1 || sy !== 1 || n.rotation() !== l.rotation)) (patch as Partial<FrameLayer>).slot = null;
      if (l.type === 'text' && corner && sx !== 1) {
        const k = (sx + sy) / 2;
        const t = l as TextLayer;
        Object.assign(patch, {
          fontSize: t.fontSize * k,
          minFontSize: t.minFontSize * k,
          letterSpacing: t.letterSpacing * k,
          background: { ...t.background, paddingX: t.background.paddingX * k, paddingY: t.background.paddingY * k, radius: t.background.radius * k },
        });
      }
      n.scale({ x: 1, y: 1 });
      updates.set(l.id, patch);
    }
    updateLayers([...updates.keys()], (l) => ({ ...l, ...updates.get(l.id) } as Layer));
  };

  // ---- drag & drop from asset library / desktop ----
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    stageRef.current?.setPointersPositions(e.nativeEvent);
    const p = pointer();
    const assetId = e.dataTransfer.getData(ASSET_MIME);
    if (assetId) {
      const target = p ? frameAt(p.x, p.y) : undefined;
      if (target) {
        updateLayer<FrameLayer>(target.id, { assetId, crop: { zoom: 1, fx: 0.5, fy: 0.5 } });
        select([target.id]);
      } else {
        const empty = frames(doc).find((f) => !f.assetId);
        if (empty) {
          updateLayer<FrameLayer>(empty.id, { assetId, crop: { zoom: 1, fx: 0.5, fy: 0.5 } });
          select([empty.id]);
        } else {
          const m = useAssets.getState().metas[assetId];
          const f = { ...newFrame(doc, m?.width, m?.height, p ?? undefined), assetId };
          useEditor.getState().addLayers([f]);
        }
      }
      return;
    }
    if (e.dataTransfer.files.length) await importAndPlace([...e.dataTransfer.files], p);
  };

  // ---- inline text editor ----
  const editing = ui.editingTextId ? layerById(ui.editingTextId) : undefined;
  const editingText = editing?.type === 'text' ? editing : undefined;
  const lay = editingText ? layoutText(editingText) : null;

  const safe = {
    x: doc.width * SAFE_AREA.left,
    y: doc.height * SAFE_AREA.top,
    width: doc.width * (1 - SAFE_AREA.left - SAFE_AREA.right),
    height: doc.height * (1 - SAFE_AREA.top - SAFE_AREA.bottom),
  };
  const hint = ui.swapSourceId
    ? 'Click another image frame to swap images · Esc to cancel'
    : ui.cropId
      ? 'Drag to reposition · scroll to zoom · Enter or Esc when done'
      : null;


  return (
    <div
      className="workspace"
      ref={wrapRef}
      onDragOver={(e) => {
        if ([...e.dataTransfer.types].some((t) => t === ASSET_MIME || t === 'Files')) {
          e.preventDefault();
          setDropActive(true);
        }
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDropActive(false)}
      onDrop={onDrop}
    >
      {hint && <div className="canvas-hint">{hint}</div>}
      {dropActive && <div className="drop-overlay">Drop onto a frame to fill it, or anywhere to add</div>}
      <div className="workspace-inner">
        <div
          className={`stage-wrap ${doc.background.type === 'transparent' ? 'transparent-bg' : ''}`}
          style={{ width: doc.width * scale, height: doc.height * scale }}
          aria-label={`Pin canvas ${doc.width} by ${doc.height} pixels`}
          role="img"
        >
          <Stage
            ref={stageRef}
            width={doc.width * scale}
            height={doc.height * scale}
            scaleX={scale}
            scaleY={scale}
            onMouseDown={onMouseDown}
            onTouchStart={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onDblClick={onDblClick}
            onDblTap={onDblClick as never}
            onWheel={onWheel}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          >
            <KLayer>
              <DocLayers
                doc={doc}
                images={images}
                mode="edit"
                editingTextId={ui.editingTextId}
                cropId={ui.cropId}
                swapHoverId={swapHoverId}
                onCropMove={(id, fx, fy) => {
                  const l = layerById(id);
                  if (l?.type === 'frame') updateLayer<FrameLayer>(id, { crop: { ...l.crop, fx, fy } }, 'crop-move-' + id);
                }}
              />
            </KLayer>
            <KLayer listening={true}>
              {ui.showGrid &&
                gridLines(doc.width, doc.height).map((pts, i) => (
                  <Line key={`g${i}`} points={pts} stroke="#3B82F6" strokeWidth={1 / scale} opacity={0.22} listening={false} />
                ))}
              {ui.showSafeArea && (
                <Rect {...safe} stroke="#2F6FED" strokeWidth={1.5 / scale} dash={[8 / scale, 6 / scale]} opacity={0.7} listening={false} />
              )}
              {guides.map((g, i) => (
                <Line key={i} points={g.points} stroke="#E60023" strokeWidth={1 / scale} listening={false} />
              ))}
              {marquee && <Rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="rgba(47,111,237,.08)" stroke="#2F6FED" strokeWidth={1 / scale} listening={false} />}
              <Transformer
                ref={trRef}
                rotateEnabled
                rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                anchorSize={9}
                borderStroke="#2F6FED"
                anchorStroke="#2F6FED"
                anchorCornerRadius={2}
                ignoreStroke
                boundBoxFunc={(oldB, newB) => (Math.abs(newB.width) < 8 || Math.abs(newB.height) < 8 ? oldB : newB)}
                onTransformEnd={onTransformEnd}
              />
            </KLayer>
          </Stage>
          {editingText && lay && (
            <textarea
              className="text-editor-overlay"
              autoFocus
              aria-label="Edit text"
              value={editingText.text}
              onChange={(e) => updateLayer<TextLayer>(editingText.id, { text: e.target.value }, 'text-' + editingText.id)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) ui.set({ editingTextId: null });
                e.stopPropagation();
              }}
              onBlur={() => ui.set({ editingTextId: null })}
              style={{
                left: editingText.x * scale,
                top: editingText.y * scale,
                width: editingText.width * scale,
                height: editingText.height * scale,
                transform: `rotate(${editingText.rotation}deg)`,
                fontFamily: cssFontFamily(editingText.fontFamily),
                fontSize: lay.fontSize * scale,
                fontWeight: editingText.fontWeight,
                fontStyle: editingText.italic ? 'italic' : 'normal',
                lineHeight: editingText.lineHeight,
                letterSpacing: editingText.letterSpacing * scale,
                textAlign: editingText.align,
                textTransform: editingText.textTransform,
                color: '#111',
                paddingTop: lay.textY * scale,
                paddingLeft: lay.innerX * scale,
                paddingRight: lay.innerX * scale,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Layout grid: thirds plus a 10% subdivision, in canvas coordinates. */
function gridLines(w: number, h: number): number[][] {
  const lines: number[][] = [];
  for (let i = 1; i < 10; i++) {
    lines.push([(w * i) / 10, 0, (w * i) / 10, h]);
    lines.push([0, (h * i) / 10, w, (h * i) / 10]);
  }
  return lines;
}
