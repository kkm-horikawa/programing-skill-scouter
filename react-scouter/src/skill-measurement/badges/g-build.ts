import type { BadgeDefinition } from './types';
import { hasFileNamed } from './path-utils';

/**
 * G-Build：ビルド・依存管理の規律バッジ群。
 * いずれも設定ファイルの「存在」だけで判定でき、ファイル内容は読まない純粋関数。
 *
 * DEFERRED(step4): SBOM生成（CycloneDX/SPDX等）はファイル内容・生成パイプラインの確認が要るため step4 へ。
 * なお dependabot/renovate は G-CI が担当するためここでは扱わない。
 */
export const buildBadges: BadgeDefinition[] = [
  {
    // ロックファイルの存在＝依存バージョンを固定し再現可能なインストールを担保している痕跡
    id: 'build.lockfile',
    group: 'G-Build',
    label: 'ロックファイルで依存を固定',
    detect: ({ tree }) =>
      hasFileNamed(
        tree,
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        'Cargo.lock',
        'poetry.lock',
        'uv.lock',
        'pdm.lock',
        'Gemfile.lock',
        'composer.lock',
        'go.sum'
      ),
  },
  {
    // ツールバージョン宣言＝開発環境のランタイム版を揃え「自分の環境では動く」を防ぐ痕跡
    id: 'build.version-manager',
    group: 'G-Build',
    label: 'ツールバージョンを宣言',
    detect: ({ tree }) =>
      hasFileNamed(
        tree,
        '.tool-versions',
        '.nvmrc',
        'mise.toml',
        '.mise.toml',
        '.python-version',
        'rust-toolchain.toml',
        'rust-toolchain'
      ),
  },
  {
    // Nix/Bazel等＝環境ごと固定し誰でも同じ成果物を作れる再現性の高いビルド痕跡
    id: 'build.reproducible',
    group: 'G-Build',
    label: '再現可能なビルド環境',
    detect: ({ tree }) =>
      hasFileNamed(
        tree,
        'flake.nix',
        'default.nix',
        'shell.nix',
        'WORKSPACE',
        'WORKSPACE.bazel',
        'BUILD.bazel',
        'MODULE.bazel'
      ),
  },
  {
    // バンドルサイズ監視の設定＝成果物の肥大化を継続的に抑える運用痕跡
    id: 'build.bundle-size',
    group: 'G-Build',
    label: 'バンドルサイズを監視',
    detect: ({ tree }) =>
      hasFileNamed(
        tree,
        '.size-limit.json',
        '.size-limit.js',
        '.bundlewatch.config.json'
      ),
  },
  {
    // pnpm/uv/poetry/pdm のロックファイル＝高速・厳密な先進パッケージマネージャ採用の痕跡
    id: 'build.advanced-pm',
    group: 'G-Build',
    label: '先進的なパッケージマネージャ',
    detect: ({ tree }) =>
      hasFileNamed(
        tree,
        'pnpm-lock.yaml',
        'uv.lock',
        'poetry.lock',
        'pdm.lock'
      ),
  },
];
