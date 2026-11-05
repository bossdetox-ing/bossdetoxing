import type { CSSProperties } from 'react';

// Drawn as a mask so each theme sets the logo's exact colour (--color-logo).
export function BrandLogo({ index }: { index: number }) {
  const src = `/avatars/${String(index + 1).padStart(2, '0')}.svg`;
  return (
    <span
      className="brand-avatar"
      aria-hidden="true"
      style={{ '--logo': `url(${src})` } as CSSProperties}
    />
  );
}
