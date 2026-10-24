/** PinCraft logo mark: a pink tile with a stylised Pin layout (not Pinterest's logo). */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" rx="11" fill="#EE4B7F" />
      <rect x="11" y="8" width="18" height="24" rx="3" fill="#fff" />
      <rect x="14" y="11" width="5.5" height="7" rx="1.2" fill="#F7A9C1" />
      <rect x="20.5" y="11" width="5.5" height="7" rx="1.2" fill="#F7A9C1" />
      <rect x="14" y="20" width="12" height="3" rx="1" fill="#EE4B7F" />
      <rect x="14" y="25" width="12" height="4" rx="1.2" fill="#F7A9C1" />
    </svg>
  );
}
