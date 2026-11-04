import words from '../content/eff-short-words.json';

// Six words from the EFF short wordlist (1,296 words) ≈ 62 bits, drawn with the platform CSPRNG.
// Rejection sampling keeps every word equally likely.
export function suggestPassphrase(count = 6) {
  const limit = Math.floor(2 ** 32 / words.length) * words.length;
  const picked: string[] = [];
  const buffer = new Uint32Array(1);
  while (picked.length < count) {
    crypto.getRandomValues(buffer);
    if (buffer[0]! < limit) picked.push(words[buffer[0]! % words.length]!);
  }
  return picked.join('-');
}
