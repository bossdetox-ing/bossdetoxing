import type { Scenario, Tone } from './content';
import { en } from '../content/en';

export function professionalResponse(scenario: Scenario | undefined, tone: Tone, format: string) {
  if (format === 'follow_up') return en.followUpTemplate;
  const response = scenario?.responses[tone] ?? en.generic;
  return format === 'spoken' && tone === 'yellow' ? response.replace(/^[^?]+?\.\s+/, '') : response;
}
