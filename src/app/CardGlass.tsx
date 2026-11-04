// A glossy card surface: the card's own artwork, hugely blurred, under a frosted wash and sheen.
export function CardGlass({ src }: { src: string }) {
  return (
    <span className="card-glass" aria-hidden="true">
      <img src={src} alt="" />
    </span>
  );
}
