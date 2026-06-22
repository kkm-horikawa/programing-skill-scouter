import type { GitHubRepo } from '../types/github';
import type { RepoTree, RepoTreeEntry } from './types';

/**
 * GitHub `/user/repos` のレスポンス形に沿った well-formed な repo を組み立てるファクトリ。
 * テスト用。実 API のスキーマ（types/github.ts）に一致させてある。
 */
export function makeRepo(
  overrides: Partial<GitHubRepo> & Pick<GitHubRepo, 'full_name'>
): GitHubRepo {
  const name = overrides.full_name.split('/').pop() ?? overrides.full_name;
  return {
    id: 1,
    name,
    private: false,
    owner: { login: 'octocat', id: 1, avatar_url: '' },
    html_url: `https://github.com/${overrides.full_name}`,
    description: null,
    fork: false,
    url: `https://api.github.com/repos/${overrides.full_name}`,
    languages_url: `https://api.github.com/repos/${overrides.full_name}/languages`,
    stargazers_count: 0,
    watchers_count: 0,
    forks_count: 0,
    open_issues_count: 0,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    pushed_at: '2024-01-01T00:00:00Z',
    language: null,
    size: 1000,
    ...overrides,
  };
}

/**
 * パス列から RepoTree を組み立てる。`dir/` で終わるパスは tree、それ以外は blob。
 * blob には任意のサイズを与えられる（`path:size` 形式）。
 */
export function makeTree(
  paths: string[],
  opts: { truncated?: boolean } = {}
): RepoTree {
  const entries: RepoTreeEntry[] = paths.map((raw) => {
    const [path, sizeStr] = raw.split(':');
    if (path.endsWith('/')) {
      return { path: path.slice(0, -1), type: 'tree' };
    }
    return {
      path,
      type: 'blob',
      size: sizeStr ? Number(sizeStr) : 1,
    };
  });
  return {
    fullName: 'octocat/repo',
    branch: 'main',
    entries,
    truncated: opts.truncated ?? false,
  };
}
