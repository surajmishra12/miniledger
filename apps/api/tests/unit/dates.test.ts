import { describe, expect, it } from 'vitest';

import { canonicalTimeZone, todayIn } from '../../src/lib/dates';

describe('todayIn', () => {
  it('uses the account timezone at the date boundary', () => {
    // 18:00 UTC on 22 Oct is 23:30 IST (still the 22nd); 19:00 UTC is 00:30 IST on the 23rd.
    expect(todayIn('Asia/Kolkata', new Date('2026-10-22T18:00:00Z'))).toBe('2026-10-22');
    expect(todayIn('Asia/Kolkata', new Date('2026-10-22T19:00:00Z'))).toBe('2026-10-23');
    expect(todayIn('America/New_York', new Date('2026-10-23T02:00:00Z'))).toBe('2026-10-22');
  });
});

describe('canonicalTimeZone', () => {
  it('keeps modern names instead of ICU legacy aliases', () => {
    expect(canonicalTimeZone('Asia/Kolkata')).toBe('Asia/Kolkata');
  });

  it('fixes casing and rejects unknown zones', () => {
    expect(canonicalTimeZone('america/new_york')).toBe('America/New_York');
    expect(canonicalTimeZone('Mars/Olympus')).toBeNull();
    expect(canonicalTimeZone('')).toBeNull();
  });
});
