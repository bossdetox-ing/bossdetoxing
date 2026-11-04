import type { LiveStyle } from '../domain/custom-threats';

// WordArt for words the user types: a gradient face over an extruded shadow layer, in CSS,
// so any text renders instantly in one of the gallery styles.
export function LiveWordArt({ text, style }: { text: string; style: LiveStyle }) {
  return (
    <span
      className={`live-wordart wa-${style}`}
      data-len={text.length <= 8 ? 's' : text.length <= 14 ? 'm' : 'l'}
      data-text={text}
      aria-hidden="true"
    >
      <span className="wa-face">{text}</span>
    </span>
  );
}
