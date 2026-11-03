import { content } from './content';
export const pains = [
  {
    id: 'threats',
    scenarioId: 'dismissal_warning',
    art: 'pain-threats',
    arcana: '01',
  },
  {
    id: 'guilt',
    scenarioId: 'guilt_induction',
    art: 'pain-guilt',
    arcana: '02',
  },
  {
    id: 'chaos',
    scenarioId: 'moving_goalposts',
    art: 'pain-chaos',
    arcana: '03',
  },
  {
    id: 'questions',
    scenarioId: 'circular_interrogation',
    art: 'pain-questions',
    arcana: '04',
  },
  {
    id: 'gossip',
    scenarioId: 'colleague_gossip',
    art: 'pain-gossip',
    arcana: '05',
  },
  {
    id: 'meetings',
    scenarioId: 'meeting_loop',
    art: 'pain-meetings',
    arcana: '06',
  },
] as const;
export function painForScenario(id: string) {
  return pains.find((pain) => pain.scenarioId === id);
}
export function scenarioFor(id: string) {
  return content.scenarios.find((s) => s.id === id) ?? content.scenarios[0]!;
}
