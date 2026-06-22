import type { GitHubRepo } from '../types/github';
import { evaluateBadges, type EarnedBadges } from './badges';
import type { BadgeContext, RepoBadgeMeta } from './badges/types';
import { buildRepoEvidence, type RepoMeta } from './evidence';
import {
  evaluateSpineTier,
  type AccountEvidence,
  type SpineResult,
} from './gates';
import {
  fetchAuthenticatedLogin,
  fetchFileText,
  fetchFollowerCount,
  fetchOwnedRepos,
  fetchPublicRepos,
  fetchRecentCommits,
  fetchRepoMeta,
  fetchRepoTree,
} from './github-api';
import { craftMetrics, isCommitSlop, type CommitSummary } from './heuristics';
import { checkRegistry, parsePackageNames } from './published-library';
import { selectRepresentativeRepos } from './sampling';
import { composeScore, type SkillScore } from './score';
import { DEFAULT_SAMPLING_POLICY, type RepoTree } from './types';

/** 1リポジトリについて取得済みの全データ。I/O層が集めて assemble に渡す。 */
export interface RepoData {
  repo: GitHubRepo;
  tree: RepoTree;
  commits: CommitSummary[];
  /** key config の path → 内容（tsconfig.json など） */
  configFiles: Record<string, string>;
  meta: RepoMeta;
}

/** 測定結果。UI はこれを表示する。 */
export interface ScoutResult {
  score: SkillScore;
  spine: SpineResult;
  badges: EarnedBadges;
  /** 代表作の craft 天井（最良repo） */
  craftScore: number;
}

/** RepoMeta（ゲート用）→ RepoBadgeMeta（バッジ用）。署名コミットは🔵で後追い。 */
function toBadgeMeta(meta: RepoMeta): RepoBadgeMeta {
  return {
    hasBranchProtection: meta.hasBranchProtection,
    usesPullRequests: meta.usesPullRequests,
    hasSignedCommits: false,
  };
}

/**
 * 取得済みデータから測定結果を組み立てる純粋関数。
 *
 * - 背骨ゲートで階級（桁）を決める（コミットスロップで降格キャップ強化）
 * - バッジ充足をサンプル横断で集計
 * - craft は天井（最良repo）を採る＝能力は代表作に出るという前提
 * - 階級の帯に badgeFill と craft を詰めて戦闘力を出す（量では桁が動かない）
 */
export function assembleScoutResult(
  repoData: readonly RepoData[],
  account: AccountEvidence,
  now: number = Date.now()
): ScoutResult {
  const perRepo = repoData.map((d) => {
    const craft = craftMetrics(d.tree, d.commits, d.configFiles);
    const evidence = {
      ...buildRepoEvidence(d.repo, d.tree, d.meta, now),
      commitSlop: isCommitSlop(craft.commits),
    };
    const context: BadgeContext = { tree: d.tree, meta: toBadgeMeta(d.meta) };
    return { craft, evidence, context };
  });

  const spine = evaluateSpineTier(
    perRepo.map((p) => p.evidence),
    account
  );
  const badges = evaluateBadges(perRepo.map((p) => p.context));
  const craftScore = perRepo.length
    ? Math.max(...perRepo.map((p) => p.craft.craftScore))
    : 0;

  const score = composeScore({
    tier: spine.tier,
    badgeFill: badges.fill,
    craftScore,
    reach: {
      stars: account.maxStars,
      followers: account.followers,
      forks: account.totalForks,
      externalPRs: account.externalMergedPRs,
      reviewsGiven: account.reviewsGiven,
    },
  });

  return { score, spine, badges, craftScore };
}

/**
 * 取得する key file（存在するものだけ使う）。
 * H-c 設定厳密さ（tsconfig/mypy/pyproject）と、公開ライブラリ判定の manifest を兼ねる。
 */
const KEY_FILES = [
  'tsconfig.json',
  'mypy.ini',
  'pyproject.toml',
  'setup.cfg',
  'package.json',
  'Cargo.toml',
];

export interface ScoutOptions {
  /** ユーザーがピン留めした代表 repo の full_name */
  pinnedFullNames?: string[];
}

