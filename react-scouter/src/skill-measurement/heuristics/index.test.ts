import { describe, expect, it } from 'vitest';
import { makeTree } from '../fixtures';
import { craftMetrics } from './index';

describe('craftMetrics', () => {
  it('構造とコミット振る舞いを合成する', () => {
    const tree = makeTree([
      'src/a.ts:1000',
      'src/b.ts:1000',
      'src/a.test.ts:1000',
      'src/b.test.ts:1000',
    ]);
    const m = craftMetrics(tree, [
      { message: 'feat: x', additions: 100, deletions: 40 },
      { message: 'refactor: y', additions: 50, deletions: 60 },
    ]);
    expect(m.craftScore).toBeGreaterThan(0);
    expect(m.structure.score).toBeGreaterThan(0);
    expect(m.commits.count).toBe(2);
  });

  it('コミットが無ければ構造のみで評価する', () => {
    const tree = makeTree(['src/a.ts:1000', 'src/a.test.ts:1000']);
    const m = craftMetrics(tree, []);
    expect(m.craftScore).toBe(m.structure.score);
  });
});
