import { Heart } from 'lucide-react';
import type { Template } from '../model/types';
import { toggleFavorite, useTasteSummary } from '../store/favorites';

/** Heart in a thumbnail's corner: always shown when on, on hover otherwise. */
export function FavoriteButton({ t, on }: { t: Template; on: boolean }) {
  return (
    <button
      type="button"
      className="tpl-fav"
      data-on={on}
      aria-pressed={on}
      aria-label={on ? `Remove ${t.name} from Favorites` : `Add ${t.name} to Favorites`}
      title={on ? 'In your Favorites — Auto Design leads with this style' : 'Add to Favorites — Auto Design learns your style'}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(t);
      }}
    >
      <Heart size={15} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

/** What Auto Design has learned from the favorites, in one line. */
export function TasteNote() {
  const { count, likes } = useTasteSummary();
  if (!count) return <span className="subtle">Heart the designs you like — Auto Design learns your style and shows similar Pins first.</span>;
  return (
    <span className="subtle">
      Auto Design learned from {count} favorite{count === 1 ? '' : 's'}
      {likes.length ? `: you like ${likes.join(', ')}` : ''}. Similar designs now come first.
    </span>
  );
}
