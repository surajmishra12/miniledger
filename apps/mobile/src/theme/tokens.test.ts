import { darkColors, lightColors } from './tokens';

/** WCAG relative luminance of a #RRGGBB color. */
function luminance(hex: string): number {
  const channels = (hex.slice(1).match(/../g) ?? []).map((h) => parseInt(h, 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

describe('theme tokens', () => {
  it('defines the same semantic tokens in both themes', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('keeps dark surfaces neutral black/charcoal (design.md §2.2)', () => {
    for (const hex of [darkColors.canvas, darkColors.surface, darkColors.surfaceMuted]) {
      const [r, g, b] = (hex.slice(1).match(/../g) ?? []).map((h) => parseInt(h, 16));
      expect(Math.max(r!, g!, b!) - Math.min(r!, g!, b!)).toBeLessThanOrEqual(4);
    }
  });

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ] as const)('meets WCAG AA for key text pairings in %s mode', (_name, c) => {
    const pairs: [string, string, number][] = [
      [c.textPrimary, c.canvas, 4.5],
      [c.textSecondary, c.surface, 4.5],
      [c.onBrand, c.brandPrimary, 4.5],
      [c.onBrand, c.brandPressed, 4.5],
      [c.onHero, c.heroSurface, 4.5],
      [c.onHeroMuted, c.heroSurface, 4.5],
      [c.lentText, c.lentSurface, 4.5],
      [c.borrowedText, c.borrowedSurface, 4.5],
      [c.successText, c.successSurface, 4.5],
      [c.warningText, c.warningSurface, 4.5],
      [c.dangerText, c.dangerSurface, 4.5],
      [c.outlineStrong, c.surface, 3],
      // Phase 5 audit: every text colour on every surface it appears on.
      [c.textPrimary, c.surfaceRaised, 4.5],
      [c.textSecondary, c.canvas, 4.5],
      [c.textSecondary, c.surfaceMuted, 4.5],
      [c.textSecondary, c.surfaceRaised, 4.5],
      [c.brandPrimary, c.canvas, 4.5],
      [c.brandPrimary, c.surface, 4.5],
      [c.brandPrimary, c.brandSubtle, 4.5],
      [c.lentText, c.surface, 4.5],
      [c.borrowedText, c.surface, 4.5],
      [c.successText, c.canvas, 4.5],
      [c.dangerText, c.canvas, 4.5],
      [c.dangerText, c.surface, 4.5],
      [c.dangerText, c.surfaceRaised, 4.5],
      [c.focusRing, c.surface, 3],
      // v1.6: tinted tiles, pills and the decorated hero.
      [c.lentText, c.canvas, 4.5],
      [c.borrowedText, c.canvas, 4.5],
      [c.lentText, c.surfaceMuted, 4.5],
      [c.borrowedText, c.surfaceMuted, 4.5],
      [c.textSecondary, c.lentSurface, 4.5],
      [c.textSecondary, c.borrowedSurface, 4.5],
      [c.textSecondary, c.warningSurface, 4.5],
      [c.textSecondary, c.dangerSurface, 4.5],
      [c.textSecondary, c.successSurface, 4.5],
      [c.dangerText, c.borrowedSurface, 4.5],
      [c.heroPositive, c.heroSurface, 3],
      [c.heroAlert, c.heroSurface, 3],
      // The receipt viewer draws onViewer on black in both themes.
      [c.onViewer, c.viewerCanvas, 4.5],
    ];
    for (const [fg, bg, min] of pairs) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
    }
  });
});
