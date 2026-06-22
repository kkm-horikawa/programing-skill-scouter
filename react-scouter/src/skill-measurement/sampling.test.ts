import { describe, expect, it } from 'vitest';
import { makeRepo } from './fixtures';
import { representativeness, selectRepresentativeRepos } from './sampling';
import type { SamplingPolicy } from './types';

/** テストを決定的にするための固定「現在時刻」 */
const NOW = Date.parse('2024-06-01T00:00:00Z');

const policy = (over: Partial<SamplingPolicy> = {}): SamplingPolicy => ({
  maxPrivate: 2,
  maxPublic: 5,
  pinnedFullNames: [],
  ...over,
});

describe('representativeness', () => {
  it('最近 push された repo ほど高い', () => {
    const fresh = makeRepo({
      full_name: 'octocat/fresh',
      pushed_at: '2024-05-30T00:00:00Z',
    });
    const stale = makeRepo({
      full_name: 'octocat/stale',
      pushed_at: '2021-01-01T00:00:00Z',
    });
    expect(representativeness(fresh, NOW)).toBeGreaterThan(
      representativeness(stale, NOW)
    );
  });

  it('コード量（size）が大きいほど高い', () => {
    const big = makeRepo({ full_name: 'octocat/big', size: 500000 });
    const toy = makeRepo({ full_name: 'octocat/toy', size: 10 });
    expect(representativeness(big, NOW)).toBeGreaterThan(
      representativeness(toy, NOW)
    );
  });

  it('public は star で加点されるが private は star を見ない', () => {
    const base = { full_name: 'octocat/x', stargazers_count: 5000 } as const;
    const publicRepo = makeRepo({ ...base, private: false });
    const privateRepo = makeRepo({
      ...base,
      full_name: 'octocat/y',
      private: true,
    });
    expect(representativeness(publicRepo, NOW)).toBeGreaterThan(
      representativeness(privateRepo, NOW)
    );
  });
});

describe('selectRepresentativeRepos', () => {
  it('fork を除外する', () => {
    const repos = [
      makeRepo({ full_name: 'octocat/own', fork: false }),
      makeRepo({ full_name: 'octocat/forked', fork: true }),
    ];
    const selected = selectRepresentativeRepos(repos, policy(), NOW);
    expect(selected.map((s) => s.repo.full_name)).toEqual(['octocat/own']);
  });

  it('private は maxPrivate、public は maxPublic までに絞る', () => {
    const repos = [
      ...Array.from({ length: 4 }, (_, i) =>
        makeRepo({ full_name: `octocat/priv-${i}`, private: true })
      ),
      ...Array.from({ length: 8 }, (_, i) =>
        makeRepo({ full_name: `octocat/pub-${i}`, private: false })
      ),
    ];
    const selected = selectRepresentativeRepos(
      repos,
      policy({ maxPrivate: 2, maxPublic: 5 }),
      NOW
    );
    expect(selected.filter((s) => s.visibility === 'private')).toHaveLength(2);
    expect(selected.filter((s) => s.visibility === 'public')).toHaveLength(5);
  });

  it('代表性スコアの高い順に採る', () => {
    const repos = [
      makeRepo({
        full_name: 'octocat/old',
        private: true,
        pushed_at: '2021-01-01T00:00:00Z',
      }),
      makeRepo({
        full_name: 'octocat/recent',
        private: true,
        pushed_at: '2024-05-30T00:00:00Z',
      }),
    ];
    const selected = selectRepresentativeRepos(
      repos,
      policy({ maxPrivate: 1 }),
      NOW
    );
    expect(selected).toHaveLength(1);
    expect(selected[0].repo.full_name).toBe('octocat/recent');
  });

  it('ピン留めは必ず含め、fork でも採用する', () => {
    const repos = [
      makeRepo({ full_name: 'octocat/pinned-fork', fork: true }),
      makeRepo({ full_name: 'octocat/auto', fork: false }),
    ];
    const selected = selectRepresentativeRepos(
      repos,
      policy({ pinnedFullNames: ['octocat/pinned-fork'] }),
      NOW
    );
    const pinned = selected.find(
      (s) => s.repo.full_name === 'octocat/pinned-fork'
    );
    expect(pinned).toBeDefined();
    expect(pinned?.pinned).toBe(true);
  });

  it('ピン留めが自動枠を消費する', () => {
    const repos = [
      makeRepo({
        full_name: 'octocat/pin',
        private: false,
        size: 1,
        pushed_at: '2020-01-01T00:00:00Z',
      }),
      makeRepo({ full_name: 'octocat/big', private: false, size: 999999 }),
    ];
    const selected = selectRepresentativeRepos(
      repos,
      policy({ maxPublic: 1, pinnedFullNames: ['octocat/pin'] }),
      NOW
    );
    // 枠1をピンが消費するので、スコアの高い big は入らない
    expect(selected.map((s) => s.repo.full_name)).toEqual(['octocat/pin']);
  });

  it('存在しない full_name のピンは無視する', () => {
    const repos = [makeRepo({ full_name: 'octocat/real' })];
    const selected = selectRepresentativeRepos(
      repos,
      policy({ pinnedFullNames: ['octocat/ghost'] }),
      NOW
    );
    expect(selected.map((s) => s.repo.full_name)).toEqual(['octocat/real']);
  });

  it('空入力では空を返す', () => {
    expect(selectRepresentativeRepos([], policy(), NOW)).toEqual([]);
  });
});