/** サンプルから各repoのデータを集める（tree/commits/config/meta）。 */
async function collectRepoData(
  repos: readonly GitHubRepo[],
  token: string | null,
  pinnedFullNames: string[]
): Promise<RepoData[]> {
  const sample = selectRepresentativeRepos(repos, {
    ...DEFAULT_SAMPLING_POLICY,
    pinnedFullNames,
  });

  return Promise.all(
    sample.map(async ({ repo }): Promise<RepoData> => {
      const [tree, commits, meta] = await Promise.all([
        fetchRepoTree(repo.full_name, repo.default_branch, token),
        fetchRecentCommits(repo.full_name, token),
        fetchRepoMeta(repo.full_name, repo.default_branch, token),
      ]);
      const configEntries = await Promise.all(
        KEY_FILES.map(
          async (path) =>
            [path, await fetchFileText(repo.full_name, path, token)] as const
        )
      );
      const configFiles: Record<string, string> = {};
      for (const [path, content] of configEntries) {
        if (content != null) configFiles[path] = content;
      }
      return { repo, tree, commits, configFiles, meta };
    })
  );
}

/**
 * deep 自己診断：本人のトークン（repo スコープ）で private 含む代表作を測る。
 * 🔵（レビュー数・外部PR・DL数）は未取得＝S6以上の一部は後追いで解禁する。
 */
export async function scoutDeep(
  token: string,
  options: ScoutOptions = {}
): Promise<ScoutResult> {
  const login = await fetchAuthenticatedLogin(token);
  const repos = await fetchOwnedRepos(token);
  const repoData = await collectRepoData(
    repos,
    token,
    options.pinnedFullNames ?? []
  );
  const account = await buildAccountEvidence(login, repoData, token);
  return assembleScoutResult(repoData, account);
}

/**
 * 公開スカウト（新エンジン）：任意ユーザーの公開リポジトリを同じ基準で測る。
 *
 * 量ではなく規律・作り込みで測るので、バイブコーディング量産者を正しく低く出せる。
 * private は見えないが、他者どうしの比較はこれで成立する（旧 calculatePowerLevel の置換）。
 * token はレート制限緩和のため任意で渡す。
 */
export async function scoutPublic(
  username: string,
  token: string | null = null,
  options: ScoutOptions = {}
): Promise<ScoutResult> {
  const repos = await fetchPublicRepos(username, token);
  const repoData = await collectRepoData(
    repos,
    token,
    options.pinnedFullNames ?? []
  );
  const account = await buildAccountEvidence(username, repoData, token);
  return assembleScoutResult(repoData, account);
}

/**
 * 公開ライブラリがあるか判定。
 * manifest からパッケージ名を抽出し、レジストリで公開を確認（確実）。
 * リリースを切っている repo は manifest があれば公開済みとみなす（CORS拒否時のフォールバック）。
 */
async function detectPublishedLibrary(
  repoData: readonly RepoData[]
): Promise<boolean> {
  const refs = repoData.flatMap((d) =>
    parsePackageNames(d.configFiles).map((ref) => ({
      ref,
      hasReleases: d.meta.hasReleases,
    }))
  );
  if (refs.length === 0) return false;
  const results = await Promise.all(
    refs.map(async (r) => ({
      status: await checkRegistry(r.ref),
      hasReleases: r.hasReleases,
    }))
  );
  // レジストリが公開を確認できれば成立（確実）
  if (results.some((r) => r.status === 'published')) return true;
  // 確認できなかった（CORS/ネットワーク）時だけ、manifest＋リリースで代替
  return results.some((r) => r.status === 'unknown' && r.hasReleases);
}

/** 🟢で取れるアカウント証拠。🔵分（レビュー/外部PR/DL数）は後追いで解禁する。 */
async function buildAccountEvidence(
  login: string,
  repoData: readonly RepoData[],
  token: string | null
): Promise<AccountEvidence> {
  const [profileReadme, followers, hasPublishedLibrary] = await Promise.all([
    fetchFileText(`${login}/${login}`, 'README.md', token),
    fetchFollowerCount(login, token),
    detectPublishedLibrary(repoData),
  ]);
  const maxStars = repoData.reduce(
    (max, d) => Math.max(max, d.repo.stargazers_count),
    0
  );
  const totalForks = repoData.reduce((sum, d) => sum + d.repo.forks_count, 0);

  return {
    hasProfileReadme: profileReadme != null,
    hasPublishedLibrary,
    externalMergedPRs: 0,
    reviewsGiven: 0,
    maxStars,
    followers,
    totalForks,
    libraryDownloads: 0,
    sustainedContribution: false,
    longLivedHighStar: false,
  };
}
