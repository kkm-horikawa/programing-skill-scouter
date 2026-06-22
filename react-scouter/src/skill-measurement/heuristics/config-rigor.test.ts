import { describe, expect, it } from 'vitest';
import { configRigor } from './config-rigor';

describe('configRigor', () => {
  it('config が無ければ hasData false・score 0', () => {
    const r = configRigor({});
    expect(r.hasData).toBe(false);
    expect(r.score).toBe(0);
  });

  it('tsconfig の strict 系フラグを数える', () => {
    const r = configRigor({
      'tsconfig.json': `{
        "compilerOptions": {
          "strict": true,
          "noUncheckedIndexedAccess": true,
          "exactOptionalPropertyTypes": true
        }
      }`,
    });
    expect(r.tsStrictFlags).toBe(3);
    expect(r.score).toBe(1);
  });

  it('strict を緩めた tsconfig は低スコア', () => {
    const strict = configRigor({
      'tsconfig.json':
        '{ "compilerOptions": { "strict": true, "noImplicitAny": true, "strictNullChecks": true } }',
    });
    const loose = configRigor({
      'tsconfig.json': '{ "compilerOptions": { "strict": false } }',
    });
    expect(loose.score).toBeLessThan(strict.score);
  });

  it('mypy strict を検出する', () => {
    const r = configRigor({ 'mypy.ini': '[mypy]\nstrict = True\n' });
    expect(r.pyStrict).toBe(true);
    expect(r.score).toBe(1);
  });
});
