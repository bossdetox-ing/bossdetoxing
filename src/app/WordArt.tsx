import { defaultLocale } from '../content';

// Pre-rendered per locale by scripts/wordart.mjs (pain ids and scenario ids); the tile's
// accessible name carries the words.
export function WordArt({ style }: { style: string }) {
  return (
    <span className="pain-wordart" data-wordart={style}>
      <img src={`/wordart/${defaultLocale}/${style}.svg`} alt="" />
    </span>
  );
}
