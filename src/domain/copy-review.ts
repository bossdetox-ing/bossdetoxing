export function copyRisks(value: string): boolean {
  return /[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/|\b(?:password|passwd|secret|token|api[_ -]?key|customer|client|credential)\b|\b\d{3}[- .]?\d{3}[- .]?\d{4}\b/i.test(
    value,
  );
}
