import {
  Calendar,
  EyeOff,
  Star,
  ArrowLeft,
  Repeat,
  Copy,
  Home,
  BookOpen,
  Compass,
  Sliders,
  ArrowRight,
} from 'pixelarticons/react';
const icons = {
  calendar: Calendar,
  blank: EyeOff,
  star: Star,
  back: ArrowLeft,
  reroll: Repeat,
  copy: Copy,
  home: Home,
  tools: BookOpen,
  explore: Compass,
  settings: Sliders,
  next: ArrowRight,
};
export function Icon({ name }: { name: keyof typeof icons }) {
  const Glyph = icons[name];
  return <Glyph className="ui-icon" aria-hidden="true" focusable="false" />;
}
