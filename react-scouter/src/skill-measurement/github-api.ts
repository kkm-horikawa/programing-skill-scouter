import type { GitHubRepo } from '../types/github';
import type { CommitSummary } from './heuristics';
import type { RepoTree, RepoTreeEntry } from './types';

const GITHUB_API = 'https://api.github.com';
const PER_PAGE = 100;
const MAX_PAGES = 10;

/**
 * 認証ヘッダを組み立てる。
 * classic PAT（ghp_ / 旧式）は `token`、fine-grained PAT（github_pat_）は `Bearer`。
 */
export function authHeaders(token: string | null): Record<string, string> {
  const base = { Accept: 'application/vnd.github+json' };
  if (!token) return base;
  const scheme = token.startsWith('github_pat_') ? 'Bearer' : 'token';
  return { ...base, Authorization: `${scheme} ${token}` };
}

/**
 * ユーザーのフォロワー数を取得（reach 軸の入力）。
 * 失敗は 0 に倒す（致命的でない補助情報）。
 */
export async function fetchFollowerCount(
  username: string,
  token: string | null
): Promise<number> {
  const res = await fetch(`${GITHUB_API}/users/${username}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) return 0;
  const data = (await res.json()) as { followers?: number };
  return data.followers ?? 0;
}

/** 認証ユーザー本人の login を取得（deep モードの対象＝本人）。 */
export async function fetchAuthenticatedLogin(token: string): Promise<string> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch authenticated user: ${res.status} ${res.statusText}`
    );
  }
  const data = (await res.json()) as { login?: string };
  if (!data.login) throw new Error('Authenticated user has no login');
  return data.login;
}

/**
 * 認証ユーザー本人が所有する repo を全取得（private 含む）。
 * deep 自己診断モード用。`repo` スコープのトークンが必要。
 * 他人の private は GitHub の仕様上取得できない＝このモードは本人専用。
 */
export async function fetchOwnedRepos(token: string): Promise<GitHubRepo[]> {
  const headers = authHeaders(token);
  const all: GitHubRepo[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(
      `${GITHUB_API}/user/repos?per_page=${PER_PAGE}&page=${page}&affiliation=owner&sort=pushed`,
      { headers }
    );
    if (!res.ok) {
      throw new Error(
        `Failed to fetch owned repos (page ${page}): ${res.status} ${res.statusText}`
      );
    }
    const batch = (await res.json()) as GitHubRepo[];
    all.push(...batch);
    if (batch.length < PER_PAGE) break;
  }

  return all;
}

/**
 * 任意ユーザーの公開 repo を全取得（公開スカウト用）。
 * 他人を新エンジンで測るための入口。private は GitHub の仕様上含まれない。
 * トークンはレート制限緩和のため（他人の公開データ読み取りに権限は不要）。
 */
export async function fetchPublicRepos(
  username: string,
  token: string | null
): Promise<GitHubRepo[]> {
  const headers = authHeaders(token);
  const all: GitHubRepo[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(
      `${GITHUB_API}/users/${username}/repos?per_page=${PER_PAGE}&page=${page}&sort=pushed`,
      { headers }
    );
    if (!res.ok) {
      throw new Error(
        `Failed to fetch public repos for ${username} (page ${page}): ${res.status} ${res.statusText}`
      );
    }
    const batch = (await res.json()) as GitHubRepo[];
    all.push(...batch);
    if (batch.length < PER_PAGE) break;
  }

  return all;
}

/**
 * リポジトリの全ファイルパスを1コールで取得（recursive tree）。
 * バッジ／ヒューリスティック検出の入力になる。
 */
