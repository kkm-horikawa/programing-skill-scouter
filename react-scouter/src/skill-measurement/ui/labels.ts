import type { SkillMeasurementSummary } from '../../types/github';
import type { BadgeGroup } from '../badges/types';
import type { SpineResult, SpineTier } from '../gates';
import type { ScoutResult } from '../scout';

/** 階級の日本語表示 */
export const TIER_LABELS: Record<SpineTier, string> = {
  S0: '休眠',
  S1: '初級',
  S2: '中級見習い',
  S3: '中級',
  S4: '上級見習い',
  S5: '上級',
  S6: '上級+',
  S7: 'エキスパート',
};

/** バッジグループの日本語表示 */
export const GROUP_LABELS: Record<BadgeGroup, string> = {
  'G-Git': 'Git 運用規律',
  'G-Quality': 'コード品質',
  'G-Test': 'テスト',
  'G-CI': 'CI/CD・自動化',
  'G-Build': 'ビルド・依存管理',
  'G-Security': 'セキュリティ',
};

interface GateDef {
  tier: SpineTier;
  label: string;
  requirement: string;
}

/** 背骨ゲート（S1-S7）の表示メタ。requirement は「次に何をすれば上がるか」に使う。 */
const GATE_DEFS: readonly GateDef[] = [
  { tier: 'S1', label: '初級', requirement: '実コードのある自分のリポジトリ' },
  {
    tier: 'S2',
    label: '中級見習い',
    requirement: 'CI・テスト・Linter を1つの repo で揃える',
  },
  {
    tier: 'S3',
    label: '中級',
    requirement:
      'PR駆動/ブランチ保護＋Git hooks/タスクランナー＋プロフィールREADME',
  },
  {
    tier: 'S4',
    label: '上級見習い',
    requirement: 'リリース／コンテナ化／docsサイトのいずれか',
  },
  {
    tier: 'S5',
    label: '上級',
    requirement: 'レジストリにライブラリを公開する',
  },
  {
    tier: 'S6',
    label: '上級+',
    requirement: '外部repoへのPR／レビュー／有意なstar',
  },
  {
    tier: 'S7',
    label: 'エキスパート',
    requirement: '実利用数／継続的OSS貢献／長期維持の高star',
  },
];

export interface GateRow extends GateDef {
  cleared: boolean;
}

/** ゲートのチェックリスト表示（✅/❌）。 */
export function gateChecklist(spine: SpineResult): GateRow[] {
  const cleared = new Set(spine.clearedGates);
  return GATE_DEFS.map((g) => ({ ...g, cleared: cleared.has(g.tier) }));
}

/** 次の階級に必要なこと。全段通過済みなら null。 */
export function nextRequirement(spine: SpineResult): string | null {
  const next = GATE_DEFS.find((g) => !spine.clearedGates.includes(g.tier));
  return next ? next.requirement : null;
}

/**
 * ScoutResult を履歴書・SVG 向けの平易なサマリに変換する。
 * 表示層（既存モノリス）が skill-measurement の型に依存しないための境界。
 */
export function summarize(result: ScoutResult): SkillMeasurementSummary {
  const { spine, badges, score } = result;
  return {
    tier: spine.tier,
    tierLabel: TIER_LABELS[spine.tier],
    craftTier: spine.craftTier,
    reachTier: spine.reachTier,
    power: score.power,
    gates: gateChecklist(spine).map((g) => ({
      tier: g.tier,
      label: g.label,
      requirement: g.requirement,
      cleared: g.cleared,
    })),
    badgeGroups: (
      Object.entries(badges.byGroup) as Array<
        [BadgeGroup, { earned: number; total: number }]
      >
    ).map(([group, tally]) => ({
      label: GROUP_LABELS[group],
      earned: tally.earned,
      total: tally.total,
    })),
    earnedBadgeCount: badges.earned.size,
    nextRequirement: nextRequirement(spine),
    cappedBy: spine.cappedBy,
  };
}
