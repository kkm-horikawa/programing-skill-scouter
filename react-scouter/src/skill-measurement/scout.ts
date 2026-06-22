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
  fetchOwnedRepos,
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

export interface DeepScoutOptions {
  /** ユーザーがピン留めした代表 repo の full_name */
  pinnedFullNames?: string[];
}

/**
 * deep 自己診断：本人のトークン（repo スコープ）で private 含む代表作を測る。
 *
 * 取得 → サンプリング → 各repoの tree/commits/config/meta 収集 → 組み立て。
 * 🔵（レビュー数・外部PR・公開ライブラリ・DL数）は未取得＝S5以上は後追いで解禁する。
 */
export async function scoutDeep(
  token: string,
  options: DeepScoutOptions = {}
): Promise<ScoutResult> {
  const repos = await fetchOwnedRepos(token);
  const sample = selectRepresentativeRepos(repos, {
    ...DEFAULT_SAMPLING_POLICY,
    pinnedFullNames: options.pinnedFullNames ?? [],
  });

  const repoData = await Promise.all(
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

  const account = await buildAccountEvidence(token, repoData);
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
  token: string,
  repoData: readonly RepoData[]
): Promise<AccountEvidence> {
  const login = await fetchAuthenticatedLogin(token);
  const profileReadme = await fetchFileText(
    `${login}/${login}`,
    'README.md',
    token
  );
  const maxStars = repoData.reduce(
    (max, d) => Math.max(max, d.repo.stargazers_count),
    0
  );
  const hasPublishedLibrary = await detectPublishedLibrary(repoData);

  return {
    hasProfileReadme: profileReadme != null,
    hasPublishedLibrary,
    externalMergedPRs: 0,
    reviewsGiven: 0,
    maxStars,
    libraryDownloads: 0,
    sustainedContribution: false,
    longLivedHighStar: false,
  };
}
