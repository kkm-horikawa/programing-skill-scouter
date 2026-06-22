import { describe, expect, it } from 'vitest';
import { makeTree } from '../fixtures';
import { qualityBadges } from './g-quality';
import type { BadgeContext, RepoBadgeMeta } from './types';

/** meta 既定（全 false）。tree 中心の判定なので meta は影響しない。 */
const META: RepoBadgeMeta = {
  hasBranchProtection: false,
  hasSignedCommits: false,
  usesPullRequests: false,
};

/** パス列だけから BadgeContext を組む小ヘルパ */
function ctx(paths: string[]): BadgeContext {
  return { tree: makeTree(paths), meta: META };
}

/** id でバッジの detect を引く */
function detect(id: string, paths: string[]): boolean {
  const badge = qualityBadges.find((b) => b.id === id);
  if (!badge) throw new Error(`badge not found: ${id}`);
  return badge.detect(ctx(paths));
}

describe('qualityBadges 定義の健全性', () => {
  it('全バッジが G-Quality かつ quality. 接頭辞', () => {
    for (const b of qualityBadges) {
      expect(b.group).toBe('G-Quality');
      expect(b.id.startsWith('quality.')).toBe(true);
    }
  });
  it('id は重複しない', () => {
    const ids = qualityBadges.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('quality.eslint', () => {
  it('.eslintrc系 / flat config を検出', () => {
    expect(detect('quality.eslint', ['.eslintrc.json'])).toBe(true);
    expect(detect('quality.eslint', ['.eslintrc'])).toBe(true);
    expect(detect('quality.eslint', ['eslint.config.js'])).toBe(true);
    expect(detect('quality.eslint', ['eslint.config.mjs'])).toBe(true);
    expect(detect('quality.eslint', ['eslint.config.ts'])).toBe(true);
  });
  it('設定が無ければ false', () => {
    expect(detect('quality.eslint', ['src/index.ts', 'README.md'])).toBe(false);
  });
});

describe('quality.formatter', () => {
  it('prettier / biome / rustfmt / clang-format / dprint を検出', () => {
    expect(detect('quality.formatter', ['.prettierrc'])).toBe(true);
    expect(detect('quality.formatter', ['.prettierrc.json'])).toBe(true);
    expect(detect('quality.formatter', ['prettier.config.js'])).toBe(true);
    expect(detect('quality.formatter', ['biome.json'])).toBe(true);
    expect(detect('quality.formatter', ['biome.jsonc'])).toBe(true);
    expect(detect('quality.formatter', ['rustfmt.toml'])).toBe(true);
    expect(detect('quality.formatter', ['.rustfmt.toml'])).toBe(true);
    expect(detect('quality.formatter', ['.clang-format'])).toBe(true);
    expect(detect('quality.formatter', ['.dprint.json'])).toBe(true);
  });
  it('設定が無ければ false', () => {
    expect(detect('quality.formatter', ['src/main.go'])).toBe(false);
  });
});

describe('quality.ruff', () => {
  it('ruff.toml / .ruff.toml を検出', () => {
    expect(detect('quality.ruff', ['ruff.toml'])).toBe(true);
    expect(detect('quality.ruff', ['.ruff.toml'])).toBe(true);
  });
  it('無ければ false', () => {
    expect(detect('quality.ruff', ['pyproject.toml'])).toBe(false);
  });
});

describe('quality.rubocop', () => {
  it('.rubocop.yml / .yaml を検出', () => {
    expect(detect('quality.rubocop', ['.rubocop.yml'])).toBe(true);
    expect(detect('quality.rubocop', ['.rubocop.yaml'])).toBe(true);
  });
  it('無ければ false', () => {
    expect(detect('quality.rubocop', ['Gemfile'])).toBe(false);
  });
});

describe('quality.golangci', () => {
  it('.golangci.yml / .yaml を検出', () => {
    expect(detect('quality.golangci', ['.golangci.yml'])).toBe(true);
    expect(detect('quality.golangci', ['.golangci.yaml'])).toBe(true);
  });
  it('無ければ false', () => {
    expect(detect('quality.golangci', ['go.mod'])).toBe(false);
  });
});

describe('quality.ts-config', () => {
  it('tsconfig.json を検出', () => {
    expect(detect('quality.ts-config', ['tsconfig.json'])).toBe(true);
  });
  it('無ければ false', () => {
    expect(detect('quality.ts-config', ['package.json'])).toBe(false);
  });
});

describe('quality.py-typecheck', () => {
  it('mypy / pyright 設定を検出', () => {
    expect(detect('quality.py-typecheck', ['mypy.ini'])).toBe(true);
    expect(detect('quality.py-typecheck', ['.mypy.ini'])).toBe(true);
    expect(detect('quality.py-typecheck', ['pyrightconfig.json'])).toBe(true);
  });
  it('無ければ false', () => {
    expect(detect('quality.py-typecheck', ['setup.py'])).toBe(false);
  });
});

describe('quality.editorconfig', () => {
  it('.editorconfig を検出', () => {
    expect(detect('quality.editorconfig', ['.editorconfig'])).toBe(true);
  });
  it('無ければ false', () => {
    expect(detect('quality.editorconfig', ['.gitignore'])).toBe(false);
  });
});

describe('quality.markdownlint', () => {
  it('各種設定ファイルを検出', () => {
    expect(detect('quality.markdownlint', ['.markdownlint.json'])).toBe(true);
    expect(detect('quality.markdownlint', ['.markdownlint.yaml'])).toBe(true);
    expect(detect('quality.markdownlint', ['.markdownlintrc'])).toBe(true);
  });
  it('無ければ false', () => {
    expect(detect('quality.markdownlint', ['README.md'])).toBe(false);
  });
});

describe('quality.yamllint', () => {
  it('各種設定ファイルを検出', () => {
    expect(detect('quality.yamllint', ['.yamllint'])).toBe(true);
    expect(detect('quality.yamllint', ['.yamllint.yml'])).toBe(true);
    expect(detect('quality.yamllint', ['.yamllint.yaml'])).toBe(true);
  });
  it('無ければ false', () => {
    expect(detect('quality.yamllint', ['config.yml'])).toBe(false);
  });
});

describe('quality.shellcheck', () => {
  it('.shellcheckrc を検出', () => {
    expect(detect('quality.shellcheck', ['.shellcheckrc'])).toBe(true);
  });
  it('無ければ false', () => {
    expect(detect('quality.shellcheck', ['run.sh'])).toBe(false);
  });
});

describe('quality.spellcheck', () => {
  it('cspell / typos 設定を検出', () => {
    expect(detect('quality.spellcheck', ['cspell.json'])).toBe(true);
    expect(detect('quality.spellcheck', ['.cspell.json'])).toBe(true);
    expect(detect('quality.spellcheck', ['cspell.config.yaml'])).toBe(true);
    expect(detect('quality.spellcheck', ['typos.toml'])).toBe(true);
    expect(detect('quality.spellcheck', ['_typos.toml'])).toBe(true);
  });
  it('無ければ false', () => {
    expect(detect('quality.spellcheck', ['docs/words.txt'])).toBe(false);
  });
});

describe('meta は判定に影響しない（tree 中心）', () => {
  it('meta が全 true でも tree が無ければ false', () => {
    const fullMeta: RepoBadgeMeta = {
      hasBranchProtection: true,
      hasSignedCommits: true,
      usesPullRequests: true,
    };
    const noQuality: BadgeContext = {
      tree: makeTree(['src/index.ts']),
      meta: fullMeta,
    };
    for (const b of qualityBadges) {
      expect(b.detect(noQuality)).toBe(false);
    }
  });
});
