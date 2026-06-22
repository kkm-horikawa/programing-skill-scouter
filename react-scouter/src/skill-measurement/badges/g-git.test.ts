import { describe, expect, it } from 'vitest';
import type { BadgeContext, RepoBadgeMeta } from './types';
import { makeTree } from '../fixtures';
import { gitBadges } from './g-git';

/** 指定 id のバッジを取り出す（無ければ例外で Fail Fast）。 */
function badge(id: string) {
  const b = gitBadges.find((x) => x.id === id);
  if (!b) throw new Error(`badge not found: ${id}`);
  return b;
}

/** meta 既定は全 false。tree とフラグを差し替えて ctx を組む小ヘルパ。 */
function ctx(paths: string[], meta: Partial<RepoBadgeMeta> = {}): BadgeContext {
  return {
    tree: makeTree(paths),
    meta: {
      hasBranchProtection: false,
      hasSignedCommits: false,
      usesPullRequests: false,
      ...meta,
    },
  };
}

describe('git.pr-template', () => {
  const detect = badge('git.pr-template').detect;

  it('検出: .github 直下のテンプレート', () => {
    expect(detect(ctx(['.github/PULL_REQUEST_TEMPLATE.md']))).toBe(true);
  });
  it('検出: 複数テンプレ用ディレクトリ配下', () => {
    expect(detect(ctx(['.github/PULL_REQUEST_TEMPLATE/feature.md']))).toBe(
      true
    );
  });
  it('検出: docs 直下の小文字テンプレート', () => {
    expect(detect(ctx(['docs/pull_request_template.md']))).toBe(true);
  });
  it('非検出: 関係ないファイルのみ', () => {
    expect(detect(ctx(['README.md', '.github/workflows/ci.yml']))).toBe(false);
  });
});

describe('git.issue-template', () => {
  const detect = badge('git.issue-template').detect;

  it('検出: 単一テンプレート', () => {
    expect(detect(ctx(['.github/ISSUE_TEMPLATE.md']))).toBe(true);
  });
  it('検出: テンプレートディレクトリ配下', () => {
    expect(detect(ctx(['.github/ISSUE_TEMPLATE/bug.yml']))).toBe(true);
  });
  it('非検出: PR テンプレートだけでは成立しない', () => {
    expect(detect(ctx(['.github/PULL_REQUEST_TEMPLATE.md']))).toBe(false);
  });
});

describe('git.codeowners', () => {
  const detect = badge('git.codeowners').detect;

  it('検出: root の CODEOWNERS', () => {
    expect(detect(ctx(['CODEOWNERS']))).toBe(true);
  });
  it('検出: .github 配下の CODEOWNERS', () => {
    expect(detect(ctx(['.github/CODEOWNERS']))).toBe(true);
  });
  it('検出: docs 配下の CODEOWNERS', () => {
    expect(detect(ctx(['docs/CODEOWNERS']))).toBe(true);
  });
  it('非検出: 認識されない場所の CODEOWNERS', () => {
    expect(detect(ctx(['config/CODEOWNERS']))).toBe(false);
  });
});

describe('git.gitattributes', () => {
  const detect = badge('git.gitattributes').detect;

  it('検出: .gitattributes', () => {
    expect(detect(ctx(['.gitattributes']))).toBe(true);
  });
  it('非検出: .gitignore のみ', () => {
    expect(detect(ctx(['.gitignore']))).toBe(false);
  });
});

describe('git.blame-ignore', () => {
  const detect = badge('git.blame-ignore').detect;

  it('検出: .git-blame-ignore-revs', () => {
    expect(detect(ctx(['.git-blame-ignore-revs']))).toBe(true);
  });
  it('非検出: 無関係なファイル', () => {
    expect(detect(ctx(['.gitattributes']))).toBe(false);
  });
});

describe('git.monorepo', () => {
  const detect = badge('git.monorepo').detect;

  it('検出: pnpm-workspace.yaml', () => {
    expect(detect(ctx(['pnpm-workspace.yaml']))).toBe(true);
  });
  it('検出: turbo.json', () => {
    expect(detect(ctx(['turbo.json']))).toBe(true);
  });
  it('検出: lerna.json', () => {
    expect(detect(ctx(['lerna.json']))).toBe(true);
  });
  it('検出: nx.json', () => {
    expect(detect(ctx(['nx.json']))).toBe(true);
  });
  it('非検出: 通常の package.json のみ', () => {
    expect(detect(ctx(['package.json']))).toBe(false);
  });
});

describe('git.branch-protection', () => {
  const detect = badge('git.branch-protection').detect;

  it('検出: meta.hasBranchProtection が true', () => {
    expect(detect(ctx([], { hasBranchProtection: true }))).toBe(true);
  });
  it('非検出: 既定の false', () => {
    expect(detect(ctx([]))).toBe(false);
  });
});

describe('git.signed-commits', () => {
  const detect = badge('git.signed-commits').detect;

  it('検出: meta.hasSignedCommits が true', () => {
    expect(detect(ctx([], { hasSignedCommits: true }))).toBe(true);
  });
  it('非検出: 既定の false', () => {
    expect(detect(ctx([]))).toBe(false);
  });
});

describe('git.pr-driven', () => {
  const detect = badge('git.pr-driven').detect;

  it('検出: meta.usesPullRequests が true', () => {
    expect(detect(ctx([], { usesPullRequests: true }))).toBe(true);
  });
  it('非検出: 既定の false', () => {
    expect(detect(ctx([]))).toBe(false);
  });
});
