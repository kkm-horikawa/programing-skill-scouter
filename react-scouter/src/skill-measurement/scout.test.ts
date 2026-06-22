import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeRepo, makeTree } from './fixtures';
import type { AccountEvidence } from './gates';
import { assembleScoutResult, scoutDeep, type RepoData } from './scout';

const NOW = Date.parse('2024-06-01T00:00:00Z');

function bareAccount(over: Partial<AccountEvidence> = {}): AccountEvidence {
  return {
    hasProfileReadme: false,
    hasPublishedLibrary: false,
    maxStars: 0,
    followers: 0,
    totalForks: 0,
    externalAuthoredPRs: 0,
    reviewsGiven: 0,
    ...over,
  };
}

/** 規律の整った craft repo の RepoData */
function craftRepo(): RepoData {
  return {
    repo: makeRepo({
      full_name: 'octocat/craft',
      size: 800,
      created_at: '2023-01-01T00:00:00Z',
    }),
    tree: makeTree([
      '.github/workflows/ci.yml',
      'biome.json',
      'lefthook.yml',
      'tsconfig.json',
      'src/a.ts:2000',
      'src/b.ts:2000',
      'src/a.test.ts:1500',
      'src/b.test.ts:1500',
    ]),
    commits: [
      { message: 'feat: add gate ladder', additions: 120, deletions: 30 },
      { message: 'refactor: extract detector', additions: 80, deletions: 90 },
    ],
    configFiles: {
      'tsconfig.json':
        '{ "compilerOptions": { "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true } }',
    },
    meta: {
      hasBranchProtection: true,
      usesPullRequests: true,
      hasReleases: false,
    },
  };
}

/** 規模はあるが規律ゼロ・スロップなコミットの repo */
function slopRepo(): RepoData {
  return {
    repo: makeRepo({
      full_name: 'octocat/slop',
      size: 3000,
      created_at: '2022-01-01T00:00:00Z',
    }),
    tree: makeTree(['main.py:400000']),
    commits: [
      { message: 'update', additions: 3000, deletions: 0 },
      { message: 'changes', additions: 2500, deletions: 0 },
      { message: 'wip', additions: 4000, deletions: 0 },
    ],
    configFiles: {},
    meta: {
      hasBranchProtection: false,
      usesPullRequests: false,
      hasReleases: false,
    },
  };
}

describe('assembleScoutResult', () => {
  it('空サンプルは S0・power 0', () => {
    const r = assembleScoutResult([], bareAccount(), NOW);
    expect(r.spine.tier).toBe('S0');
    expect(r.score.power).toBe(0);
  });

  it('規律の整った repo は中級以上に到達する', () => {
    const r = assembleScoutResult(
      [craftRepo()],
      bareAccount({ hasProfileReadme: true }),
      NOW
    );
    // CI∧テスト∧Linter で S2、PR駆動∧hooks＋README で S3
    expect(['S2', 'S3']).toContain(r.spine.tier);
    expect(r.score.power).toBeGreaterThan(10_000);
  });

  it('スロップ repo だけなら降格キャップで S1 に張り付く', () => {
    const r = assembleScoutResult([slopRepo()], bareAccount(), NOW);
    expect(r.spine.tier).toBe('S1');
  });

  it('craft repo はスロップ repo より戦闘力が高い', () => {
    const craft = assembleScoutResult(
      [craftRepo()],
      bareAccount({ hasProfileReadme: true }),
      NOW
    );
    const slop = assembleScoutResult([slopRepo()], bareAccount(), NOW);
    expect(craft.score.power).toBeGreaterThan(slop.score.power);
  });

  it('小さな見せrepoでS2通過しても、本命の規模repoがスロップなら降格する', () => {
    // 見せ repo は小さく(非substantial)規律だけ整える＝ゲーミング
    const showcase: RepoData = {
      ...craftRepo(),
      repo: makeRepo({
        full_name: 'octocat/showcase',
        size: 80,
        created_at: '2024-05-01T00:00:00Z',
      }),
    };
    const r = assembleScoutResult(
      [showcase, slopRepo()],
      bareAccount({ hasProfileReadme: true }),
      NOW
    );
    expect(r.spine.tier).toBe('S1');
    expect(r.spine.cappedBy).toBeDefined();
  });
});

describe('scoutDeep (I/O glue smoke)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('取得〜組み立てを通して ScoutResult を返す', async () => {
    const repos = [
      {
        id: 1,
        name: 'app',
        full_name: 'octocat/app',
        private: false,
        fork: false,
        owner: { login: 'octocat', id: 1, avatar_url: '' },
        html_url: '',
        description: null,
        url: '',
        languages_url: '',
        stargazers_count: 3,
        watchers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-05-01T00:00:00Z',
        pushed_at: '2024-05-01T00:00:00Z',
        language: 'TypeScript',
        size: 800,
        default_branch: 'main',
      },
    ];

    const json = (body: unknown, ok = true, status = 200) =>
      ({
        ok,
        status,
        statusText: ok ? 'OK' : 'ERR',
        json: async () => body,
      }) as Response;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/user/repos')) return json(repos);
        if (url.endsWith('/user')) return json({ login: 'octocat' });
        if (url.includes('/git/trees/'))
          return json({
            tree: [
              { path: '.github/workflows/ci.yml', type: 'blob' },
              { path: 'src/a.ts', type: 'blob', size: 2000 },
              { path: 'src/a.test.ts', type: 'blob', size: 1000 },
              { path: 'src/b.test.ts', type: 'blob', size: 1000 },
              { path: 'biome.json', type: 'blob' },
            ],
            truncated: false,
          });
        if (url.includes('/commits'))
          return json([{ commit: { message: 'feat: x' } }]);
        if (url.includes('/branches/')) return json({ protected: false });
        if (url.includes('/pulls')) return json([]);
        if (url.includes('/releases')) return json([]);
        if (url.includes('/contents/tsconfig.json'))
          return json({
            encoding: 'base64',
            content: btoa('{"compilerOptions":{"strict":true}}'),
          });
        if (url.includes('/contents/')) return json({}, false, 404);
        return json({}, false, 404);
      })
    );

    const result = await scoutDeep('ghp_x');

    // CI∧テスト∧Linter で S2 に到達（PR駆動/hooks が無いので S3 未満）
    expect(result.spine.tier).toBe('S2');
    expect(result.score.power).toBeGreaterThan(10_000);
    expect(Number.isFinite(result.score.power)).toBe(true);
  });
});
