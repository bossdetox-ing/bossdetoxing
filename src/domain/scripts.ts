import type { Scenario, Tone } from './content';
import { en } from '../content/en';
import spokenLines from '../content/spoken.en.json';

// What to say out loud in the room, per threat and rock: shorter and more natural than the
// written reply. Falls back to the written reply without its warm opener.
const spoken = spokenLines as Record<string, Partial<Record<Tone, string>>>;

export function professionalResponse(scenario: Scenario | undefined, tone: Tone, format: string) {
  const response = scenario?.responses[tone] ?? en.generic;
  if (format !== 'spoken') return response;
  return (
    (scenario && spoken[scenario.id]?.[tone]) ??
    (tone === 'yellow' ? response.replace(/^[^?]+?\.\s+/, '') : response)
  );
}
