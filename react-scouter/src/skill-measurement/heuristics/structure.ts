import type { RepoTree } from '../types';

/**
 * H-a 構造メトリクス：ツリーのパスとサイズだけで「作り込みの形」を測る。
 * 意味は読まないが、god-file（神ファイル）の臭いとテスト比でスロップ/craftを分離する。
 */

const CODE_EXT = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'py',
  'go',
  'rs',
  'rb',
  'java',
  'kt',
  'kts',
  'c',
  'h',
  'cc',
  'cpp',
  'hpp',
  'cs',
  'php',
  'swift',
  'scala',
  'clj',
  'ex',
  'exs',
  'ml',
  'hs',
]);

/** これを超える単一ソースファイルは「神ファイル」の臭い（責務肥大） */
const GOD_FILE_BYTES = 50_000;
/** テスト比がこの値に達したら満点（半分もあれば十分という前提） */
const TEST_RATIO_FULL = 0.5;
/** god-file比がこの値を超えたら構造点は最低 */
const GOD_RATIO_FLOOR = 0.1;

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function ext(path: string): string {
  const b = basename(path);
  const i = b.lastIndexOf('.');
  return i > 0 ? b.slice(i + 1).toLowerCase() : '';
}

const TEST_DIR = /(^|\/)(tests?|spec|__tests__)\//i;
const TEST_FILE =
  /^(.*\.(test|spec)\.[jt]sx?|.*_test\.go|test_.*\.py|.*_test\.py|.*_spec\.rb|.*Test\.(java|kt))$/;

function isTestPath(path: string): boolean {
  return TEST_DIR.test(path) || TEST_FILE.test(basename(path));
}

export interface StructureMetrics {
  sourceFiles: number;
  testFiles: number;
  /** testFiles / sourceFiles */
  testRatio: number;
  largestFileBytes: number;
  /** GOD_FILE_BYTES を超えるソースファイルの割合 */
  godFileRatio: number;
  /** 0..1。高いほど構造的に健全 */
  score: number;
}

export function structureMetrics(tree: RepoTree): StructureMetrics {
  const codeBlobs = tree.entries.filter(
    (e) => e.type === 'blob' && CODE_EXT.has(ext(e.path))
  );
  const sources = codeBlobs.filter((e) => !isTestPath(e.path));
  const tests = codeBlobs.filter((e) => isTestPath(e.path));

  const sourceFiles = sources.length;
  const testFiles = tests.length;
  const largestFileBytes = sources.reduce(
    (max, e) => Math.max(max, e.size ?? 0),
    0
  );
  const godFiles = sources.filter((e) => (e.size ?? 0) > GOD_FILE_BYTES).length;
  const godFileRatio = sourceFiles ? godFiles / sourceFiles : 0;
  const testRatio = sourceFiles ? testFiles / sourceFiles : 0;

  const testScore = Math.min(testRatio / TEST_RATIO_FULL, 1);
  const godScore = 1 - Math.min(godFileRatio / GOD_RATIO_FLOOR, 1);
  const score = sourceFiles === 0 ? 0 : testScore * 0.6 + godScore * 0.4;

  return {
    sourceFiles,
    testFiles,
    testRatio,
    largestFileBytes,
    godFileRatio,
    score,
  };
}
