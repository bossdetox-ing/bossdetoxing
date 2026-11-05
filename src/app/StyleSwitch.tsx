import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { messages as t } from '../content';
import type { Tone } from '../domain/content';
export function StyleSwitch({ value, onChange }: { value: Tone; onChange: (tone: Tone) => void }) {
  return (
    <RadioGroup
      className="rock-switch"
      aria-label={t.quickUi.styles}
      orientation="horizontal"
      value={value}
      onValueChange={(value) => onChange(value as Tone)}
    >
      {(['yellow', 'grey', 'firm'] as const).map((tone) => {
        // "Yellow Rock": the colour always shows, "Rock" only on the chosen style.
        const [colour, ...rest] = t.quickUi.styleLabels[tone].split(' ');
        return (
          <RadioGroupItem
            key={tone}
            value={tone}
            className="rock-option"
            data-tone={tone}
            aria-label={t.quickUi.styleLabels[tone]}
          >
            <span aria-hidden="true">
              {colour}
              {rest.length > 0 && <span className="rock-word"> {rest.join(' ')}</span>}
            </span>
          </RadioGroupItem>
        );
      })}
    </RadioGroup>
  );
}
