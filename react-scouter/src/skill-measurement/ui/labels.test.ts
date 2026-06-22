import { describe, expect, it } from 'vitest';
import type { SpineResult } from '../gates';
import { gateChecklist, nextRequirement, TIER_LABELS } from './labels';

const spine = (over: Partial<SpineResult> = {}): SpineResult => ({
  tier: 'S2',
  clearedGates: ['S1', 'S2'],
  craftTier: 'S2',
  reachTier: 'S0',
  ...over,
});

describe('gateChecklist', () => {
  it('通過した段に cleared フラグを立てる', () => {
    const rows = gateChecklist(spine({ clearedGates: ['S1', 'S2'] }));
    expect(rows.find((r) => r.tier === 'S1')?.cleared).toBe(true);
    expect(rows.find((r) => r.tier === 'S2')?.cleared).toBe(true);
    expect(rows.find((r) => r.tier === 'S3')?.cleared).toBe(false);
  });

  it('S1-S7 の7段すべてを返す', () => {
    expect(gateChecklist(spine())).toHaveLength(7);
  });
});

describe('nextRequirement', () => {
  it('最初の未通過段の要件を返す', () => {
    const req = nextRequirement(spine({ clearedGates: ['S1', 'S2'] }));
    expect(req).toMatch(/PR駆動|ブランチ保護/);
  });

  it('全段通過なら null', () => {
    const all: SpineResult['clearedGates'] = [
      'S1',
      'S2',
      'S3',
      'S4',
      'S5',
      'S6',
      'S7',
    ];
    expect(nextRequirement(spine({ clearedGates: all }))).toBeNull();
  });
});

describe('TIER_LABELS', () => {
  it('全階級にラベルがある', () => {
    expect(TIER_LABELS.S0).toBe('休眠');
    expect(TIER_LABELS.S7).toBe('エキスパート');
  });
});
