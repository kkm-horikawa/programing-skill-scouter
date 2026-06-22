import { describe, expect, it } from 'vitest';
import { composeScore, reachBonus, TIER_BANDS } from './score';

describe('composeScore', () => {
  it('S0 は power 0', () => {
    expect(
      composeScore({ tier: 'S0', badgeFill: 1, craftScore: 1 }).power
    ).toBe(0);
  });

  it('帯の下限〜上限の中に収まる', () => {
    const s = composeScore({ tier: 'S3', badgeFill: 0.5, craftScore: 0.5 });
    expect(s.power).toBeGreaterThanOrEqual(TIER_BANDS.S3[0]);
    expect(s.power).toBeLessThanOrEqual(TIER_BANDS.S3[1]);
  });

  it('充足が満タンなら帯の上限、ゼロなら下限', () => {
    const full = composeScore({ tier: 'S4', badgeFill: 1, craftScore: 1 });
    const empty = composeScore({ tier: 'S4', badgeFill: 0, craftScore: 0 });
    expect(full.power).toBe(TIER_BANDS.S4[1]);
    expect(empty.power).toBe(TIER_BANDS.S4[0]);
  });

  it('量(badge/craft)を満タンにしても、上の階級の下限は超えない（非補償）', () => {
    const s2Full = composeScore({ tier: 'S2', badgeFill: 1, craftScore: 1 });
    const s3Empty = composeScore({ tier: 'S3', badgeFill: 0, craftScore: 0 });
    // S2でどれだけ埋めても S3 の入口(=30k)止まり。上の桁には食い込まない。
    expect(s2Full.power).toBeLessThanOrEqual(s3Empty.power);
  });

  it('badgeFill と craftScore は均等に効く', () => {
    const onlyBadge = composeScore({ tier: 'S3', badgeFill: 1, craftScore: 0 });
    const onlyCraft = composeScore({ tier: 'S3', badgeFill: 0, craftScore: 1 });
    expect(onlyBadge.power).toBe(onlyCraft.power);
  });

  it('範囲外の入力は 0..1 にクランプする', () => {
    const s = composeScore({ tier: 'S2', badgeFill: 5, craftScore: -3 });
    expect(s.fill).toBe(0.5);
  });
});

describe('reachBonus / reach の青天井加算', () => {
  it('star が無ければボーナス0', () => {
    expect(
      reachBonus({
        stars: 0,
        followers: 0,
        forks: 0,
        externalPRs: 0,
        reviewsGiven: 0,
      })
    ).toBe(0);
  });

  it('star は際限なく線形に積み増す', () => {
    const a = reachBonus({
      stars: 1000,
      followers: 0,
      forks: 0,
      externalPRs: 0,
      reviewsGiven: 0,
    });
    const b = reachBonus({
      stars: 2000,
      followers: 0,
      forks: 0,
      externalPRs: 0,
      reviewsGiven: 0,
    });
    expect(b).toBe(a * 2);
  });

  it('reach は帯の上限を超えて戦闘力を押し上げる（青天井）', () => {
    const famous = composeScore({
      tier: 'S2',
      badgeFill: 1,
      craftScore: 1,
      reach: {
        stars: 180000,
        followers: 50000,
        forks: 80000,
        externalPRs: 0,
        reviewsGiven: 0,
      },
    });
    expect(famous.power).toBeGreaterThan(TIER_BANDS.S7[1]);
    expect(famous.tier).toBe('S2'); // 階級は craft のまま、人気で変わらない
  });

  it('reach が無い実力者は craft 帯どおり（人気ゼロでも沈まない）', () => {
    const unknown = composeScore({ tier: 'S5', badgeFill: 1, craftScore: 1 });
    expect(unknown.power).toBe(TIER_BANDS.S5[1]);
    expect(unknown.reachBonus).toBe(0);
  });
});
