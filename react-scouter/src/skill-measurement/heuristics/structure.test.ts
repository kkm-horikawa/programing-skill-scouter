import { describe, expect, it } from 'vitest';
import { makeTree } from '../fixtures';
import { structureMetrics } from './structure';

describe('structureMetrics', () => {
  it('ソースが無ければ score 0', () => {
    const m = structureMetrics(makeTree(['README.md', 'docs/intro.md']));
    expect(m.sourceFiles).toBe(0);
    expect(m.score).toBe(0);
  });

  it('テストとソースの比を出す', () => {
    const m = structureMetrics(
      makeTree([
        'src/a.ts:1000',
        'src/b.ts:1000',
        'src/a.test.ts:500',
        'tests/integration_test.go:500',
      ])
    );
    expect(m.sourceFiles).toBe(2);
    expect(m.testFiles).toBe(2);
    expect(m.testRatio).toBe(1);
  });

  it('神ファイル（巨大単一ファイル）を検出して減点する', () => {
    const healthy = structureMetrics(
      makeTree(['src/a.ts:2000', 'src/b.ts:2000', 'src/a.test.ts:1000'])
    );
    const godFile = structureMetrics(
      makeTree(['src/god.ts:120000', 'src/a.test.ts:1000'])
    );
    expect(godFile.godFileRatio).toBeGreaterThan(0);
    expect(godFile.score).toBeLessThan(healthy.score);
  });

  it('テストが厚いほど構造点が高い', () => {
    const noTest = structureMetrics(
      makeTree(['src/a.ts:1000', 'src/b.ts:1000'])
    );
    const tested = structureMetrics(
      makeTree([
        'src/a.ts:1000',
        'src/b.ts:1000',
        'src/a.test.ts:1000',
        'src/b.test.ts:1000',
      ])
    );
    expect(tested.score).toBeGreaterThan(noTest.score);
  });
});
