import { buildBadges } from './g-build';
import { ciBadges } from './g-ci';
import { gitBadges } from './g-git';
import { qualityBadges } from './g-quality';
import { securityBadges } from './g-security';
import { testBadges } from './g-test';
import type { BadgeContext, BadgeDefinition, BadgeGroup } from './types';

/** 全バッジ定義（第一弾＝規律コア6グループ・🟢のみ）。 */
export const ALL_BADGES: readonly BadgeDefinition[] = [
  ...gitBadges,
  ...qualityBadges,
  ...testBadges,
  ...ciBadges,
  ...buildBadges,
  ...securityBadges,
];

export interface GroupTally {
  earned: number;
  total: number;
}

/** サンプル全体でのバッジ獲得状況 */
export interface EarnedBadges {
  /** 獲得したバッジID */
  earned: Set<string>;
  /** グループ別の獲得数/総数 */
  byGroup: Record<BadgeGroup, GroupTally>;
  /** 全体の充足率（獲得数 / 総数、0..1）。スコア合成の badgeFill。 */
  fill: number;
}

/**
 * サンプルの各リポジトリ context に対しバッジを評価し、集計する。
 * バッジは加点専用。いずれか1つのrepoが満たせば「獲得」とみなす（背骨ゲートと同じ集計）。
 * repo数では増えないので、量水増しが効かない。
 */
export function evaluateBadges(
  contexts: readonly BadgeContext[]
): EarnedBadges {
  const earned = new Set<string>();
  for (const badge of ALL_BADGES) {
    if (contexts.some((ctx) => badge.detect(ctx))) {
      earned.add(badge.id);
    }
  }

  const byGroup = {} as Record<BadgeGroup, GroupTally>;
  for (const badge of ALL_BADGES) {
    const tally = (byGroup[badge.group] ??= { earned: 0, total: 0 });
    tally.total++;
    if (earned.has(badge.id)) tally.earned++;
  }

  const fill = ALL_BADGES.length ? earned.size / ALL_BADGES.length : 0;
  return { earned, byGroup, fill };
}
