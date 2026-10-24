/**
 * Konva renderers for each layer type. Used by the interactive editor AND by
 * export/thumbnail/preview rendering, so what you see is what you export.
 */
import Konva from 'konva';
import { useLayoutEffect, useRef } from 'react';
import { Ellipse, Group, Image as KImage, Rect, Text } from 'react-konva';
import { placeImage } from '../../model/geometry';
import type { Background, FrameLayer, Id, Layer, PinDocument, ShapeLayer, TextLayer } from '../../model/types';
import type { DrawableImage } from '../../store/assetStore';
import { konvaFontStyle, layoutText } from './textLayout';

export interface ImageSource {
  image: DrawableImage;
  /** Natural (original) size — geometry never depends on the preview resolution. */
  width: number;
  height: number;
}
export type ImageMap = Record<Id, ImageSource | undefined>;

export type RenderMode = 'edit' | 'render';

type KFilter = (this: Konva.Node, imageData: ImageData) => void;

// Warm/cool shift, applied per pixel (Konva has no built-in temperature filter).
function Warmth(this: Konva.Node, imageData: ImageData) {
  const amount = (this.getAttr('warmth') as number) * 40;
  if (!amount) return;
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] += amount;
    d[i + 2] -= amount;
  }
}

function useImageFilters(node: React.RefObject<Konva.Image>, layer: FrameLayer, src: ImageSource | undefined, w: number, h: number) {
  const a = layer.adjust;
  const active = a.brightness !== 0 || a.contrast !== 0 || a.saturation !== 0 || a.warmth !== 0 || a.blur > 0 || a.grayscale;
  useLayoutEffect(() => {
    const n = node.current;
    if (!n) return;
    if (!active || !src) {
      n.clearCache();
      n.filters([]);
      return;
    }
    const filters: KFilter[] = [];
    if (a.brightness) filters.push(Konva.Filters.Brighten);
    if (a.contrast) filters.push(Konva.Filters.Contrast);
    if (a.saturation) filters.push(Konva.Filters.HSL);
    if (a.warmth) filters.push(Warmth);
    if (a.blur > 0) filters.push(Konva.Filters.Blur);
    if (a.grayscale) filters.push(Konva.Filters.Grayscale);
    n.setAttrs({ brightness: a.brightness, contrast: a.contrast, saturation: a.saturation, warmth: a.warmth, blurRadius: a.blur });
    n.filters(filters);
    n.cache({ pixelRatio: 1 });
    n.getLayer()?.batchDraw();
  }, [active, src, w, h, a.brightness, a.contrast, a.saturation, a.warmth, a.blur, a.grayscale, node]);
}

interface FrameProps {
  layer: FrameLayer;
  src?: ImageSource;
  mode: RenderMode;
  draggable?: boolean;
  cropping?: boolean;
  swapHover?: boolean;
  onCropMove?: (fx: number, fy: number) => void;
}

