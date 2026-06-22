import type { RepoTree } from './types';

/**
 * リポジトリツリー（全パス）から実践の痕跡を検出する純粋関数群。
 * 背骨ゲートとバッジが共有する原子的検出器。意味は読まず、設定ファイルの存在で判定する。
 *
 * ツールは互換グループで扱う（特定ツール縛りにせず「その実践があるか」を拾う）。
 */

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function blobBasenames(tree: RepoTree): string[] {
  return tree.entries
    .filter((e) => e.type === 'blob')
    .map((e) => basename(e.path));
}

/** CI/CD：GitHub Actions ほか主要CIの設定 */
export function hasCI(tree: RepoTree): boolean {
  return tree.entries.some((e) => {
    const p = e.path;
    return (
      /^\.github\/workflows\/.+\.ya?ml$/.test(p) ||
      p === '.gitlab-ci.yml' ||
      /^\.circleci\/config\.ya?ml$/.test(p) ||
      p === '.travis.yml' ||
      p === 'azure-pipelines.yml' ||
      basename(p) === 'Jenkinsfile'
    );
  });
}

const LINTER_FILES = [
  /^\.eslintrc(\..+)?$/,
  /^eslint\.config\.[mc]?[jt]s$/,
  /^biome\.jsonc?$/,
  /^\.?ruff\.toml$/,
  /^\.rubocop\.ya?ml$/,
  /^\.golangci\.ya?ml$/,
  /^\.flake8$/,
  /^\.pylintrc$/,
  /^clippy\.toml$/,
  /^tslint\.json$/,
  /^\.stylelintrc(\..+)?$/,
];

/** Linter：eslint / ruff / clippy / golangci-lint / rubocop など */
export function hasLinter(tree: RepoTree): boolean {
  return blobBasenames(tree).some((b) => LINTER_FILES.some((re) => re.test(b)));
}

// テストパス（ディレクトリ）とテストファイル（拡張子規約）の両面で数える
const TEST_DIR = /(^|\/)(tests?|spec|__tests__)\//i;
const TEST_FILE =
  /^(.*\.(test|spec)\.[jt]sx?|.*_test\.go|test_.*\.py|.*_test\.py|.*Test\.(java|kt)|.*_spec\.rb|.*_test\.rb)$/;

/** テストファイルの数。非自明テスト（雛形でない）の判定に使う。 */
export function testFileCount(tree: RepoTree): number {
  return tree.entries.filter((e) => {
    if (e.type !== 'blob') return false;
    return TEST_DIR.test(e.path) || TEST_FILE.test(basename(e.path));
  }).length;
}

/** Git hooks：lefthook / husky / pre-commit / .githooks */
export function hasGitHooks(tree: RepoTree): boolean {
  return tree.entries.some((e) => {
    const p = e.path;
    const b = basename(p);
    return (
      p.startsWith('.husky/') ||
      p.startsWith('.githooks/') ||
      /^\.?lefthook\.ya?ml$/.test(b) ||
      b === '.pre-commit-config.yaml'
    );
  });
}

/** タスクランナー：just / Task / make */
export function hasTaskRunner(tree: RepoTree): boolean {
  return blobBasenames(tree).some(
    (b) =>
      /^\.?[Jj]ustfile$/.test(b) ||
      /^Taskfile\.ya?ml$/.test(b) ||
      /^[Mm]akefile$/.test(b)
  );
}

/** コンテナ化：Dockerfile / Containerfile / compose */
export function isContainerized(tree: RepoTree): boolean {
  return blobBasenames(tree).some(
    (b) =>
      /^Dockerfile(\..+)?$/.test(b) ||
      /\.dockerfile$/.test(b) ||
      b === 'Containerfile' ||
      /^(docker-)?compose\.ya?ml$/.test(b)
  );
}

/** ドキュメントサイト：mkdocs / docusaurus / mdbook / readthedocs */
export function hasDocsSite(tree: RepoTree): boolean {
  return blobBasenames(tree).some(
    (b) =>
      b === 'mkdocs.yml' ||
      /^docusaurus\.config\.[mc]?[jt]s$/.test(b) ||
      b === 'book.toml' ||
      b === '.readthedocs.yaml' ||
      b === '.readthedocs.yml'
  );
}
