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
      {(['yellow', 'grey', 'firm'] as const).map((tone) => (
        <RadioGroupItem
          key={tone}
          value={tone}
          className="rock-option"
          data-tone={tone}
          aria-label={t.quickUi.styleLabels[tone]}
        >
          <span>{t.quickUi.styleLabels[tone]}</span>
        </RadioGroupItem>
      ))}
    </RadioGroup>
  );
}