export function FrameNode({ layer, src, mode, draggable, cropping, swapHover, onCropMove }: FrameProps) {
  const imgRef = useRef<Konva.Image>(null);
  const { width: w, height: h, cornerRadius: r } = layer;
  const p = src ? placeImage(layer, src.width, src.height) : null;
  useImageFilters(imgRef, layer, src, p?.width ?? 0, p?.height ?? 0);

  const imgProps = p && {
    image: src!.image as CanvasImageSource,
    x: layer.flipX ? p.x + p.width : p.x,
    y: layer.flipY ? p.y + p.height : p.y,
    width: p.width,
    height: p.height,
    scaleX: layer.flipX ? -1 : 1,
    scaleY: layer.flipY ? -1 : 1,
  };
  const sw = layer.strokeWidth;

  return (
    <Group id={layer.id} name="layer-node" x={layer.x} y={layer.y} rotation={layer.rotation} opacity={layer.opacity} draggable={draggable && !cropping}>
      {cropping && imgProps && (
        <KImage
          {...imgProps}
          name="crop-image"
          opacity={0.35}
          draggable
          onDragMove={(e) => {
            const n = e.target;
            const left = layer.flipX ? n.x() - p!.width : n.x();
            const top = layer.flipY ? n.y() - p!.height : n.y();
            const cx = Math.min(0, Math.max(w - p!.width, left));
            const cy = Math.min(0, Math.max(h - p!.height, top));
            n.position({ x: layer.flipX ? cx + p!.width : cx, y: layer.flipY ? cy + p!.height : cy });
            onCropMove?.((w / 2 - cx) / p!.width, (h / 2 - cy) / p!.height);
          }}
        />
      )}
      <Group
        clipFunc={(ctx) => {
          const rr = Math.min(r, w / 2, h / 2);
          ctx.beginPath();
          if (rr > 0) {
            ctx.moveTo(rr, 0);
            ctx.arcTo(w, 0, w, h, rr);
            ctx.arcTo(w, h, 0, h, rr);
            ctx.arcTo(0, h, 0, 0, rr);
            ctx.arcTo(0, 0, w, 0, rr);
          } else {
            ctx.rect(0, 0, w, h);
          }
          ctx.closePath();
        }}
      >
        <Rect width={w} height={h} fill={layer.placeholderFill} />
        {imgProps && <KImage ref={imgRef} {...imgProps} listening={!cropping} />}
        {!src && mode === 'edit' && (
          <Text
            width={w}
            height={h}
            align="center"
            verticalAlign="middle"
            text={layer.assetId ? 'Image missing\nReplace it' : `Drop image here${layer.slot !== null ? `\nSlot ${layer.slot + 1}` : ''}`}
            fontFamily="Inter"
            fontSize={Math.max(12, Math.min(w, h) * 0.07)}
            fill="#8A847C"
            listening={false}
          />
        )}
      </Group>
      {sw > 0 && (
        <Rect x={sw / 2} y={sw / 2} width={Math.max(0, w - sw)} height={Math.max(0, h - sw)} cornerRadius={Math.max(0, r - sw / 2)} stroke={layer.stroke} strokeWidth={sw} listening={false} />
      )}
      {swapHover && <Rect width={w} height={h} stroke="#E60023" strokeWidth={6} dash={[16, 10]} listening={false} />}
    </Group>
  );
}

interface TextProps {
  layer: TextLayer;
  mode: RenderMode;
  draggable?: boolean;
  editing?: boolean;
}

export function TextNode({ layer, mode, draggable, editing }: TextProps) {
  const lay = layoutText(layer);
  const bg = layer.background;
  const empty = !layer.text.trim();
  return (
    <Group id={layer.id} name="layer-node" x={layer.x} y={layer.y} rotation={layer.rotation} opacity={layer.opacity} draggable={draggable}>
      <Rect width={layer.width} height={layer.height} fill="rgba(0,0,0,0)" />
      {lay.bg && bg.shape === 'circle' && (
        <Ellipse
          x={lay.bg.x + lay.bg.width / 2}
          y={lay.bg.y + lay.bg.height / 2}
          radiusX={lay.bg.width / 2}
          radiusY={lay.bg.height / 2}
          fill={bg.color}
          opacity={bg.opacity}
          stroke={bg.borderColor}
          strokeWidth={bg.borderWidth}
          strokeEnabled={bg.borderWidth > 0}
          listening={false}
        />
      )}
      {lay.bg && bg.shape !== 'circle' && (
        <Rect
          {...lay.bg}
          cornerRadius={bg.shape === 'pill' ? lay.bg.height / 2 : Math.min(bg.radius, lay.bg.height / 2, lay.bg.width / 2)}
          fill={bg.color}
          opacity={bg.opacity}
          stroke={bg.borderColor}
          strokeWidth={bg.borderWidth}
          strokeEnabled={bg.borderWidth > 0}
          listening={false}
        />
      )}
      {!empty && (
        <Text
          x={lay.innerX}
          y={lay.textY}
          width={lay.innerW}
          text={lay.text}
          fontSize={lay.fontSize}
          fontFamily={layer.fontFamily}
          fontStyle={konvaFontStyle(layer)}
          textDecoration={layer.underline ? 'underline' : ''}
          align={layer.align}
          lineHeight={layer.lineHeight}
          letterSpacing={layer.letterSpacing}
          fill={layer.fill}
          stroke={layer.stroke}
          strokeWidth={layer.strokeWidth}
          strokeEnabled={layer.strokeWidth > 0}
          fillAfterStrokeEnabled
          shadowEnabled={layer.shadow.enabled}
          shadowColor={layer.shadow.color}
          shadowBlur={layer.shadow.blur}
          shadowOffsetX={layer.shadow.offsetX}
          shadowOffsetY={layer.shadow.offsetY}
          shadowOpacity={layer.shadow.opacity}
          wrap="word"
          opacity={editing ? 0 : 1}
          listening={false}
        />
      )}
      {empty && mode === 'edit' && (
        <Rect width={layer.width} height={layer.height} stroke="#9A948C" strokeWidth={2} dash={[8, 6]} strokeScaleEnabled={false} listening={false} />
      )}
      {lay.overflow && mode === 'edit' && (
        <Rect width={layer.width} height={layer.height} stroke="#D92D20" strokeWidth={2} dash={[4, 4]} strokeScaleEnabled={false} listening={false} />
      )}
    </Group>
  );
}

