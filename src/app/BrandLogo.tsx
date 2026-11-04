export function BrandLogo({ index }: { index: number }) {
  return (
    <img
      className="brand-avatar"
      src={`/avatars/${String(index + 1).padStart(2, '0')}.svg`}
      alt=""
    />
  );
}
