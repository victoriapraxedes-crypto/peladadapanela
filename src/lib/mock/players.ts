export function initials(apelido: string): string {
  const parts = apelido.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const second = parts[1];
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}