export function ShapeNode({ layer, draggable }: { layer: ShapeLayer; draggable?: boolean }) {
  const common = {
    fill: layer.fill,
    stroke: layer.stroke,
    strokeWidth: layer.strokeWidth,
    strokeEnabled: layer.strokeWidth > 0,
  };
  return (
    <Group id={layer.id} name="layer-node" x={layer.x} y={layer.y} rotation={layer.rotation} opacity={layer.opacity} draggable={draggable}>
      {layer.shape === 'ellipse' ? (
        <Ellipse x={layer.width / 2} y={layer.height / 2} radiusX={layer.width / 2} radiusY={layer.height / 2} {...common} />
      ) : (
        <Rect width={layer.width} height={layer.height} cornerRadius={Math.min(layer.cornerRadius, layer.width / 2, layer.height / 2)} {...common} />
      )}
    </Group>
  );
}

export function BackgroundNode({ bg, width, height, images }: { bg: Background; width: number; height: number; images: ImageMap }) {
  if (bg.type === 'transparent') return <Rect name="background" width={width} height={height} fill="rgba(0,0,0,0)" />;
  if (bg.type === 'gradient') {
    const a = (bg.gradientAngle * Math.PI) / 180;
    const dx = (Math.cos(a) * width) / 2;
    const dy = (Math.sin(a) * height) / 2;
    return (
      <Rect
        name="background"
        width={width}
        height={height}
        fillLinearGradientStartPoint={{ x: width / 2 - dx, y: height / 2 - dy }}
        fillLinearGradientEndPoint={{ x: width / 2 + dx, y: height / 2 + dy }}
        fillLinearGradientColorStops={[0, bg.gradientFrom, 1, bg.gradientTo]}
      />
    );
  }
  const src = bg.type === 'image' && bg.assetId ? images[bg.assetId] : undefined;
  if (src) {
    const p = placeImage({ width, height, crop: { zoom: 1, fx: 0.5, fy: 0.5 }, fit: 'cover' }, src.width, src.height);
    return (
      <Group name="background">
        <Rect width={width} height={height} fill={bg.color} />
        <KImage image={src.image as CanvasImageSource} x={p.x} y={p.y} width={p.width} height={p.height} listening={false} />
      </Group>
    );
  }
  return <Rect name="background" width={width} height={height} fill={bg.color} />;
}

export interface DocLayersProps {
  doc: PinDocument;
  images: ImageMap;
  mode: RenderMode;
  hidden?: Set<Id>;
  editingTextId?: Id | null;
  cropId?: Id | null;
  swapHoverId?: Id | null;
  onCropMove?: (id: Id, fx: number, fy: number) => void;
}

export function DocLayers({ doc, images, mode, hidden, editingTextId, cropId, swapHoverId, onCropMove }: DocLayersProps) {
  return (
    <>
      <BackgroundNode bg={doc.background} width={doc.width} height={doc.height} images={images} />
      {doc.layers.map((l: Layer) => {
        if (!l.visible || hidden?.has(l.id)) return null;
        const draggable = mode === 'edit' && !l.locked;
        if (l.type === 'frame') {
          return (
            <FrameNode
              key={l.id}
              layer={l}
              src={l.assetId ? images[l.assetId] : undefined}
              mode={mode}
              draggable={draggable}
              cropping={cropId === l.id}
              swapHover={swapHoverId === l.id}
              onCropMove={onCropMove ? (fx, fy) => onCropMove(l.id, fx, fy) : undefined}
            />
          );
        }
        if (l.type === 'text') return <TextNode key={l.id} layer={l} mode={mode} draggable={draggable} editing={editingTextId === l.id} />;
        return <ShapeNode key={l.id} layer={l} draggable={draggable} />;
      })}
    </>
  );
}
