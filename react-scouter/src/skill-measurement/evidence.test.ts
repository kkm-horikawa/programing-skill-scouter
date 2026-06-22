import { describe, expect, it } from 'vitest';
import { buildRepoEvidence } from './evidence';
import { makeRepo, makeTree } from './fixtures';

const NOW = Date.parse('2024-06-01T00:00:00Z');

describe('buildRepoEvidence', () => {
  it('ツリーとメタデータから実証痕跡を組み立てる', () => {
    const repo = makeRepo({
      full_name: 'octocat/lib',
      size: 800,
      created_at: '2023-01-01T00:00:00Z',
    });
    const tree = makeTree([
      '.github/workflows/ci.yml',
      'src/index.ts',
      'src/index.test.ts',
      'tests/e2e.test.ts',
      'biome.json',
      'lefthook.yml',
    ]);
    const evidence = buildRepoEvidence(
      repo,
      tree,
      { hasBranchProtection: true, usesPullRequests: true, hasReleases: false },
      NOW
    );

    expect(evidence).toMatchObject({
      fullName: 'octocat/lib',
      hasRealCode: true,
      isSubstantial: true,
      hasCI: true,
      nonTrivialTests: true,
      hasLinter: true,
      hasGitHooks: true,
      hasBranchProtection: true,
      usesPullRequests: true,
      hasReleases: false,
    });
  });

  it('小さい/新しい repo は hasRealCode/isSubstantial が false', () => {
    const repo = makeRepo({
      full_name: 'octocat/toy',
      size: 10,
      created_at: '2024-05-01T00:00:00Z',
    });
    const evidence = buildRepoEvidence(
      repo,
      makeTree(['index.js']),
      {
        hasBranchProtection: false,
        usesPullRequests: false,
        hasReleases: false,
      },
      NOW
    );
    expect(evidence.hasRealCode).toBe(false);
    expect(evidence.isSubstantial).toBe(false);
  });

  it('テストファイル1個だけでは非自明テスト扱いしない', () => {
    const repo = makeRepo({ full_name: 'octocat/x', size: 100 });
    const evidence = buildRepoEvidence(
      repo,
      makeTree(['src/index.ts', 'src/index.test.ts']),
      {
        hasBranchProtection: false,
        usesPullRequests: false,
        hasReleases: false,
      },
      NOW
    );
    expect(evidence.nonTrivialTests).toBe(false);
  });
});
