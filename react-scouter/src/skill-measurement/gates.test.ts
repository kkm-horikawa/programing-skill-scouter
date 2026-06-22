import { describe, expect, it } from 'vitest';
import {
  evaluateSpineTier,
  type AccountEvidence,
  type RepoEvidence,
} from './gates';

/** 何も実証していない repo（全 false） */
function bareRepo(over: Partial<RepoEvidence> = {}): RepoEvidence {
  return {
    fullName: 'octocat/repo',
    hasRealCode: true,
    isSubstantial: false,
    hasCI: false,
    nonTrivialTests: false,
    hasLinter: false,
    hasGitHooks: false,
    hasTaskRunner: false,
    hasBranchProtection: false,
    usesPullRequests: false,
    hasReleases: false,
    isContainerized: false,
    hasDocsSite: false,
    ...over,
  };
}

/** 何も実証していないアカウント（reach 信号もゼロ） */
function bareAccount(over: Partial<AccountEvidence> = {}): AccountEvidence {
  return {
    hasProfileReadme: false,
    hasPublishedLibrary: false,
    maxStars: 0,
    followers: 0,
    totalForks: 0,
    ...over,
  };
}

describe('craft 軸（規律の連続ラダー）', () => {
  it('活動なしは S0', () => {
    expect(evaluateSpineTier([], bareAccount()).tier).toBe('S0');
  });

  it('実コードある repo で S1', () => {
    expect(evaluateSpineTier([bareRepo()], bareAccount()).tier).toBe('S1');
  });

  it('CI∧テスト∧Linter が揃って S2', () => {
    const r = evaluateSpineTier(
      [bareRepo({ hasCI: true, nonTrivialTests: true, hasLinter: true })],
      bareAccount()
    );
    expect(r.craftTier).toBe('S2');
  });

  it('CI・テスト・Linter がどこにも無ければ S1 止まり（非補償）', () => {
    const r = evaluateSpineTier(
      [bareRepo({ hasCI: true, nonTrivialTests: true, hasLinter: false })],
      bareAccount()
    );
    expect(r.craftTier).toBe('S1');
  });

  it('別々のrepoに分散していても、サンプル全体で3つ揃えば S2', () => {
    const r = evaluateSpineTier(
      [
        bareRepo({ fullName: 'u/a', hasCI: true, nonTrivialTests: true }),
        bareRepo({ fullName: 'u/b', hasLinter: true }),
      ],
      bareAccount()
    );
    expect(r.craftTier).toBe('S2');
  });

  it('規律＋プロフィールREADME で S3', () => {
    const repo = bareRepo({
      hasCI: true,
      nonTrivialTests: true,
      hasLinter: true,
      usesPullRequests: true,
      hasGitHooks: true,
    });
    const r = evaluateSpineTier(
      [repo],
      bareAccount({ hasProfileReadme: true })
    );
    expect(r.craftTier).toBe('S3');
  });

  it('公開ライブラリ単独では、下の craft 段が無ければ craft は上がらない（非補償）', () => {
    // S5 craft 要件(公開ライブラリ)はあるが S2 を満たさず、reach 信号も無い
    const r = evaluateSpineTier(
      [bareRepo()],
      bareAccount({ hasPublishedLibrary: true })
    );
    expect(r.craftTier).toBe('S1');
    expect(r.tier).toBe('S1');
  });
});

describe('reach は階級に影響しない（人気は技術力ではない）', () => {
  it('star が桁外れでも、craft が低ければ階級は低いまま', () => {
    // torvalds 問題: star 18万でも階級は craft 由来（戦闘力は score 側で青天井加算）
    const r = evaluateSpineTier(
      [bareRepo()],
      bareAccount({ maxStars: 180000 })
    );
    expect(r.tier).toBe('S1');
    expect(r.craftTier).toBe('S1');
  });

  it('フォロワーが多くても階級は上がらない', () => {
    const r = evaluateSpineTier(
      [bareRepo()],
      bareAccount({ followers: 12000 })
    );
    expect(r.tier).toBe('S1');
  });

  it('埋もれた実力者: star が無くても craft で正当に評価される', () => {
    const repo = bareRepo({
      hasCI: true,
      nonTrivialTests: true,
      hasLinter: true,
    });
    const r = evaluateSpineTier([repo], bareAccount({ maxStars: 0 }));
    expect(r.tier).toBe('S2');
  });
});

describe('降格キャップ', () => {
  it('見せrepoでS2通過しても、本命の規模repoがスロップなら S1', () => {
    const showcase = bareRepo({
      hasCI: true,
      nonTrivialTests: true,
      hasLinter: true,
      isSubstantial: false,
    });
    const slop = bareRepo({
      isSubstantial: true,
      hasCI: false,
      nonTrivialTests: false,
    });
    const r = evaluateSpineTier([showcase, slop], bareAccount());
    expect(r.tier).toBe('S1');
    expect(r.cappedBy).toMatch(/規律/);
  });

  it('star が多くても階級の降格は救われない（reach は階級に効かない）', () => {
    const slop = bareRepo({
      isSubstantial: true,
      hasCI: false,
      nonTrivialTests: false,
    });
    const r = evaluateSpineTier([slop], bareAccount({ maxStars: 50000 }));
    expect(r.tier).toBe('S1');
  });
});
