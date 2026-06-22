import { hasBasenameMatching, hasFileNamed } from './path-utils';
import type { BadgeContext, BadgeDefinition } from './types';

/**
 * G-Quality：コード品質の自動チェックを設定で支えている痕跡を拾う加点バッジ群。
 * リンタ・フォーマッタ・型チェック・各種 lint 設定ファイルの「存在」だけで判定する。
 * 設定の中身（strict 度合い・複雑度閾値など）は内容依存なので step4 へ送る。
 *
 * DEFERRED(step4): tsconfig strict フラグ, 複雑度制限(complexity rule), dead-code 検出
 *   — いずれも設定ファイルの中身を読まないと判定できないため tree 単独では不可。
 */
export const qualityBadges: BadgeDefinition[] = [
  {
    id: 'quality.eslint',
    group: 'G-Quality',
    label: 'ESLint',
    // .eslintrc系 と flat config(eslint.config.*) の両方を拾う
    detect: (ctx: BadgeContext): boolean =>
      hasBasenameMatching(ctx.tree, /^\.eslintrc(\..+)?$/) ||
      hasBasenameMatching(ctx.tree, /^eslint\.config\.[mc]?[jt]s$/),
  },
  {
    id: 'quality.formatter',
    group: 'G-Quality',
    label: 'コードフォーマッタ',
    // 言語横断のフォーマッタ設定（prettier/biome/rustfmt/clang-format/dprint）を互換グループで拾う
    detect: (ctx: BadgeContext): boolean =>
      hasBasenameMatching(ctx.tree, /^\.prettierrc(\..+)?$/) ||
      hasBasenameMatching(ctx.tree, /^prettier\.config\..+$/) ||
      hasFileNamed(
        ctx.tree,
        'biome.json',
        'biome.jsonc',
        '.rustfmt.toml',
        'rustfmt.toml',
        '.clang-format',
        '.dprint.json',
        '.dprint.jsonc'
      ),
  },
  {
    id: 'quality.ruff',
    group: 'G-Quality',
    label: 'Ruff (Python)',
    detect: (ctx: BadgeContext): boolean =>
      hasFileNamed(ctx.tree, 'ruff.toml', '.ruff.toml'),
  },
  {
    id: 'quality.rubocop',
    group: 'G-Quality',
    label: 'RuboCop (Ruby)',
    detect: (ctx: BadgeContext): boolean =>
      hasFileNamed(ctx.tree, '.rubocop.yml', '.rubocop.yaml'),
  },
  {
    id: 'quality.golangci',
    group: 'G-Quality',
    label: 'golangci-lint (Go)',
    detect: (ctx: BadgeContext): boolean =>
      hasFileNamed(ctx.tree, '.golangci.yml', '.golangci.yaml'),
  },
  {
    id: 'quality.ts-config',
    group: 'G-Quality',
    label: 'TypeScript 設定',
    // 存在のみで判定。strict フラグは内容依存のため DEFERRED(step4)。
    detect: (ctx: BadgeContext): boolean =>
      hasFileNamed(ctx.tree, 'tsconfig.json'),
  },
  {
    id: 'quality.py-typecheck',
    group: 'G-Quality',
    label: 'Python 型チェック',
    // mypy / pyright のどちらの設定でも「型チェックしている」痕跡として拾う
    detect: (ctx: BadgeContext): boolean =>
      hasFileNamed(ctx.tree, 'mypy.ini', '.mypy.ini', 'pyrightconfig.json'),
  },
  {
    id: 'quality.editorconfig',
    group: 'G-Quality',
    label: 'EditorConfig',
    detect: (ctx: BadgeContext): boolean =>
      hasFileNamed(ctx.tree, '.editorconfig'),
  },
  {
    id: 'quality.markdownlint',
    group: 'G-Quality',
    label: 'markdownlint',
    detect: (ctx: BadgeContext): boolean =>
      hasFileNamed(
        ctx.tree,
        '.markdownlint.json',
        '.markdownlint.yaml',
        '.markdownlintrc'
      ),
  },
  {
    id: 'quality.yamllint',
    group: 'G-Quality',
    label: 'yamllint',
    detect: (ctx: BadgeContext): boolean =>
      hasFileNamed(ctx.tree, '.yamllint', '.yamllint.yml', '.yamllint.yaml'),
  },
  {
    id: 'quality.shellcheck',
    group: 'G-Quality',
    label: 'ShellCheck',
    detect: (ctx: BadgeContext): boolean =>
      hasFileNamed(ctx.tree, '.shellcheckrc'),
  },
  {
    id: 'quality.spellcheck',
    group: 'G-Quality',
    label: 'スペルチェック',
    // cspell / typos のどちらの綴り検査設定でも拾う
    detect: (ctx: BadgeContext): boolean =>
      hasFileNamed(
        ctx.tree,
        'cspell.json',
        '.cspell.json',
        'typos.toml',
        '_typos.toml'
      ) || hasBasenameMatching(ctx.tree, /^cspell\.config\..+$/),
  },
];
