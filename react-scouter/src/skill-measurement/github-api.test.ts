import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authHeaders,
  fetchCommitStats,
  fetchFileText,
  fetchOwnedRepos,
  fetchRecentCommits,
  fetchRepoTree,
} from './github-api';

/** I/O 境界（fetch）だけをモックする。GitHub の実レスポンス形に沿った fixture を返す。 */
function mockFetch(
  responder: (url: string) => { ok: boolean; status?: number; body: unknown }
) {
  const fn = vi.fn(async (input: string) => {
    const { ok, status = 200, body } = responder(input);
    return {
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: async () => body,
    } as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authHeaders', () => {
  it('トークンなしでは Accept のみ', () => {
    expect(authHeaders(null)).toEqual({
      Accept: 'application/vnd.github+json',
    });
  });

  it('fine-grained PAT は Bearer', () => {
    expect(authHeaders('github_pat_abc').Authorization).toBe(
      'Bearer github_pat_abc'
    );
  });

  it('classic PAT は token', () => {
    expect(authHeaders('ghp_abc').Authorization).toBe('token ghp_abc');
  });
});

describe('fetchRepoTree', () => {
  it('tree を path/type/size に正規化し truncated を拾う', async () => {
    mockFetch(() => ({
      ok: true,
      body: {
        sha: 'abc',
        tree: [
          { path: 'src/index.ts', mode: '100644', type: 'blob', size: 120 },
          { path: 'src', mode: '040000', type: 'tree' },
        ],
        truncated: true,
      },
    }));

    const tree = await fetchRepoTree('octocat/repo', 'main', 'ghp_x');

    expect(tree.fullName).toBe('octocat/repo');
    expect(tree.truncated).toBe(true);
    expect(tree.entries).toEqual([
      { path: 'src/index.ts', type: 'blob', size: 120 },
      { path: 'src', type: 'tree', size: undefined },
    ]);
  });

  it('非 OK レスポンスで例外を投げる（境界の fail fast）', async () => {
    mockFetch(() => ({ ok: false, status: 404, body: {} }));
    await expect(
      fetchRepoTree('octocat/missing', 'main', null)
    ).rejects.toThrow(/404/);
  });
});

describe('fetchOwnedRepos', () => {
  it('100件未満になるまでページングして連結する', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      full_name: `octocat/r${i}`,
    }));
    const page2 = [{ full_name: 'octocat/last' }];
    const fetchFn = mockFetch((url) => ({
      ok: true,
      body: url.includes('page=1&') ? page1 : page2,
    }));

    const repos = await fetchOwnedRepos('ghp_x');

    expect(repos).toHaveLength(101);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('非 OK レスポンスで例外を投げる', async () => {
    mockFetch(() => ({ ok: false, status: 401, body: {} }));
    await expect(fetchOwnedRepos('ghp_bad')).rejects.toThrow(/401/);
  });
});

describe('fetchRecentCommits', () => {
  it('コミットメッセージを抽出する', async () => {
    mockFetch(() => ({
      ok: true,
      body: [
        { sha: 'a', commit: { message: 'feat: x' } },
        { sha: 'b', commit: { message: 'fix: y' } },
      ],
    }));
    const commits = await fetchRecentCommits('octocat/repo', 'ghp_x');
    expect(commits).toEqual([{ message: 'feat: x' }, { message: 'fix: y' }]);
  });

  it('非 OK で例外を投げる', async () => {
    mockFetch(() => ({ ok: false, status: 409, body: {} }));
    await expect(fetchRecentCommits('octocat/empty', null)).rejects.toThrow(
      /409/
    );
  });
});

describe('fetchCommitStats', () => {
  it('追加/削除行を取り出す', async () => {
    mockFetch(() => ({
      ok: true,
      body: { stats: { additions: 120, deletions: 30 } },
    }));
    const stats = await fetchCommitStats('octocat/repo', 'abc', 'ghp_x');
    expect(stats).toEqual({ additions: 120, deletions: 30 });
  });

  it('stats 欠落時は 0 を返す', async () => {
    mockFetch(() => ({ ok: true, body: {} }));
    const stats = await fetchCommitStats('octocat/repo', 'abc', null);
    expect(stats).toEqual({ additions: 0, deletions: 0 });
  });
});

describe('fetchFileText', () => {
  it('base64 の中身をデコードして返す', async () => {
    const content = '{ "compilerOptions": { "strict": true } }';
    mockFetch(() => ({
      ok: true,
      body: { encoding: 'base64', content: btoa(content) },
    }));
    const text = await fetchFileText('octocat/repo', 'tsconfig.json', 'ghp_x');
    expect(text).toBe(content);
  });

  it('404 は null を返す（存在しないだけは例外にしない）', async () => {
    mockFetch(() => ({ ok: false, status: 404, body: {} }));
    const text = await fetchFileText('octocat/repo', 'mypy.ini', null);
    expect(text).toBeNull();
  });

  it('404 以外の非 OK は例外を投げる', async () => {
    mockFetch(() => ({ ok: false, status: 500, body: {} }));
    await expect(
      fetchFileText('octocat/repo', 'tsconfig.json', null)
    ).rejects.toThrow(/500/);
  });
});
