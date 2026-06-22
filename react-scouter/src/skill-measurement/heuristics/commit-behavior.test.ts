import { describe, expect, it } from 'vitest';
import { commitBehavior, type CommitSummary } from './commit-behavior';

describe('commitBehavior', () => {
  it('コミットが無ければ score 0', () => {
    expect(commitBehavior([]).score).toBe(0);
  });

  it('Conventional Commits の割合を出す', () => {
    const commits: CommitSummary[] = [
      { message: 'feat: add sampling' },
      { message: 'fix(api): handle 404' },
      { message: 'random change' },
      { message: 'docs: update readme' },
    ];
    expect(commitBehavior(commits).conventionalRate).toBe(0.75);
  });

  it('定型・空メッセージを slop として数える', () => {
    const commits: CommitSummary[] = [
      { message: 'update' },
      { message: 'fix' },
      { message: 'wip' },
      { message: 'feat: real work' },
    ];
    expect(commitBehavior(commits).genericRate).toBe(0.75);
  });

  it('削除をともなう整理は refactor として評価、純増一辺倒より高い', () => {
    const refactored = commitBehavior([
      { message: 'refactor: split module', additions: 100, deletions: 80 },
      { message: 'feat: x', additions: 50, deletions: 40 },
    ]);
    const additiveOnly = commitBehavior([
      { message: 'feat: x', additions: 200, deletions: 0 },
      { message: 'feat: y', additions: 200, deletions: 0 },
    ]);
    expect(refactored.deletionShare).toBeGreaterThan(
      additiveOnly.deletionShare
    );
    expect(refactored.score).toBeGreaterThan(additiveOnly.score);
  });

  it('巨大ダンプを検出する', () => {
    const m = commitBehavior([
      { message: 'feat: huge', additions: 5000, deletions: 0 },
      { message: 'fix: small', additions: 10, deletions: 5 },
    ]);
    expect(m.giantDumpRate).toBe(0.5);
  });

  it('スロップ（巨大ダンプ＋定型メッセージ＋純増）は craft（atomic＋conventional＋削除あり）より低い', () => {
    const slop = commitBehavior([
      { message: 'update', additions: 3000, deletions: 0 },
      { message: 'changes', additions: 2500, deletions: 0 },
      { message: 'wip', additions: 4000, deletions: 0 },
    ]);
    const craft = commitBehavior([
      { message: 'feat: add gate ladder', additions: 120, deletions: 30 },
      { message: 'refactor: extract detector', additions: 80, deletions: 90 },
      { message: 'test: cover edge cases', additions: 60, deletions: 10 },
    ]);
    expect(craft.score).toBeGreaterThan(slop.score);
  });
});
