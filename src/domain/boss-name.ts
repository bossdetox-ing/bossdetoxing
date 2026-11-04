// Placeholders that rotate through the empty boss-name field: demons from exorcism films and
// demonology, public-figure satire, and errors that behave like a bad boss.
export const demonNames = [
  'Balthazar',
  'Elon',
  'Deadlock',
  'Pazuzu',
  'William Henry Gates',
  'Kernel Panic',
  'Damien',
  'Donald',
  'Per My Last Email',
  'Beelzebub',
  'Vladimir',
  'Memory Leak',
  'Lucifer',
  'Kim Jong Un',
  'Error 403',
  'Asmodeus',
  'Paper Jam',
  'Infinite Loop',
  'Mephistopheles',
  'Reply-All',
  'Segfault',
  'Belial',
  'Mandatory Fun',
  'Access Denied',
  'Azazel',
  'Blue Screen',
  'Legion',
  'Fatal Exception',
  'Astaroth',
  'Quick Call',
  'Mammon',
  'Timeout',
  'Abaddon',
  'Moloch',
  'Lilith',
  'Devil',
];

export const cleanBossName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, 40);

// Puts the boss's name where copy says "the boss" or uses a singular pronoun.
export function withBossName(text: string, name: string) {
  const boss = cleanBossName(name);
  if (!boss) return text;
  return text
    .replace(/\b[Tt]he boss's\b/g, `${boss}'s`)
    .replace(/\b[Tt]he boss\b/g, boss)
    .replace(/\b[Hh]is\b/g, `${boss}'s`)
    .replace(/\b(?:[Hh]e|him)\b/g, boss);
}
