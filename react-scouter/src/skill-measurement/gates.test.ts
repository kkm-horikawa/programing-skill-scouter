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

/** 何も実証していないアカウント */
function bareAccount(over: Partial<AccountEvidence> = {}): AccountEvidence {
  return {
    hasProfileReadme: false,
    hasPublishedLibrary: false,
    externalMergedPRs: 0,
    reviewsGiven: 0,
    maxStars: 0,
    libraryDownloads: 0,
    sustainedContribution: false,
    longLivedHighStar: false,
    ...over,
  };
}

describe('evaluateSpineTier - 非補償ラダー', () => {
  it('活動なしは S0', () => {
    expect(evaluateSpineTier([], bareAccount()).tier).toBe('S0');
  });

  it('実コードある repo で S1', () => {
    const r = evaluateSpineTier(
      [bareRepo({ hasRealCode: true })],
      bareAccount()
    );
    expect(r.tier).toBe('S1');
  });

  it('CI∧テスト∧Linter が揃って S2', () => {
    const r = evaluateSpineTier(
      [bareRepo({ hasCI: true, nonTrivialTests: true, hasLinter: true })],
      bareAccount()
    );
    expect(r.tier).toBe('S2');
  });

  it('S2要素が1つでも欠ければ S1 止まり（非補償）', () => {
    const r = evaluateSpineTier(
      [bareRepo({ hasCI: true, nonTrivialTests: true, hasLinter: false })],
      bareAccount()
    );
    expect(r.tier).toBe('S1');
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
    expect(r.tier).toBe('S3');
  });

  it('下の段を飛ばして上の段だけ満たしてもキャップされる（連続性）', () => {
    // S5(公開ライブラリ)はあるが S2 を満たさない → S1 止まり
    const r = evaluateSpineTier(
      [bareRepo({ hasRealCode: true })],
      bareAccount({ hasPublishedLibrary: true, reviewsGiven: 50 })
    );
    expect(r.tier).toBe('S1');
    expect(r.clearedGates).toEqual(['S1']);
  });

  it('S1〜S6 まで連続通過で S6', () => {
    const repo = bareRepo({
      hasCI: true,
      nonTrivialTests: true,
      hasLinter: true,
      usesPullRequests: true,
      hasTaskRunner: true,
      hasReleases: true,
    });
    const account = bareAccount({
      hasProfileReadme: true,
      hasPublishedLibrary: true,
      reviewsGiven: 10,
    });
    expect(evaluateSpineTier([repo], account).tier).toBe('S6');
  });

  it('star単独ルートは閾値未満だと S6 に届かない', () => {
    const repo = bareRepo({
      hasCI: true,
      nonTrivialTests: true,
      hasLinter: true,
      usesPullRequests: true,
      hasTaskRunner: true,
      hasReleases: true,
    });
    const account = bareAccount({
      hasProfileReadme: true,
      hasPublishedLibrary: true,
      maxStars: 5,
    });
    expect(evaluateSpineTier([repo], account).tier).toBe('S5');
  });
});

describe('evaluateSpineTier - 降格キャップ', () => {
  it('見せrepoでS2通過しても、本命の規模あるrepoが軒並みCI0テスト0なら S1', () => {
    const showcase = bareRepo({
      fullName: 'octocat/showcase',
      hasCI: true,
      nonTrivialTests: true,
      hasLinter: true,
      isSubstantial: false,
    });
    const slop = bareRepo({
      fullName: 'octocat/big-slop',
      isSubstantial: true,
      hasCI: false,
      nonTrivialTests: false,
    });
    const r = evaluateSpineTier([showcase, slop], bareAccount());
    expect(r.tier).toBe('S1');
    expect(r.cappedBy).toMatch(/規律/);
  });

  it('コミットがスロップ的（巨大ダンプ＋定型）な規模repoだけならキャップ', () => {
    const showcase = bareRepo({
      hasCI: true,
      nonTrivialTests: true,
      hasLinter: true,
    });
    const commitSlop = bareRepo({
      isSubstantial: true,
      hasCI: true, // CIはあるがコミットがスロップ
      nonTrivialTests: true,
      commitSlop: true,
    });
    const r = evaluateSpineTier([showcase, commitSlop], bareAccount());
    expect(r.tier).toBe('S1');
  });

  it('規模あるrepoの1つでも規律があればキャップしない', () => {
    const goodBig = bareRepo({
      isSubstantial: true,
      hasCI: true,
      nonTrivialTests: true,
      hasLinter: true,
    });
    const r = evaluateSpineTier([goodBig], bareAccount());
    expect(r.tier).toBe('S2');
    expect(r.cappedBy).toBeUndefined();
  });
});
