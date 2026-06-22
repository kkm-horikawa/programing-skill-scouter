import type { GitHubRepo } from '../types/github';
import {
  hasCI,
  hasDocsSite,
  hasGitHooks,
  hasLinter,
  hasTaskRunner,
  isContainerized,
  testFileCount,
} from './detectors';
import type { RepoEvidence } from './gates';
import type { RepoTree } from './types';

const DAY_MS = 1000 * 60 * 60 * 24;

/** 実コードとみなす最小サイズ（KB）。これ未満はおもちゃ扱い。 */
const REAL_CODE_KB = 50;
/** 降格キャップの対象とする「規模あるrepo」の閾値 */
const SUBSTANTIAL_KB = 500;
const SUBSTANTIAL_AGE_DAYS = 90;
/** 非自明テストとみなす最小テストファイル数 */
const NON_TRIVIAL_TEST_FILES = 2;

/**
 * ツリーから検出できないメタデータ。I/O層（repos一覧・PR・リリースAPI）が埋める。
 * ゲート判定を純粋に保つため、評価ロジックからは分離する。
 */
export interface RepoMeta {
  /** デフォルトブランチが保護されているか（repos一覧の protected） */
  hasBranchProtection: boolean;
  /** merged PR が1件以上ある（PR駆動フロー） */
  usesPullRequests: boolean;
  /** リリース/タグを切っている */
  hasReleases: boolean;
}

/** 1リポジトリのツリーとメタデータから実証痕跡を組み立てる。 */
export function buildRepoEvidence(
  repo: GitHubRepo,
  tree: RepoTree,
  meta: RepoMeta,
  now: number = Date.now()
): RepoEvidence {
  const ageDays = (now - Date.parse(repo.created_at)) / DAY_MS;
  return {
    fullName: repo.full_name,
    hasRealCode: repo.size >= REAL_CODE_KB,
    isSubstantial:
      repo.size >= SUBSTANTIAL_KB && ageDays >= SUBSTANTIAL_AGE_DAYS,
    hasCI: hasCI(tree),
    nonTrivialTests: testFileCount(tree) >= NON_TRIVIAL_TEST_FILES,
    hasLinter: hasLinter(tree),
    hasGitHooks: hasGitHooks(tree),
    hasTaskRunner: hasTaskRunner(tree),
    hasBranchProtection: meta.hasBranchProtection,
    usesPullRequests: meta.usesPullRequests,
    hasReleases: meta.hasReleases,
    isContainerized: isContainerized(tree),
    hasDocsSite: hasDocsSite(tree),
  };
}
