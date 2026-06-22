import type { BadgeDefinition } from './types';
import {
  hasBasenameMatching,
  hasFileNamed,
  hasFileUnder,
  hasPathMatching,
} from './path-utils';

/**
 * G-Test: テスト実践の痕跡をツリーのパスから検出するバッジ群。
 * 意味（テストが実際に通るか・カバレッジ率）は読まず、規約的な配置・命名の存在で加点する。
 *
 * tree のパスだけで判定できる項目のみ実装する。
 * テスト内容・依存解析が要るもの（PBT/VRT/a11y）は step4 に送る。
 */

// テストファイル：規約ディレクトリ、または言語別のテスト命名規約
const TEST_DIR = /(^|\/)(tests?|spec|__tests__)\//i;
const TEST_FILE =
  /(^|\/)(.*\.(test|spec)\.[jt]sx?|.*_test\.go|test_.*\.py|.*_test\.py|.*Test\.(java|kt)|.*_spec\.rb)$/;

export const testBadges: BadgeDefinition[] = [
  {
    id: 'test.unit',
    group: 'G-Test',
    label: 'テストコードあり',
    // テスト専用ディレクトリ配下、または言語別のテスト命名規約のいずれかでテストの存在を拾う
    detect: ({ tree }) =>
      hasPathMatching(tree, TEST_DIR) || hasPathMatching(tree, TEST_FILE),
  },
  {
    id: 'test.e2e',
    group: 'G-Test',
    label: 'E2Eテスト',
    // ブラウザ駆動E2E（Playwright/Cypress/WebdriverIO）の設定・ディレクトリで判定
    detect: ({ tree }) =>
      hasBasenameMatching(tree, /^playwright\.config\.[mc]?[jt]s$/) ||
      hasBasenameMatching(tree, /^cypress\.config\.[mc]?[jt]s$/) ||
      hasBasenameMatching(tree, /^wdio\.conf\.[mc]?[jt]s$/) ||
      hasPathMatching(tree, /(^|\/)cypress\//),
  },
  {
    id: 'test.framework-config',
    group: 'G-Test',
    label: 'テストフレームワーク設定',
    // テストランナーの設定ファイルの存在で、テスト基盤が整っていることを拾う
    detect: ({ tree }) =>
      hasBasenameMatching(tree, /^vitest\.config\.[mc]?[jt]s$/) ||
      hasBasenameMatching(tree, /^jest\.config\.[mc]?[jt]s$/) ||
      hasFileNamed(tree, 'pytest.ini', 'conftest.py', 'tox.ini') ||
      hasBasenameMatching(tree, /^karma\.conf\.[mc]?[jt]s$/),
  },
  {
    id: 'test.coverage',
    group: 'G-Test',
    label: 'カバレッジ計測',
    // カバレッジ収集・連携の設定ファイルの存在で計測習慣を拾う
    detect: ({ tree }) =>
      hasFileNamed(tree, 'codecov.yml', '.codecov.yml', '.coveragerc'),
  },
  {
    id: 'test.snapshot',
    group: 'G-Test',
    label: 'スナップショットテスト',
    // 生成されたスナップショット格納ディレクトリの存在で判定
    detect: ({ tree }) => hasPathMatching(tree, /(^|\/)__snapshots__\//),
  },
  {
    id: 'test.mutation',
    group: 'G-Test',
    label: 'ミューテーションテスト',
    // Stryker の設定ファイルで変異テストの実施を拾う
    detect: ({ tree }) => hasBasenameMatching(tree, /^stryker\.conf(ig)?\..+$/),
  },
  {
    id: 'test.contract',
    group: 'G-Test',
    label: 'コントラクトテスト',
    // Pact のディレクトリ・設定でサービス間契約テストを拾う
    detect: ({ tree }) =>
      hasFileUnder(tree, 'pact/') ||
      hasBasenameMatching(tree, /^pact\.config\..+$/),
  },
  {
    id: 'test.load',
    group: 'G-Test',
    label: '負荷テスト',
    // Locust（Python）または k6 を含むスクリプト名で負荷試験を拾う
    detect: ({ tree }) =>
      hasFileNamed(tree, 'locustfile.py') ||
      hasBasenameMatching(tree, /\.k6\.js$/) ||
      hasBasenameMatching(tree, /(^|[.\-_])k6([.\-_].*)?\.js$/),
  },
];

// DEFERRED(step4): 以下はファイル内容や依存（package.json 等）の解析が要るため step4 で扱う。
//   - property-based テスト（fast-check / hypothesis 等の依存・利用検出）
//   - visual-regression テスト（loki / reg-suit / percy などの内容・依存解析）
//   - a11y テスト（jest-axe / axe-core などの依存・利用検出）
