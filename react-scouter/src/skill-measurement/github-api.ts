import type { GitHubRepo } from '../types/github';
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
