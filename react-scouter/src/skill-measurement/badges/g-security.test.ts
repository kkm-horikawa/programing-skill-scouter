import { describe, expect, it } from 'vitest';
import type { BadgeContext, RepoBadgeMeta } from './types';
import { securityBadges } from './g-security';
import { makeTree } from '../fixtures';
import type { RepoTree } from '../types';

/** meta はツリー判定では使わないので既定 false で固定する */
const META: RepoBadgeMeta = {
  hasBranchProtection: false,
  hasSignedCommits: false,
  usesPullRequests: false,
};

function ctx(paths: string[]): BadgeContext {
  return { tree: makeTree(paths), meta: META };
}

/** id でバッジの detect を引く（順序に依存しない） */
function detect(id: string, tree: BadgeContext): boolean {
  const badge = securityBadges.find((b) => b.id === id);
  if (!badge) throw new Error(`badge not found: ${id}`);
  return badge.detect(tree);
}

describe('securityBadges 定義', () => {
  it('全バッジが G-Security グループで security. 接頭辞を持つ', () => {
    for (const b of securityBadges) {
      expect(b.group).toBe('G-Security');
      expect(b.id.startsWith('security.')).toBe(true);
    }
  });
});

describe('security.policy', () => {
  it('ルート / .github/ / docs/ の SECURITY.md を検出', () => {
    expect(detect('security.policy', ctx(['SECURITY.md']))).toBe(true);
    expect(detect('security.policy', ctx(['.github/SECURITY.md']))).toBe(true);
    expect(detect('security.policy', ctx(['docs/SECURITY.md']))).toBe(true);
  });
  it('別の md や別ディレクトリ配下では false', () => {
    expect(detect('security.policy', ctx(['README.md']))).toBe(false);
    expect(detect('security.policy', ctx(['src/SECURITY.md']))).toBe(false);
  });
});

describe('security.codeql', () => {
  it('ワークフロー配下の codeql yml を検出', () => {
    expect(
      detect('security.codeql', ctx(['.github/workflows/codeql.yml']))
    ).toBe(true);
    expect(
      detect('security.codeql', ctx(['.github/workflows/codeql-analysis.yaml']))
    ).toBe(true);
  });
  it('他のワークフローやツリー外の codeql では false', () => {
    expect(detect('security.codeql', ctx(['.github/workflows/ci.yml']))).toBe(
      false
    );
    expect(detect('security.codeql', ctx(['codeql.yml']))).toBe(false);
  });
});

describe('security.sast', () => {
  it('semgrep / bandit / gosec の設定を検出', () => {
    expect(detect('security.sast', ctx(['.semgrep.yml']))).toBe(true);
    expect(detect('security.sast', ctx(['semgrep.yml']))).toBe(true);
    expect(detect('security.sast', ctx(['.bandit']))).toBe(true);
    expect(detect('security.sast', ctx(['bandit.yaml']))).toBe(true);
    expect(detect('security.sast', ctx(['.gosec.json']))).toBe(true);
  });
  it('無関係な設定では false', () => {
    expect(detect('security.sast', ctx(['.eslintrc']))).toBe(false);
  });
});

describe('security.secret-scan', () => {
  it('gitleaks / trufflehog の設定を検出', () => {
    expect(detect('security.secret-scan', ctx(['.gitleaks.toml']))).toBe(true);
    expect(detect('security.secret-scan', ctx(['gitleaks.toml']))).toBe(true);
    expect(detect('security.secret-scan', ctx(['.trufflehog.yaml']))).toBe(
      true
    );
  });
  it('シークレットスキャン設定が無ければ false', () => {
    expect(detect('security.secret-scan', ctx(['config.toml']))).toBe(false);
  });
});

describe('security.container-scan', () => {
  it('trivy / grype の設定を検出', () => {
    expect(detect('security.container-scan', ctx(['trivy.yaml']))).toBe(true);
    expect(detect('security.container-scan', ctx(['.trivyignore']))).toBe(true);
    expect(detect('security.container-scan', ctx(['grype.yaml']))).toBe(true);
  });
  it('コンテナスキャン設定が無ければ false', () => {
    expect(detect('security.container-scan', ctx(['Dockerfile']))).toBe(false);
  });
});

describe('security.secrets-mgmt', () => {
  it('sops / sealed-secrets を検出', () => {
    expect(detect('security.secrets-mgmt', ctx(['.sops.yaml']))).toBe(true);
    expect(detect('security.secrets-mgmt', ctx(['.sops.yml']))).toBe(true);
    expect(
      detect('security.secrets-mgmt', ctx(['k8s/sealed-secrets/db.yaml']))
    ).toBe(true);
  });
  it('暗号化シークレット管理が無ければ false', () => {
    expect(detect('security.secrets-mgmt', ctx(['secrets.env']))).toBe(false);
  });
});

describe('meta フラグは判定に影響しない（ツリー中心の純粋性）', () => {
  it('meta を全て true にしても tree が空なら全バッジ false', () => {
    const fullMeta: RepoBadgeMeta = {
      hasBranchProtection: true,
      hasSignedCommits: true,
      usesPullRequests: true,
    };
    const tree: RepoTree = makeTree(['src/index.ts']);
    for (const b of securityBadges) {
      expect(b.detect({ tree, meta: fullMeta })).toBe(false);
    }
  });
});
