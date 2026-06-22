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
    externalMergedPRs: 0,
    reviewsGiven: 0,
    maxStars: 0,
    followers: 0,
    totalForks: 0,
    libraryDownloads: 0,
    sustainedContribution: false,
    longLivedHighStar: false,
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

  it('S2要素が1つでも欠ければ craft は S1 止まり（非補償）', () => {
    const r = evaluateSpineTier(
      [bareRepo({ hasCI: true, nonTrivialTests: true, hasLinter: false })],
      bareAccount()
    );
    expect(r.craftTier).toBe('S1');
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

describe('reach 軸（外部からの採用。検出器に依存しない）', () => {
  it('規律ツールが一切無くても、star が桁外れなら S7（torvalds 問題）', () => {
    // CI も Linter も検出できない（Cカーネル等）が star 18万
    const r = evaluateSpineTier(
      [bareRepo()],
      bareAccount({ maxStars: 180000 })
    );
    expect(r.craftTier).toBe('S1');
    expect(r.reachTier).toBe('S7');
    expect(r.tier).toBe('S7');
  });

  it('フォロワーが多ければ reach で上がる', () => {
    const r = evaluateSpineTier(
      [bareRepo()],
      bareAccount({ followers: 12000 })
    );
    expect(r.tier).toBe('S7');
  });

  it('craft と reach の高い方を採る', () => {
    const repo = bareRepo({
      hasCI: true,
      nonTrivialTests: true,
      hasLinter: true,
    });
    const r = evaluateSpineTier([repo], bareAccount({ maxStars: 1200 }));
    // craft S2 vs reach S5(stars>=1000) → S5
    expect(r.craftTier).toBe('S2');
    expect(r.reachTier).toBe('S5');
    expect(r.tier).toBe('S5');
  });

  it('star も follower も乏しいバイブコーダーは両軸とも低い', () => {
    const r = evaluateSpineTier(
      [bareRepo({ hasRealCode: true })],
      bareAccount({ maxStars: 2, followers: 3 })
    );
    expect(r.tier).toBe('S1');
  });
});

describe('降格キャップ', () => {
  it('見せrepoでS2通過しても、本命の規模repoがスロップで reach も無ければ S1', () => {
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

  it('降格対象でも reach が高ければ救われる（cappedBy は出ない）', () => {
    const slop = bareRepo({
      isSubstantial: true,
      hasCI: false,
      nonTrivialTests: false,
    });
    const r = evaluateSpineTier([slop], bareAccount({ maxStars: 50000 }));
    expect(r.tier).toBe('S7');
    expect(r.cappedBy).toBeUndefined();
  });
});
