import type { PersonDto } from '@miniledger/shared';

export type PeopleRow =
  | { kind: 'section'; title: string }
  | { kind: 'person'; person: PersonDto; first: boolean; last: boolean };

const hasBalance = (p: PersonDto) => p.owesYouPaise > 0 || p.youOwePaise > 0;

/** Balances first, then settled; each group alphabetical as returned by the API. */
export function peopleRows(items: PersonDto[], withSections: boolean): PeopleRow[] {
  const open = items.filter(hasBalance);
  const settled = items.filter((p) => !hasBalance(p));
  const group = (title: string, list: PersonDto[]): PeopleRow[] =>
    list.length === 0
      ? []
      : [
          ...(withSections && title ? [{ kind: 'section' as const, title }] : []),
          ...list.map((person, i) => ({
            kind: 'person' as const,
            person,
            first: i === 0,
            last: i === list.length - 1,
          })),
        ];
  return withSections && open.length && settled.length
    ? [...group('With a balance', open), ...group('Settled', settled)]
    : group('', [...open, ...settled]);
}