export async function fetchRepoTree(
  fullName: string,
  branch: string,
  token: string | null
): Promise<RepoTree> {
  const res = await fetch(
    `${GITHUB_API}/repos/${fullName}/git/trees/${branch}?recursive=1`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) {
    throw new Error(
      `Failed to fetch tree for ${fullName}@${branch}: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as {
    tree?: Array<{ path: string; type: string; size?: number }>;
    truncated?: boolean;
  };

  const entries: RepoTreeEntry[] = (data.tree ?? []).map((e) => ({
    path: e.path,
    type: e.type as RepoTreeEntry['type'],
    size: e.size,
  }));

  return {
    fullName,
    branch,
    entries,
    truncated: Boolean(data.truncated),
  };
}

/**
 * 直近コミットのメッセージ列を取得（H-b のメッセージ品質・cadence 用）。
 * commits 一覧 API は per-commit の追加/削除行（stats）を含まないので、
 * 粒度・削除率を測りたい場合は別途 fetchCommitStats を併用する。
 */
export async function fetchRecentCommits(
  fullName: string,
  token: string | null,
  max = 100
): Promise<CommitSummary[]> {
  const perPage = Math.min(max, PER_PAGE);
  const res = await fetch(
    `${GITHUB_API}/repos/${fullName}/commits?per_page=${perPage}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) {
    throw new Error(
      `Failed to fetch commits for ${fullName}: ${res.status} ${res.statusText}`
    );
  }
  const data = (await res.json()) as Array<{
    commit?: { message?: string };
  }>;
  return data.map((c) => ({ message: c.commit?.message ?? '' }));
}

/**
 * ツリーから取れない repo メタデータをまとめて取得（背骨ゲート S3/S4 用）。
 * ブランチ保護・PR利用・リリースの有無。どれか1つ落ちても全体は壊さない。
 */
export async function fetchRepoMeta(
  fullName: string,
  defaultBranch: string,
  token: string | null
): Promise<{
  hasBranchProtection: boolean;
  usesPullRequests: boolean;
  hasReleases: boolean;
}> {
  const headers = authHeaders(token);
  const get = async (path: string) => {
    try {
      return await fetch(`${GITHUB_API}/repos/${fullName}/${path}`, {
        headers,
      });
    } catch {
      return null;
    }
  };

  const [branch, pulls, releases] = await Promise.all([
    get(`branches/${defaultBranch}`),
    get('pulls?state=all&per_page=1'),
    get('releases?per_page=1'),
  ]);

  const branchData = branch?.ok
    ? ((await branch.json()) as { protected?: boolean })
    : null;
  const pullsData = pulls?.ok ? ((await pulls.json()) as unknown[]) : [];
  const releasesData = releases?.ok
    ? ((await releases.json()) as unknown[])
    : [];

  return {
    hasBranchProtection: Boolean(branchData?.protected),
    usesPullRequests: Array.isArray(pullsData) && pullsData.length > 0,
    hasReleases: Array.isArray(releasesData) && releasesData.length > 0,
  };
}

/**
 * ファイルの中身をテキストで取得（H-c 設定厳密さ用）。
 * 存在しなければ null。tsconfig.json など少数の key config だけに使う。
 */
export async function fetchFileText(
  fullName: string,
  path: string,
  token: string | null
): Promise<string | null> {
  const res = await fetch(`${GITHUB_API}/repos/${fullName}/contents/${path}`, {
    headers: authHeaders(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${path} of ${fullName}: ${res.status} ${res.statusText}`
    );
  }
  const data = (await res.json()) as { content?: string; encoding?: string };
  if (data.encoding === 'base64' && typeof data.content === 'string') {
    return atob(data.content.replace(/\n/g, ''));
  }
  return null;
}

/**
 * 1コミットの追加/削除行を取得（H-b の粒度・削除率用）。
 * 1コミット1コールと高コストなので、代表repoの直近少数だけサンプリングして使う。
 */
export async function fetchCommitStats(
  fullName: string,
  sha: string,
  token: string | null
): Promise<{ additions: number; deletions: number }> {
  const res = await fetch(`${GITHUB_API}/repos/${fullName}/commits/${sha}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch commit ${sha} of ${fullName}: ${res.status} ${res.statusText}`
    );
  }
  const data = (await res.json()) as {
    stats?: { additions?: number; deletions?: number };
  };
  return {
    additions: data.stats?.additions ?? 0,
    deletions: data.stats?.deletions ?? 0,
  };
}
