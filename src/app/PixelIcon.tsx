import {
  Calendar,
  EyeOff,
  Star,
  ArrowLeft,
  Repeat,
  Copy,
  Home,
  Potion,
  Compass,
  Sliders,
  ArrowRight,
  CircleInfo,
  Close,
  Share,
  Check,
  Plus,
  BookOpen,
  ExternalLink,
  Eye,
} from 'pixelarticons/react';
const icons = {
  calendar: Calendar,
  blank: EyeOff,
  star: Star,
  back: ArrowLeft,
  reroll: Repeat,
  copy: Copy,
  home: Home,
  tools: Potion,
  explore: Compass,
  settings: Sliders,
  next: ArrowRight,
  info: CircleInfo,
  close: Close,
  share: Share,
  check: Check,
  plus: Plus,
  bestiary: BookOpen,
  external: ExternalLink,
  show: Eye,
  hide: EyeOff,
};
export function Icon({ name }: { name: keyof typeof icons }) {
  const Glyph = icons[name];
  return <Glyph className="ui-icon" aria-hidden="true" focusable="false" />;
}
// The favourite star once saved: the same pixel outline with a yellow-filled body.
export function FilledStar() {
  return (
    <svg className="ui-icon filled-star" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        className="star-body"
        d="M11 3H13V7H21V11H19V13H17V16H19V20H16V18H14V16H10V18H8V20H5V16H7V13H5V11H3V7H11Z"
      />
      <path
        className="star-outline"
        d="M5 20H8V22H3V16H5V20ZM21 22H16V20H19V16H21V22ZM10 20H8V18H10V20ZM16 20H14V18H16V20ZM14 18H10V16H14V18ZM7 16H5V13H7V16ZM19 16H17V13H19V16ZM5 13H3V11H5V13ZM21 13H19V11H21V13ZM9 9H3V11H1V7H9V9ZM23 11H21V9H15V7H23V11ZM11 7H9V3H11V7ZM15 7H13V3H15V7ZM13 3H11V1H13V3Z"
      />
    </svg>
  );
}
