import { describe, expect, it } from 'vitest';
import { makeTree } from '../fixtures';
import { ALL_BADGES, evaluateBadges } from './index';
import type { BadgeContext, RepoBadgeMeta } from './types';

const NO_META: RepoBadgeMeta = {
  hasBranchProtection: false,
  hasSignedCommits: false,
  usesPullRequests: false,
};

function ctx(paths: string[], meta: Partial<RepoBadgeMeta> = {}): BadgeContext {
  return { tree: makeTree(paths), meta: { ...NO_META, ...meta } };
}

describe('ALL_BADGES', () => {
  it('IDが一意（グループ間の衝突なし）', () => {
    const ids = ALL_BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('6グループすべてが登録されている', () => {
    const groups = new Set(ALL_BADGES.map((b) => b.group));
    expect(groups).toEqual(
      new Set(['G-Git', 'G-Quality', 'G-Test', 'G-CI', 'G-Build', 'G-Security'])
    );
  });
});

describe('evaluateBadges', () => {
  it('空サンプルでは fill 0・獲得なし', () => {
    const r = evaluateBadges([]);
    expect(r.earned.size).toBe(0);
    expect(r.fill).toBe(0);
  });

  it('検出した設定ファイルのバッジを獲得する', () => {
    const r = evaluateBadges([
      ctx(['eslint.config.js', '.editorconfig', 'tsconfig.json']),
    ]);
    expect(r.earned.has('quality.eslint')).toBe(true);
    expect(r.earned.has('quality.editorconfig')).toBe(true);
    expect(r.earned.has('quality.ts-config')).toBe(true);
    expect(r.byGroup['G-Quality'].earned).toBeGreaterThanOrEqual(3);
    expect(r.fill).toBeGreaterThan(0);
  });

  it('meta フラグ由来のバッジを獲得する', () => {
    const r = evaluateBadges([ctx([], { hasBranchProtection: true })]);
    expect(r.earned.has('git.branch-protection')).toBe(true);
  });

  it('いずれかのrepoが満たせば獲得（サンプル横断）', () => {
    const r = evaluateBadges([
      ctx(['README.md']),
      ctx(['.github/workflows/ci.yml']),
    ]);
    expect(r.earned.has('ci.workflows')).toBe(true);
  });

  it('byGroup の total が各グループのバッジ数と一致', () => {
    const r = evaluateBadges([]);
    const totalFromGroups = Object.values(r.byGroup).reduce(
      (s, g) => s + g.total,
      0
    );
    expect(totalFromGroups).toBe(ALL_BADGES.length);
  });
});
