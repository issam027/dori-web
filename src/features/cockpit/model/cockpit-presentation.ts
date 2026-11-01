export function asDate(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
export function personName(person: { firstName: string | null; lastName: string | null }) {
  return [person.firstName, person.lastName].filter(Boolean).join(' ');
}