import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline } from 'lucide-react';
import { getFont } from '../../config/fonts';
import { documentColors } from '../../model/docOps';
import type { ShapeLayer, TextLayer } from '../../model/types';
import { useEditor } from '../../store/editorStore';
import { useLibrary } from '../../store/libraryStore';
import { useUi } from '../../store/uiStore';
import { ColorField, NumberField, RangeField, Seg, Select, Toggle } from '../../ui/controls';
import { badgePosition, type BadgePosition } from '../blocks';
import { layoutText } from '../canvas/textLayout';
import { fontOptions } from '../panels/MiscPanels';

const WEIGHT_LABEL: Record<number, string> = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' };

function useColorSources() {
  const kit = useLibrary((s) => s.activeKit());
  const doc = useEditor((s) => s.project!.doc);
  return { brandColors: [kit.primary, kit.secondary, kit.accent], docColors: documentColors(doc) };
}

export function TextProps({ layer }: { layer: TextLayer }) {
  const ed = useEditor.getState();
  const doc = useEditor((s) => s.project!.doc);
  useUi((s) => s.fontsVersion);
  const colors = useColorSources();
  const set = (p: Partial<TextLayer>, key?: string) => ed.updateLayer<TextLayer>(layer.id, p, key);
  const bg = layer.background;
  const setBg = (p: Partial<TextLayer['background']>, key?: string) => set({ background: { ...bg, ...p } }, key);
  const sh = layer.shadow;
  const setSh = (p: Partial<TextLayer['shadow']>, key?: string) => set({ shadow: { ...sh, ...p } }, key);
  const lay = layoutText(layer);
  const weights = getFont(layer.fontFamily)?.weights ?? [400, 700];
  const isBadge = layer.role === 'badge';

  return (
    <>
      <div className="panel-section">
        {isBadge ? (
          <>
            <span className="section-title">Badge</span>
            <div className="grid-2">
              <label className="field">
                <span className="field-label">Number</span>
                <input className="input" value={layer.text} onChange={(e) => set({ text: e.target.value }, 'text-' + layer.id)} />
              </label>
              <NumberField
                label="Size"
                value={Math.round(layer.height)}
                min={40}
                onChange={(v) => {
                  const k = v / layer.height;
                  set({ width: layer.width * k, height: v, fontSize: layer.fontSize * k, background: { ...bg, paddingX: bg.paddingX * k, paddingY: bg.paddingY * k, radius: bg.radius * k } });
                }}
                unit="px"
              />
            </div>
            <Seg
              label="Badge shape"
              value={bg.shape === 'rect' ? (bg.radius > 0 ? 'rounded' : 'square') : bg.shape}
              onChange={(v) => {
                const pill = v === 'pill';
                const width = pill ? layer.height * 1.6 : layer.height;
                set({
                  width,
                  x: layer.x - (width - layer.width) / 2,
                  background: { ...bg, enabled: true, shape: v === 'circle' ? 'circle' : pill ? 'pill' : 'rect', radius: v === 'rounded' ? layer.height * 0.18 : 0 },
                });
              }}
              options={[
                { value: 'circle', label: 'Circle', title: 'Circle' },
                { value: 'rounded', label: 'Rounded', title: 'Rounded square' },
                { value: 'square', label: 'Square', title: 'Square' },
                { value: 'pill', label: 'Pill', title: 'Pill' },
              ]}
            />
            <span className="field-label">Position</span>
            <div className="grid-2">
              {(
                [
                  ['top-left', 'Top left'],
                  ['center-top', 'Center top'],
                  ['over-band', 'Over text band'],
                  ['over-image', 'Over image'],
                ] as [BadgePosition, string][]
              ).map(([pos, label]) => (
                <button key={pos} className="btn btn-sm" onClick={() => set(badgePosition(doc, layer, pos))}>
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <label className="field">
            <span className="field-label">Text</span>
            <textarea className="textarea" rows={3} value={layer.text} onChange={(e) => set({ text: e.target.value }, 'text-' + layer.id)} />
          </label>
        )}
        {lay.overflow && <span className="chip chip-warn">Text overflows its box — enlarge the box or shorten the text</span>}
        {layer.autoFit && lay.fontSize < layer.fontSize && !lay.overflow && <span className="subtle">Auto-fit: showing at {lay.fontSize}px</span>}
      </div>

      <div className="panel-section">
        <span className="section-title">Typography</span>
        <Select label="Font" value={layer.fontFamily} onChange={(v) => set({ fontFamily: v })} options={fontOptions} />
        <div className="grid-2">
          <Select label="Weight" value={String(weights.includes(layer.fontWeight) ? layer.fontWeight : weights[0])} onChange={(v) => set({ fontWeight: Number(v) })} options={weights.map((w) => ({ value: String(w), label: WEIGHT_LABEL[w] ?? String(w) }))} />
          <NumberField label={layer.autoFit ? 'Max size' : 'Size'} value={layer.fontSize} min={6} max={600} onChange={(v) => set({ fontSize: v })} unit="px" />
        </div>
        <div className="row">
          <button className="icon-btn" aria-label="Bold" data-tip="Bold" aria-pressed={layer.fontWeight >= 700} onClick={() => set({ fontWeight: layer.fontWeight >= 700 ? 400 : Math.max(...weights.filter((w) => w >= 700), weights[weights.length - 1]) })}>
            <Bold size={15} />
          </button>
          <button className="icon-btn" aria-label="Italic" data-tip="Italic" aria-pressed={layer.italic} onClick={() => set({ italic: !layer.italic })}>
            <Italic size={15} />
          </button>
          <button className="icon-btn" aria-label="Underline" data-tip="Underline" aria-pressed={layer.underline} onClick={() => set({ underline: !layer.underline })}>
            <Underline size={15} />
          </button>
          <span className="tb-sep" />
          <Seg
            label="Alignment"
            value={layer.align}
            onChange={(align) => set({ align })}
            options={[
              { value: 'left', label: <AlignLeft size={14} />, title: 'Align left' },
              { value: 'center', label: <AlignCenter size={14} />, title: 'Align center' },
              { value: 'right', label: <AlignRight size={14} />, title: 'Align right' },
            ]}
          />
        </div>
        <ColorField label="Text color" value={layer.fill} onChange={(v) => set({ fill: v }, 'fill-' + layer.id)} {...colors} />
        <Seg
          label="Text transform"
          value={layer.textTransform}
          onChange={(textTransform) => set({ textTransform })}
          options={[
            { value: 'none', label: 'Aa', title: 'As typed' },
            { value: 'uppercase', label: 'AA', title: 'Uppercase' },
            { value: 'lowercase', label: 'aa', title: 'Lowercase' },
            { value: 'capitalize', label: 'Ab', title: 'Capitalize' },
          ]}
        />
        <Seg
          label="Vertical alignment"
          value={layer.verticalAlign}
          onChange={(verticalAlign) => set({ verticalAlign })}
          options={[
            { value: 'top', label: 'Top', title: 'Align top' },
            { value: 'middle', label: 'Middle', title: 'Align middle' },
            { value: 'bottom', label: 'Bottom', title: 'Align bottom' },
          ]}
        />
        <RangeField label="Line height" min={0.7} max={2.2} step={0.01} value={layer.lineHeight} onChange={(v) => set({ lineHeight: v }, 'lh-' + layer.id)} />
        <RangeField label="Letter spacing" min={-5} max={40} step={0.5} value={layer.letterSpacing} onChange={(v) => set({ letterSpacing: v }, 'ls-' + layer.id)} format={(v) => `${v}px`} />
        <Toggle label="Auto-fit text to box" checked={layer.autoFit} onChange={(v) => set({ autoFit: v })} />
        {layer.autoFit && <NumberField label="Minimum readable size" value={layer.minFontSize} min={6} max={layer.fontSize} onChange={(v) => set({ minFontSize: v })} unit="px" />}
      </div>

      <div className="panel-section">
        <Toggle label="Text background block" checked={bg.enabled} onChange={(v) => setBg({ enabled: v })} />
        {bg.enabled && (
          <>
            {!isBadge && (
              <Seg
                label="Block shape"
                value={bg.shape}
                onChange={(shape) => setBg({ shape })}
                options={[
                  { value: 'rect', label: 'Box', title: 'Rectangle' },
                  { value: 'pill', label: 'Pill', title: 'Pill' },
                  { value: 'circle', label: 'Circle', title: 'Circle' },
                ]}
              />
            )}
            <div className="grid-2">
              <button className="btn btn-sm" onClick={() => set({ fill: '#111111', background: { ...bg, color: '#FFFFFF', opacity: 1 } })}>
                White box
              </button>
              <button className="btn btn-sm" onClick={() => set({ fill: '#FFFFFF', background: { ...bg, color: '#111111', opacity: 1 } })}>
                Black box
              </button>
            </div>
            <ColorField label="Block color" value={bg.color} onChange={(v) => setBg({ color: v }, 'bgc-' + layer.id)} {...colors} />
            <RangeField label="Block opacity" min={0} max={1} step={0.01} value={bg.opacity} onChange={(v) => setBg({ opacity: v }, 'bgo-' + layer.id)} format={(v) => `${Math.round(v * 100)}%`} />
            <div className="grid-2">
              <NumberField label="Padding X" value={bg.paddingX} min={0} onChange={(v) => setBg({ paddingX: v })} unit="px" />
              <NumberField label="Padding Y" value={bg.paddingY} min={0} onChange={(v) => setBg({ paddingY: v })} unit="px" />
              {bg.shape === 'rect' && <NumberField label="Corner radius" value={bg.radius} min={0} onChange={(v) => setBg({ radius: v })} unit="px" />}
              <NumberField label="Border" value={bg.borderWidth} min={0} max={40} onChange={(v) => setBg({ borderWidth: v })} unit="px" />
            </div>
            {bg.borderWidth > 0 && <ColorField label="Border color" value={bg.borderColor} onChange={(v) => setBg({ borderColor: v }, 'bgb-' + layer.id)} {...colors} />}
            {!isBadge && <Toggle label="Block hugs text" checked={bg.hug} onChange={(v) => setBg({ hug: v })} />}
          </>
        )}
      </div>

      <div className="panel-section">
        <Toggle label="Shadow" checked={sh.enabled} onChange={(v) => setSh({ enabled: v })} />
        {sh.enabled && (
          <>
            <ColorField label="Shadow color" value={sh.color} onChange={(v) => setSh({ color: v }, 'shc')} />
            <RangeField label="Blur" min={0} max={60} value={sh.blur} onChange={(v) => setSh({ blur: v }, 'shb')} />
            <RangeField label="Offset Y" min={-30} max={30} value={sh.offsetY} onChange={(v) => setSh({ offsetY: v }, 'shy')} />
            <RangeField label="Opacity" min={0} max={1} step={0.01} value={sh.opacity} onChange={(v) => setSh({ opacity: v }, 'sho')} format={(v) => `${Math.round(v * 100)}%`} />
          </>
        )}
        <Toggle label="Outline / stroke" checked={layer.strokeWidth > 0} onChange={(v) => set({ strokeWidth: v ? Math.max(2, layer.fontSize * 0.04) : 0 })} />
        {layer.strokeWidth > 0 && (
          <>
            <RangeField label="Stroke width" min={0.5} max={20} step={0.5} value={layer.strokeWidth} onChange={(v) => set({ strokeWidth: v }, 'stw')} />
            <ColorField label="Stroke color" value={layer.stroke} onChange={(v) => set({ stroke: v }, 'stc')} {...colors} />
          </>
        )}
      </div>
    </>
  );
}

export function ShapeProps({ layer }: { layer: ShapeLayer }) {
  const colors = useColorSources();
  const set = (p: Partial<ShapeLayer>, key?: string) => useEditor.getState().updateLayer<ShapeLayer>(layer.id, p, key);
  return (
    <div className="panel-section">
      {layer.role === 'band' && <span className="subtle">Center text band — its size follows the collage band height (Layouts tab).</span>}
      <Seg
        label="Shape"
        value={layer.shape === 'ellipse' ? 'ellipse' : 'rect'}
        onChange={(shape) => set({ shape })}
        options={[
          { value: 'rect', label: 'Rectangle', title: 'Rectangle' },
          { value: 'ellipse', label: 'Ellipse', title: 'Ellipse' },
        ]}
      />
      <ColorField label="Fill" value={layer.fill} onChange={(v) => set({ fill: v }, 'sf-' + layer.id)} {...colors} />
      <RangeField label="Border" min={0} max={40} value={layer.strokeWidth} onChange={(v) => set({ strokeWidth: v }, 'ssw-' + layer.id)} format={(v) => `${v}px`} />
      {layer.strokeWidth > 0 && <ColorField label="Border color" value={layer.stroke} onChange={(v) => set({ stroke: v }, 'ssc-' + layer.id)} {...colors} />}
      {layer.shape !== 'ellipse' && (
        <RangeField label="Corner radius" min={0} max={Math.round(Math.min(layer.width, layer.height) / 2)} value={layer.cornerRadius} onChange={(v) => set({ cornerRadius: v }, 'scr-' + layer.id)} format={(v) => `${Math.round(v)}px`} />
      )}
    </div>
  );
}
