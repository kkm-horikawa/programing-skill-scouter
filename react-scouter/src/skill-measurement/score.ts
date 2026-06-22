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

/**
 * 採用シグナル（reach）。技術力の指標ではないが、star 等は稀なので
 * 戦闘力に「青天井のプラスアルファ」として線形に加算する（際限なく伸ばす）。
 */
/**
 * 採用シグナル（reach）＝ star / fork / follower の純粋な採用のみ。
 *
 * NOTE: PR数・レビュー数などの「活動カウント」は意図的に含めない。実測の結果、
 * org/業務repoへのPR乱発（vibe-coding含む）で容易に膨らみ、「他人に検証された」を
 * 意味しないと判明した。star/fork/follower は稀で、活動量では増えない採用の証。
 */
export interface ReachSignals {
  stars: number;
  followers: number;
  forks: number;
}

/**
 * reach 1単位あたりの戦闘力。
 * fork（実際に使う/ビルドする）> star（ブクマ/喝采）> follower（社会的注目）。
 * fork を star より重くすることで「知名度で星は付くが使われていない」repo を抑え、
 * 中規模の知名度が本物の craft を上回らないように較正している。
 */
const REACH_WEIGHTS: Record<keyof ReachSignals, number> = {
  forks: 50,
  stars: 30,
  followers: 15,
};

const NO_REACH: ReachSignals = {
  stars: 0,
  followers: 0,
  forks: 0,
};

/** 採用シグナルから青天井のボーナスを算出する。 */
export function reachBonus(r: ReachSignals): number {
  return Math.floor(
    (Object.keys(REACH_WEIGHTS) as Array<keyof ReachSignals>).reduce(
      (sum, key) => sum + Math.max(0, r[key]) * REACH_WEIGHTS[key],
      0
    )
  );
}

export interface ScoreInput {
  tier: SpineTier;
  /** バッジ充足率 0..1 */
  badgeFill: number;
  /** ヒューリスティックの craft 0..1 */
  craftScore: number;
  /** 採用シグナル（省略時はボーナス0） */
  reach?: ReachSignals;
}

export interface SkillScore {
  power: number;
  tier: SpineTier;
  bandBase: number;
  bandCeiling: number;
  /** 帯内の充足度 0..1（badgeFill と craft の合成） */
  fill: number;
  /** craft 帯までの基礎戦闘力（reach ボーナス前） */
  craftPower: number;
  /** reach による青天井ボーナス */
  reachBonus: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * 戦闘力 = craft 階級の帯（規律で決まる土台）＋ reach の青天井ボーナス。
 * 桁の土台は量で動かない（非補償ゲート）。reach だけが上限なく積み増す。
 */
export function composeScore(input: ScoreInput): SkillScore {
  const [bandBase, bandCeiling] = TIER_BANDS[input.tier];
  const fill = clamp01(input.badgeFill) * 0.5 + clamp01(input.craftScore) * 0.5;
  const craftPower = Math.floor(bandBase + fill * (bandCeiling - bandBase));
  const bonus = reachBonus(input.reach ?? NO_REACH);
  return {
    power: craftPower + bonus,
    tier: input.tier,
    bandBase,
    bandCeiling,
    fill,
    craftPower,
    reachBonus: bonus,
  };
}
