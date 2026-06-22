import { describe, expect, it } from 'vitest';
import { makeTree } from '../fixtures';
import { testBadges } from './g-test';
import type { BadgeContext, RepoBadgeMeta } from './types';

/** meta は全フラグ false の既定で、tree だけを差し替えて ctx を組む */
const META: RepoBadgeMeta = {
  hasBranchProtection: false,
  hasSignedCommits: false,
  usesPullRequests: false,
};

function ctx(paths: string[]): BadgeContext {
  return { tree: makeTree(paths), meta: META };
}

/** id でバッジの detect を引く（テストの可読性のため） */
function detect(id: string, paths: string[]): boolean {
  const badge = testBadges.find((b) => b.id === id);
  if (!badge) throw new Error(`badge not found: ${id}`);
  return badge.detect(ctx(paths));
}

describe('testBadges 定義', () => {
  it('全バッジが G-Test グループで test. 接頭辞を持つ', () => {
    for (const b of testBadges) {
      expect(b.group).toBe('G-Test');
      expect(b.id.startsWith('test.')).toBe(true);
    }
  });
});

describe('test.unit', () => {
  it('テストディレクトリ配下を検出', () => {
    expect(detect('test.unit', ['tests/foo.py'])).toBe(true);
    expect(detect('test.unit', ['src/__tests__/foo.ts'])).toBe(true);
    expect(detect('test.unit', ['spec/foo_check.rb'])).toBe(true);
  });
  it('言語別のテスト命名規約を検出', () => {
    expect(detect('test.unit', ['src/util.test.ts'])).toBe(true);
    expect(detect('test.unit', ['src/util.spec.jsx'])).toBe(true);
    expect(detect('test.unit', ['pkg/foo_test.go'])).toBe(true);
    expect(detect('test.unit', ['test_app.py'])).toBe(true);
    expect(detect('test.unit', ['app_test.py'])).toBe(true);
    expect(detect('test.unit', ['model_spec.rb'])).toBe(true);
    expect(detect('test.unit', ['FooTest.java'])).toBe(true);
    expect(detect('test.unit', ['FooTest.kt'])).toBe(true);
  });
  it('テストが無ければ false', () => {
    expect(detect('test.unit', ['src/index.ts', 'README.md'])).toBe(false);
  });
});

describe('test.e2e', () => {
  it('Playwright/Cypress/WebdriverIO の設定とディレクトリを検出', () => {
    expect(detect('test.e2e', ['playwright.config.ts'])).toBe(true);
    expect(detect('test.e2e', ['cypress.config.js'])).toBe(true);
    expect(detect('test.e2e', ['cypress/e2e/login.cy.ts'])).toBe(true);
    expect(detect('test.e2e', ['wdio.conf.js'])).toBe(true);
  });
  it('E2E設定が無ければ false', () => {
    expect(detect('test.e2e', ['vitest.config.ts'])).toBe(false);
  });
});

describe('test.framework-config', () => {
  it('テストランナー設定を検出', () => {
    expect(detect('test.framework-config', ['vitest.config.ts'])).toBe(true);
    expect(detect('test.framework-config', ['jest.config.js'])).toBe(true);
    expect(detect('test.framework-config', ['pytest.ini'])).toBe(true);
    expect(detect('test.framework-config', ['conftest.py'])).toBe(true);
    expect(detect('test.framework-config', ['tox.ini'])).toBe(true);
    expect(detect('test.framework-config', ['karma.conf.js'])).toBe(true);
  });
  it('設定が無ければ false', () => {
    expect(detect('test.framework-config', ['src/index.ts'])).toBe(false);
  });
});

describe('test.coverage', () => {
  it('カバレッジ設定を検出', () => {
    expect(detect('test.coverage', ['codecov.yml'])).toBe(true);
    expect(detect('test.coverage', ['.codecov.yml'])).toBe(true);
    expect(detect('test.coverage', ['.coveragerc'])).toBe(true);
  });
  it('設定が無ければ false', () => {
    expect(detect('test.coverage', ['package.json'])).toBe(false);
  });
});

describe('test.snapshot', () => {
  it('__snapshots__ ディレクトリを検出', () => {
    expect(
      detect('test.snapshot', ['src/__snapshots__/Button.test.tsx.snap'])
    ).toBe(true);
  });
  it('スナップショットが無ければ false', () => {
    expect(detect('test.snapshot', ['src/Button.test.tsx'])).toBe(false);
  });
});

describe('test.mutation', () => {
  it('Stryker 設定を検出', () => {
    expect(detect('test.mutation', ['stryker.conf.js'])).toBe(true);
    expect(detect('test.mutation', ['stryker.config.json'])).toBe(true);
  });
  it('設定が無ければ false', () => {
    expect(detect('test.mutation', ['jest.config.js'])).toBe(false);
  });
});

describe('test.contract', () => {
  it('Pact のディレクトリ・設定を検出', () => {
    expect(detect('test.contract', ['pact/consumer.json'])).toBe(true);
    expect(detect('test.contract', ['pact.config.js'])).toBe(true);
  });
  it('契約テストが無ければ false', () => {
    expect(detect('test.contract', ['src/index.ts'])).toBe(false);
  });
});

describe('test.load', () => {
  it('Locust / k6 のスクリプトを検出', () => {
    expect(detect('test.load', ['locustfile.py'])).toBe(true);
    expect(detect('test.load', ['load.k6.js'])).toBe(true);
    expect(detect('test.load', ['perf/k6.js'])).toBe(true);
  });
  it('負荷テストが無ければ false', () => {
    expect(detect('test.load', ['src/index.ts', 'app.js'])).toBe(false);
  });
});
