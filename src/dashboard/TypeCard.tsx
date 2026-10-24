import { Plus } from 'lucide-react';
import type { DesignTypeDef } from '../config/designTypes';
import { findTemplate } from '../store/projectActions';
import { useTemplateThumb } from '../templates/useThumb';
import { BUILTIN_TEMPLATES } from '../templates/builtins';
import { TYPE_PREVIEW_TEMPLATE } from './typePreviews';

/** Design-type card with a rendered example of that type. */
export function TypeCard({ def, selected, onPick, onOpen, compact }: { def: DesignTypeDef; selected?: boolean; onPick: () => void; onOpen?: () => void; compact?: boolean }) {
  const t = findTemplate(TYPE_PREVIEW_TEMPLATE[def.id]) ?? BUILTIN_TEMPLATES[0];
  const src = useTemplateThumb(t, 240);
  const blank = def.id === 'blank';
  return (
    <button
      type="button"
      className={`type-card2 ${compact ? 'compact' : ''}`}
      role="radio"
      aria-checked={!!selected}
      onClick={onPick}
      onDoubleClick={onOpen}
      title={def.hint}
    >
      <span className="type-card2-img">
        {blank ? <Plus size={30} /> : src ? <img src={src} alt="" /> : null}
      </span>
      <span className="type-card2-label">{def.label}</span>
      {!compact && <span className="subtle">{def.hint}</span>}
    </button>
  );
}
