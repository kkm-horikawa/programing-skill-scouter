/**
 * 階級判定：二軸（craft × reach）を独立に出し、強い方を採る。
 *
 * - craft 軸：規律の連続ラダー（S1-S5）。CI/テスト/出荷/公開などの作り込み。
 *   検出器（ツール痕跡）に依存するので、ツールを使わない領域では過小評価しうる。
 * - reach 軸：star/follower/fork/外部貢献の閾値（最大S7）。検出器に依存しない。
 *   世界が使った成果は偽造できないので、伝説（例: Linux）をここで拾う。
 *
 * 最終 = max(craft, reach)。スロップ量産者は両軸とも低い（採用も規律も無い）ので
 * 頭打ちのまま。一方、検出器をすり抜ける本物は reach で正しく上がる。
 * 量（commit/PR の生数）はどちらの軸でも使わない。
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
  /** コミット振る舞いがスロップ的か（巨大ダンプ＋定型メッセージ。H-b 由来） */
  commitSlop?: boolean;
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
  /** フォロワー数 */
  followers: number;
  /** 代表repoの fork 合計 */
  totalForks: number;
  /** 公開ライブラリの実DL数（取れた場合。未取得は0） */
  libraryDownloads: number;
  /** 継続的なOSS貢献 */
  sustainedContribution: boolean;
  /** 長期維持された高star flagship */
  longLivedHighStar: boolean;
}

export interface SpineResult {
  tier: SpineTier;
  /** craft 軸で通過した段 */
  clearedGates: SpineTier[];
  /** craft 軸の到達段 */
  craftTier: SpineTier;
  /** reach 軸の到達段 */
  reachTier: SpineTier;
  /** 降格キャップが効いた理由（craftを下げ、かつreachで救われなかった場合のみ） */
  cappedBy?: string;
}

export function tierRank(tier: SpineTier): number {
  return SPINE_TIERS.indexOf(tier);
}

function maxTier(...tiers: SpineTier[]): SpineTier {
  return tiers.reduce((a, b) => (tierRank(b) > tierRank(a) ? b : a), 'S0');
}

/** 閾値表から、value が満たす最上位の段を引く。降順 [閾値, 段]。 */
function tierByThreshold(
  value: number,
  table: ReadonlyArray<readonly [number, SpineTier]>
): SpineTier {
  for (const [min, tier] of table) {
    if (value >= min) return tier;
  }
  return 'S0';
}

// ── craft 軸（規律の連続ラダー S1-S5）─────────────────────────

function craftGatePass(
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
    default:
      return false;
  }
}

function craftLadder(
  repos: readonly RepoEvidence[],
  account: AccountEvidence
): { tier: SpineTier; cleared: SpineTier[] } {
  const ladder: SpineTier[] = ['S1', 'S2', 'S3', 'S4', 'S5'];
  const cleared: SpineTier[] = [];
  let tier: SpineTier = 'S0';
  for (const gate of ladder) {
    if (!craftGatePass(gate, repos, account)) break;
    cleared.push(gate);
    tier = gate;
  }
  return { tier, cleared };
}

/**
 * 降格キャップ：規模あるrepoに一貫して規律が無ければ craft を S1 に落とす。
 * スロップ的＝（CI0 かつ テスト0）または コミットが巨大ダンプ＋定型メッセージ（H-b）。
 */
function demotionReason(repos: readonly RepoEvidence[]): string | null {
  const substantial = repos.filter((r) => r.isSubstantial);
  if (substantial.length === 0) return null;
  const isSlopShaped = (r: RepoEvidence) =>
    (!r.hasCI && !r.nonTrivialTests) || r.commitSlop === true;
  return substantial.every(isSlopShaped)
    ? '規模あるリポジトリに一貫して規律が無い'
    : null;
}

// ── reach 軸（外部からの採用。検出器に依存しない）──────────────

const STARS_TABLE = [
  [20000, 'S7'],
  [5000, 'S6'],
  [1000, 'S5'],
  [200, 'S4'],
  [30, 'S3'],
  [5, 'S2'],
] as const;

const FOLLOWERS_TABLE = [
  [10000, 'S7'],
  [2000, 'S6'],
  [500, 'S5'],
  [100, 'S4'],
  [30, 'S3'],
  [10, 'S2'],
] as const;

const FORKS_TABLE = [
  [5000, 'S6'],
  [1000, 'S5'],
  [200, 'S4'],
  [20, 'S3'],
] as const;

const DOWNLOADS_TABLE = [
  [100000, 'S7'],
  [10000, 'S6'],
  [1000, 'S5'],
] as const;

function reachLadder(account: AccountEvidence): SpineTier {
  const byContribution =
    account.externalMergedPRs >= 20
      ? 'S4'
      : account.externalMergedPRs >= 1 || account.reviewsGiven >= 10
        ? 'S3'
        : 'S0';
  const byLongevity = account.longLivedHighStar
    ? 'S7'
    : account.sustainedContribution
      ? 'S5'
      : 'S0';

  return maxTier(
    tierByThreshold(account.maxStars, STARS_TABLE),
    tierByThreshold(account.followers, FOLLOWERS_TABLE),
    tierByThreshold(account.totalForks, FORKS_TABLE),
    tierByThreshold(account.libraryDownloads, DOWNLOADS_TABLE),
    byContribution,
    byLongevity
  );
}

/** 二軸を評価して階級を返す。最終 = max(craft（降格適用後）, reach)。 */
export function evaluateSpineTier(
  repos: readonly RepoEvidence[],
  account: AccountEvidence
): SpineResult {
  const craft = craftLadder(repos, account);
  const reason = demotionReason(repos);
  const cappedCraft =
    reason && tierRank(craft.tier) > tierRank('S1') ? 'S1' : craft.tier;

  const reachTier = reachLadder(account);
  const tier = maxTier(cappedCraft, reachTier);

  // 降格が最終階級を実際に下げた（reachで救われなかった）場合だけ理由を出す
  const cappedBy =
    reason && tierRank(tier) < tierRank(craft.tier) ? reason : undefined;

  return {
    tier,
    clearedGates: craft.cleared,
    craftTier: cappedCraft,
    reachTier,
    cappedBy,
  };
}
