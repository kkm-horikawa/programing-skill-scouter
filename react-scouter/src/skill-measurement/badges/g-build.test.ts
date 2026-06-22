import { describe, expect, it } from 'vitest';
import type { BadgeContext, BadgeDefinition, RepoBadgeMeta } from './types';
import { buildBadges } from './g-build';
import { makeTree } from '../fixtures';

/** meta は全て false 既定。tree だけで判定するバッジ向けの最小 ctx ヘルパ。 */
const META: RepoBadgeMeta = {
  hasBranchProtection: false,
  hasSignedCommits: false,
  usesPullRequests: false,
};

function ctx(paths: string[]): BadgeContext {
  return { tree: makeTree(paths), meta: META };
}

function badge(id: string): BadgeDefinition {
  const def = buildBadges.find((b) => b.id === id);
  if (!def) throw new Error(`バッジが見つからない: ${id}`);
  return def;
}

describe('build.lockfile', () => {
  const detect = badge('build.lockfile').detect;
  it('各エコシステムのロックファイルを検出', () => {
    expect(detect(ctx(['package-lock.json']))).toBe(true);
    expect(detect(ctx(['yarn.lock']))).toBe(true);
    expect(detect(ctx(['Cargo.lock']))).toBe(true);
    expect(detect(ctx(['go.sum']))).toBe(true);
    expect(detect(ctx(['Gemfile.lock']))).toBe(true);
  });
  it('サブディレクトリ配下でも basename で検出', () => {
    expect(detect(ctx(['frontend/pnpm-lock.yaml']))).toBe(true);
  });
  it('ロックファイルが無ければ false', () => {
    expect(detect(ctx(['package.json', 'src/index.ts']))).toBe(false);
  });
});

describe('build.version-manager', () => {
  const detect = badge('build.version-manager').detect;
  it('ツールバージョン宣言ファイルを検出', () => {
    expect(detect(ctx(['.tool-versions']))).toBe(true);
    expect(detect(ctx(['.nvmrc']))).toBe(true);
    expect(detect(ctx(['mise.toml']))).toBe(true);
    expect(detect(ctx(['.mise.toml']))).toBe(true);
    expect(detect(ctx(['.python-version']))).toBe(true);
    expect(detect(ctx(['rust-toolchain.toml']))).toBe(true);
    expect(detect(ctx(['rust-toolchain']))).toBe(true);
  });
  it('宣言が無ければ false', () => {
    expect(detect(ctx(['package.json']))).toBe(false);
  });
});

describe('build.reproducible', () => {
  const detect = badge('build.reproducible').detect;
  it('Nix / Bazel の設定を検出', () => {
    expect(detect(ctx(['flake.nix']))).toBe(true);
    expect(detect(ctx(['default.nix']))).toBe(true);
    expect(detect(ctx(['shell.nix']))).toBe(true);
    expect(detect(ctx(['WORKSPACE']))).toBe(true);
    expect(detect(ctx(['WORKSPACE.bazel']))).toBe(true);
    expect(detect(ctx(['BUILD.bazel']))).toBe(true);
    expect(detect(ctx(['MODULE.bazel']))).toBe(true);
  });
  it('再現ビルド設定が無ければ false', () => {
    expect(detect(ctx(['Makefile', 'src/main.rs']))).toBe(false);
  });
});

describe('build.bundle-size', () => {
  const detect = badge('build.bundle-size').detect;
  it('サイズ監視の設定を検出', () => {
    expect(detect(ctx(['.size-limit.json']))).toBe(true);
    expect(detect(ctx(['.size-limit.js']))).toBe(true);
    expect(detect(ctx(['.bundlewatch.config.json']))).toBe(true);
  });
  it('サイズ監視が無ければ false', () => {
    expect(detect(ctx(['package.json', 'webpack.config.js']))).toBe(false);
  });
});

describe('build.advanced-pm', () => {
  const detect = badge('build.advanced-pm').detect;
  it('pnpm / uv / poetry / pdm のロックを検出', () => {
    expect(detect(ctx(['pnpm-lock.yaml']))).toBe(true);
    expect(detect(ctx(['uv.lock']))).toBe(true);
    expect(detect(ctx(['poetry.lock']))).toBe(true);
    expect(detect(ctx(['pdm.lock']))).toBe(true);
  });
  it('npm/yarn など旧来のロックだけなら false', () => {
    expect(detect(ctx(['package-lock.json']))).toBe(false);
    expect(detect(ctx(['yarn.lock']))).toBe(false);
  });
});

describe('buildBadges 定義', () => {
  it('全て G-Build グループで id は build. 接頭辞', () => {
    for (const b of buildBadges) {
      expect(b.group).toBe('G-Build');
      expect(b.id.startsWith('build.')).toBe(true);
      expect(b.label.length).toBeGreaterThan(0);
    }
  });
});
