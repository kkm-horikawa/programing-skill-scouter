import type { SpineTier } from './gates';

/**
 * スコア合成：背骨ゲートで決まった階級（帯）の中を、バッジ充足とcraftで埋める。
 *
 *   power = bandBase + (badgeFill*0.5 + craftScore*0.5) * bandWidth
 *
 * 桁は背骨が決め、バッジもヒューリスティックも帯を超えない。
 * だから生コミット/PR/star をいくら積んでも、階級の上限より上の数字は出ない
 * ＝量水増しが構造的に効かない。
 */

/** 階級ごとの戦闘力の帯 [下限, 上限]。設計docの値。S7 は上限を便宜的に置く。 */
export const TIER_BANDS: Record<SpineTier, readonly [number, number]> = {
  S0: [0, 0],
  S1: [0, 10_000],
  S2: [10_000, 30_000],
  S3: [30_000, 60_000],
  S4: [60_000, 100_000],
  S5: [100_000, 200_000],
  S6: [200_000, 400_000],
  S7: [400_000, 800_000],
};

export interface ScoreInput {
  tier: SpineTier;
  /** バッジ充足率 0..1 */
  badgeFill: number;
  /** ヒューリスティックの craft 0..1 */
  craftScore: number;
}

export interface SkillScore {
  power: number;
  tier: SpineTier;
  bandBase: number;
  bandCeiling: number;
  /** 帯内の充足度 0..1（badgeFill と craft の合成） */
  fill: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function composeScore(input: ScoreInput): SkillScore {
  const [bandBase, bandCeiling] = TIER_BANDS[input.tier];
  const fill = clamp01(input.badgeFill) * 0.5 + clamp01(input.craftScore) * 0.5;
  const power = Math.floor(bandBase + fill * (bandCeiling - bandBase));
  return { power, tier: input.tier, bandBase, bandCeiling, fill };
}
