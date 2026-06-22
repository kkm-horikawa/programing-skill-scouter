import type { GitHubRepo } from '../types/github';

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
