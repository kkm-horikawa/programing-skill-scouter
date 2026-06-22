import { describe, expect, it } from 'vitest';
import {
  hasCI,
  hasDocsSite,
  hasGitHooks,
  hasLinter,
  hasTaskRunner,
  isContainerized,
  testFileCount,
} from './detectors';
import { makeTree } from './fixtures';

describe('hasCI', () => {
  it('GitHub Actions のワークフローを検出', () => {
    expect(hasCI(makeTree(['.github/workflows/ci.yml']))).toBe(true);
  });
  it('他のCI（gitlab/circle/travis/jenkins）も検出', () => {
    expect(hasCI(makeTree(['.gitlab-ci.yml']))).toBe(true);
    expect(hasCI(makeTree(['.circleci/config.yml']))).toBe(true);
    expect(hasCI(makeTree(['Jenkinsfile']))).toBe(true);
  });
  it('ワークフローが無ければ false', () => {
    expect(hasCI(makeTree(['.github/ISSUE_TEMPLATE.md', 'src/index.ts']))).toBe(
      false
    );
  });
});

describe('hasLinter', () => {
  it('eslint / ruff / clippy などを検出', () => {
    expect(hasLinter(makeTree(['.eslintrc.json']))).toBe(true);
    expect(hasLinter(makeTree(['eslint.config.js']))).toBe(true);
    expect(hasLinter(makeTree(['ruff.toml']))).toBe(true);
    expect(hasLinter(makeTree(['biome.json']))).toBe(true);
    expect(hasLinter(makeTree(['.golangci.yml']))).toBe(true);
  });
  it('設定が無ければ false', () => {
    expect(hasLinter(makeTree(['src/index.ts', 'README.md']))).toBe(false);
  });
});

describe('testFileCount', () => {
  it('テストディレクトリ配下と拡張子規約の両方を数える', () => {
    const tree = makeTree([
      'src/index.ts',
      'src/index.test.ts',
      'tests/foo_test.go',
      'spec/bar_spec.rb',
      'app/test_thing.py',
    ]);
    expect(testFileCount(tree)).toBe(4);
  });
  it('テストが無ければ 0', () => {
    expect(testFileCount(makeTree(['src/index.ts', 'README.md']))).toBe(0);
  });
});

describe('hasGitHooks', () => {
  it('lefthook / husky / pre-commit を検出', () => {
    expect(hasGitHooks(makeTree(['lefthook.yml']))).toBe(true);
    expect(hasGitHooks(makeTree(['.husky/pre-commit']))).toBe(true);
    expect(hasGitHooks(makeTree(['.pre-commit-config.yaml']))).toBe(true);
  });
  it('無ければ false', () => {
    expect(hasGitHooks(makeTree(['src/index.ts']))).toBe(false);
  });
});

describe('hasTaskRunner', () => {
  it('just / Task / make を検出', () => {
    expect(hasTaskRunner(makeTree(['justfile']))).toBe(true);
    expect(hasTaskRunner(makeTree(['Taskfile.yml']))).toBe(true);
    expect(hasTaskRunner(makeTree(['Makefile']))).toBe(true);
  });
});

describe('isContainerized', () => {
  it('Dockerfile / compose を検出', () => {
    expect(isContainerized(makeTree(['Dockerfile']))).toBe(true);
    expect(isContainerized(makeTree(['docker-compose.yml']))).toBe(true);
    expect(isContainerized(makeTree(['compose.yaml']))).toBe(true);
  });
});

describe('hasDocsSite', () => {
  it('mkdocs / docusaurus / mdbook を検出', () => {
    expect(hasDocsSite(makeTree(['mkdocs.yml']))).toBe(true);
    expect(hasDocsSite(makeTree(['docusaurus.config.ts']))).toBe(true);
    expect(hasDocsSite(makeTree(['book.toml']))).toBe(true);
  });
  it('docs/ ディレクトリだけでは false（設定ファイルが必要）', () => {
    expect(hasDocsSite(makeTree(['docs/intro.md']))).toBe(false);
  });
});
