import { describe, expect, it } from 'vitest';
import { ciBadges } from './g-ci';
import type { BadgeContext } from './types';
import { makeTree } from '../fixtures';

/** パス列から BadgeContext を組む。G-CI は tree のみで判定するため meta は既定 false。 */
function ctx(paths: string[]): BadgeContext {
  return {
    tree: makeTree(paths),
    meta: {
      hasBranchProtection: false,
      hasSignedCommits: false,
      usesPullRequests: false,
    },
  };
}

/** id からバッジの detect を引く（ID取り違えも同時に検知できる） */
function detect(id: string, paths: string[]): boolean {
  const badge = ciBadges.find((b) => b.id === id);
  if (!badge) throw new Error(`badge not found: ${id}`);
  return badge.detect(ctx(paths));
}

describe('ciBadges 定義', () => {
  it('全バッジが G-CI グループで id 接頭辞 ci.', () => {
    for (const b of ciBadges) {
      expect(b.group).toBe('G-CI');
      expect(b.id).toMatch(/^ci\./);
    }
  });
});

describe('ci.workflows', () => {
  it('.github/workflows 配下の yml/yaml を検出', () => {
    expect(detect('ci.workflows', ['.github/workflows/ci.yml'])).toBe(true);
    expect(detect('ci.workflows', ['.github/workflows/deploy.yaml'])).toBe(
      true
    );
  });
  it('workflows 外の yml では false', () => {
    expect(
      detect('ci.workflows', ['.github/dependabot.yml', 'config.yml'])
    ).toBe(false);
  });
});

describe('ci.composite-action', () => {
  it('ルートの action.yml / action.yaml を検出', () => {
    expect(detect('ci.composite-action', ['action.yml'])).toBe(true);
    expect(detect('ci.composite-action', ['action.yaml'])).toBe(true);
  });
  it('action 定義が無ければ false', () => {
    expect(detect('ci.composite-action', ['.github/workflows/ci.yml'])).toBe(
      false
    );
  });
});

describe('ci.release-automation', () => {
  it('.releaserc / release-please / .changeset を検出', () => {
    expect(detect('ci.release-automation', ['.releaserc'])).toBe(true);
    expect(detect('ci.release-automation', ['.releaserc.json'])).toBe(true);
    expect(
      detect('ci.release-automation', ['release-please-config.json'])
    ).toBe(true);
    expect(detect('ci.release-automation', ['.changeset/config.json'])).toBe(
      true
    );
  });
  it('リリース自動化の設定が無ければ false', () => {
    expect(detect('ci.release-automation', ['CHANGELOG.md'])).toBe(false);
  });
});

describe('ci.preview-env', () => {
  it('vercel.json / netlify.toml を検出', () => {
    expect(detect('ci.preview-env', ['vercel.json'])).toBe(true);
    expect(detect('ci.preview-env', ['netlify.toml'])).toBe(true);
  });
  it('プレビュー設定が無ければ false', () => {
    expect(detect('ci.preview-env', ['src/index.ts'])).toBe(false);
  });
});

describe('ci.dependabot', () => {
  it('.github/dependabot.yml / .yaml を検出', () => {
    expect(detect('ci.dependabot', ['.github/dependabot.yml'])).toBe(true);
    expect(detect('ci.dependabot', ['.github/dependabot.yaml'])).toBe(true);
  });
  it('ルートの dependabot.yml では false（.github 配下が要件）', () => {
    expect(detect('ci.dependabot', ['dependabot.yml'])).toBe(false);
  });
});

describe('ci.renovate', () => {
  it('renovate.json / .renovaterc / .github/renovate.json を検出', () => {
    expect(detect('ci.renovate', ['renovate.json'])).toBe(true);
    expect(detect('ci.renovate', ['.renovaterc'])).toBe(true);
    expect(detect('ci.renovate', ['.renovaterc.json'])).toBe(true);
    expect(detect('ci.renovate', ['.github/renovate.json'])).toBe(true);
  });
  it('Renovate の設定が無ければ false', () => {
    expect(detect('ci.renovate', ['package.json'])).toBe(false);
  });
});
