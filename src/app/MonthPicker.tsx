import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { messages as t } from '../content';
import { Icon } from './PixelIcon';

type Level = 'months' | 'years' | 'decades';
const monthName = new Intl.DateTimeFormat('en', { month: 'short' });

// The calendar title opens a drill-down picker: months of a year → years of a decade →
// decades of a century. The title climbs a level; the arrows step within it.
export function MonthPicker({
  value,
  label,
  onChange,
}: {
  value: Date;
  label: string;
  onChange: (month: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<Level>('months');
  const [year, setYear] = useState(value.getFullYear());
  const decade = Math.floor(year / 10) * 10;
  const century = Math.floor(year / 100) * 100;
  const step = { months: 1, years: 10, decades: 100 }[level];
  const heading = {
    months: String(year),
    years: `${decade}–${decade + 9}`,
    decades: `${century}–${century + 99}`,
  }[level];
  const cells =
    level === 'months'
      ? Array.from({ length: 12 }, (_, m) => ({
          key: m,
          text: monthName.format(new Date(2026, m, 1)),
          current: year === value.getFullYear() && m === value.getMonth(),
          pick: () => {
            onChange(new Date(year, m, 1));
            setOpen(false);
          },
        }))
      : level === 'years'
        ? Array.from({ length: 12 }, (_, i) => decade - 1 + i).map((y) => ({
            key: y,
            text: String(y),
            outside: y < decade || y > decade + 9,
            current: y === value.getFullYear(),
            pick: () => {
              setYear(y);
              setLevel('months');
            },
          }))
        : Array.from({ length: 12 }, (_, i) => century - 10 + i * 10).map((d) => ({
            key: d,
            text: `${d}s`,
            outside: d < century || d > century + 90,
            current: Math.floor(value.getFullYear() / 10) * 10 === d,
            pick: () => {
              setYear(d + (year % 10));
              setLevel('years');
            },
          }));
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setYear(value.getFullYear());
          setLevel('months');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button className="month-trigger" aria-label={`${label}. ${t.picker.open}`}>
          {label}
          <span className="select-chevron" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="month-picker" align="center" aria-label={t.picker.open}>
        <div className="month-picker-bar">
          <Button
            className="icon-button"
            aria-label={t.picker.previous}
            onClick={() => setYear(year - step)}
          >
            <Icon name="back" />
          </Button>
          <Button
            className="month-picker-up"
            disabled={level === 'decades'}
            aria-label={level === 'decades' ? heading : `${heading}. ${t.picker.up}`}
            onClick={() => setLevel(level === 'months' ? 'years' : 'decades')}
          >
            {heading}
          </Button>
          <Button
            className="icon-button"
            aria-label={t.picker.next}
            onClick={() => setYear(year + step)}
          >
            <Icon name="next" />
          </Button>
        </div>
        <div className="month-picker-grid" role="group" aria-label={heading}>
          {cells.map((cell) => (
            <Button
              key={cell.key}
              aria-pressed={cell.current}
              data-outside={'outside' in cell && cell.outside ? true : undefined}
              onClick={cell.pick}
            >
              {cell.text}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
