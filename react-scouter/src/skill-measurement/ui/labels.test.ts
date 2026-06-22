import { describe, expect, it } from 'vitest';
import type { SpineResult } from '../gates';
import type { ScoutResult } from '../scout';
import {
  gateChecklist,
  nextRequirement,
  summarize,
  TIER_LABELS,
} from './labels';

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

describe('summarize', () => {
  const result: ScoutResult = {
    score: {
      power: 45000,
      tier: 'S3',
      bandBase: 30000,
      bandCeiling: 60000,
      fill: 0.5,
    },
    spine: {
      tier: 'S3',
      clearedGates: ['S1', 'S2', 'S3'],
      craftTier: 'S3',
      reachTier: 'S2',
    },
    badges: {
      earned: new Set(['git.codeowners', 'quality.eslint']),
      byGroup: {
        'G-Git': { earned: 1, total: 9 },
        'G-Quality': { earned: 1, total: 12 },
        'G-Test': { earned: 0, total: 8 },
        'G-CI': { earned: 0, total: 6 },
        'G-Build': { earned: 0, total: 5 },
        'G-Security': { earned: 0, total: 6 },
      },
      fill: 2 / 46,
    },
    craftScore: 0.6,
  };

  it('ScoutResult を履歴書向けサマリに変換する', () => {
    const s = summarize(result);
    expect(s.tierLabel).toBe('中級');
    expect(s.tier).toBe('S3');
    expect(s.craftTier).toBe('S3');
    expect(s.reachTier).toBe('S2');
    expect(s.power).toBe(45000);
    expect(s.earnedBadgeCount).toBe(2);
    expect(s.gates.filter((g) => g.cleared)).toHaveLength(3);
    expect(s.nextRequirement).toMatch(/リリース|コンテナ|docs/);
    expect(s.badgeGroups).toContainEqual({
      label: 'Git 運用規律',
      earned: 1,
      total: 9,
    });
  });
});
