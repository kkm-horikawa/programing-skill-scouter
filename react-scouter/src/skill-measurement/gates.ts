/**
 * 背骨ゲート：非補償の階級判定。
 *
 * 足し算スコアと違い、ある能力を実証しない限り次の段（＝桁）に上がれない。
 * 量で代替できないので、AI生成PRの量産者を構造的に頭打ちにする。
 *
 * 階級 = 下から連続で通過できた最上位の段（contiguous）。S2を落とせば
 * 上の段を満たしてもS1止まり。これが非補償性の核。
 */

export const SPINE_TIERS = [
  'S0',
  'S1',
  'S2',
  'S3',
  'S4',
  'S5',
  'S6',
  'S7',
] as const;
export type SpineTier = (typeof SPINE_TIERS)[number];

/** star単独ルートは弱いので閾値を高めに置く（買われた星対策） */
const STAR_GATE = 10;
const DOWNLOAD_GATE = 1000;

/** 1リポジトリから検出した実証痕跡（ツリー＋メタデータ由来） */
export interface RepoEvidence {
  fullName: string;
  /** 実コードがある（おもちゃでない） */
  hasRealCode: boolean;
  /** 一定規模・年齢を超える（降格キャップの対象判定） */
  isSubstantial: boolean;
  hasCI: boolean;
  /** 非自明なテスト（雛形1個でない） */
  nonTrivialTests: boolean;
  hasLinter: boolean;
  hasGitHooks: boolean;
  hasTaskRunner: boolean;
  hasBranchProtection: boolean;
  usesPullRequests: boolean;
  hasReleases: boolean;
  isContainerized: boolean;
  hasDocsSite: boolean;
}

/** アカウント全体の実証痕跡（per-repoでなく本人単位の信号） */
export interface AccountEvidence {
  hasProfileReadme: boolean;
  /** レジストリに公開済みライブラリがある（初級/中級の決定線） */
  hasPublishedLibrary: boolean;
  /** 自分が所有しないrepoへのmerged PR数 */
  externalMergedPRs: number;
  /** 他人のPRをレビューした数 */
  reviewsGiven: number;
  /** 代表repoの最大star */
  maxStars: number;
  /** 公開ライブラリの実DL数（取れた場合。未取得は0） */
  libraryDownloads: number;
  /** 継続的なOSS貢献 */
  sustainedContribution: boolean;
  /** 長期維持された高star flagship */
  longLivedHighStar: boolean;
}

export interface SpineResult {
  tier: SpineTier;
  /** 通過した背骨段 */
  clearedGates: SpineTier[];
  /** 降格キャップが効いた理由（効いた場合のみ） */
  cappedBy?: string;
}

/** その段のゲートを通過するか。「サンプル内のいずれかのrepoが満たす」で判定。 */
function gatePass(
  tier: SpineTier,
  repos: readonly RepoEvidence[],
  account: AccountEvidence
): boolean {
  const some = (pred: (r: RepoEvidence) => boolean) => repos.some(pred);
  switch (tier) {
    case 'S1':
      return some((r) => r.hasRealCode);
    case 'S2':
      return some((r) => r.hasCI && r.nonTrivialTests && r.hasLinter);
    case 'S3':
      return (
        account.hasProfileReadme &&
        some(
          (r) =>
            (r.usesPullRequests || r.hasBranchProtection) &&
            (r.hasGitHooks || r.hasTaskRunner)
        )
      );
    case 'S4':
      return some((r) => r.hasReleases || r.isContainerized || r.hasDocsSite);
    case 'S5':
      return account.hasPublishedLibrary;
    case 'S6':
      return (
        account.externalMergedPRs > 0 ||
        account.reviewsGiven > 0 ||
        account.maxStars >= STAR_GATE
      );
    case 'S7':
      return (
        account.libraryDownloads >= DOWNLOAD_GATE ||
        account.sustainedContribution ||
        account.longLivedHighStar
      );
    default:
      return false;
  }
}

export function tierRank(tier: SpineTier): number {
  return SPINE_TIERS.indexOf(tier);
}

/**
 * 降格キャップ：規模あるrepoに一貫して規律が無ければ S1 に落とす。
 *
 * S2を「小さなデモrepo1個」で通過しても、本命の substantial repo が軒並み
 * テスト0・CI0なら実態はスロップ → キャップ。これが「見せ repo」ゲーミング対策。
 *
 * NOTE: step4 で main直コミット率・定型コミット率（H-bヒューリスティック）を
 * 加えてキャップ条件を強化する。現状はツリー由来（CI・テストの不在）のみ。
 */
function demotionReason(repos: readonly RepoEvidence[]): string | null {
  const substantial = repos.filter((r) => r.isSubstantial);
  if (substantial.length === 0) return null;
  const allBare = substantial.every((r) => !r.hasCI && !r.nonTrivialTests);
  return allBare ? '規模あるリポジトリに一貫してCI・テストが無い' : null;
}

/** 背骨ゲートを評価して階級を返す。 */
export function evaluateSpineTier(
  repos: readonly RepoEvidence[],
  account: AccountEvidence
): SpineResult {
  const ladder: SpineTier[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
  const cleared: SpineTier[] = [];
  let tier: SpineTier = 'S0';

  for (const gate of ladder) {
    if (!gatePass(gate, repos, account)) break;
    cleared.push(gate);
    tier = gate;
  }

  const reason = demotionReason(repos);
  if (reason && tierRank(tier) > tierRank('S1')) {
    return { tier: 'S1', clearedGates: cleared, cappedBy: reason };
  }

  return { tier, clearedGates: cleared };
}
