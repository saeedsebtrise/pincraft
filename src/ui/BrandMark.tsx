/** PinCraft logo mark: a premium gradient badge with stylized Pin canvas layout. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="brand-logo-mark">
      <defs>
        <linearGradient id="pc-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E60023" />
          <stop offset="50%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
        <linearGradient id="pc-pin" x1="11" y1="7" x2="29" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFF1F2" />
        </linearGradient>
        <filter id="pc-shadow" x="0" y="0" width="40" height="40" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#E60023" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#pc-bg)" filter="url(#pc-shadow)" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="11.5" stroke="rgba(255,255,255,0.25)" />
      {/* Pin Card Artboard */}
      <rect x="10" y="7" width="20" height="26" rx="3.5" fill="url(#pc-pin)" />
      {/* Top 2 Image Frames */}
      <rect x="12.5" y="9.5" width="7" height="8" rx="1.5" fill="#FFE4E6" />
      <rect x="20.5" y="9.5" width="7" height="8" rx="1.5" fill="#FFE4E6" />
      {/* Bold Headline Bar */}
      <rect x="12.5" y="19" width="15" height="3.5" rx="1.2" fill="#E11D48" />
      {/* Subtitle / Footer Bars */}
      <rect x="12.5" y="24" width="11" height="2.2" rx="1" fill="#FDA4AF" />
      <rect x="12.5" y="27.5" width="15" height="2.5" rx="1" fill="#F43F5E" />
    </svg>
  );
}

