export function truncate(text: string, maxLength: number): string {
  const flat = text.replace(/\n/g, " ");
  if (flat.length <= maxLength) return flat;
  return flat.slice(0, maxLength) + "...";
}
