export function shuffled<T>(
  items: readonly T[],
  random: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296,
): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
