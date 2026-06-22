import { describe, expect, it, vi } from 'vitest';
import { checkRegistry, parsePackageNames } from './published-library';

describe('parsePackageNames', () => {
  it('pyproject.toml の [project] name を PyPI として拾う', () => {
    const refs = parsePackageNames({
      'pyproject.toml': '[project]\nname = "wagtail-foo"\nversion = "1.0"\n',
    });
    expect(refs).toEqual([{ name: 'wagtail-foo', registry: 'pypi' }]);
  });

  it('poetry 形式も拾う', () => {
    const refs = parsePackageNames({
      'pyproject.toml': '[tool.poetry]\nname = "my-lib"\n',
    });
    expect(refs[0]).toEqual({ name: 'my-lib', registry: 'pypi' });
  });

  it('package.json の name を npm として拾う（private は除外）', () => {
    expect(
      parsePackageNames({ 'package.json': '{ "name": "cool-pkg" }' })
    ).toEqual([{ name: 'cool-pkg', registry: 'npm' }]);
    expect(
      parsePackageNames({
        'package.json': '{ "name": "app", "private": true }',
      })
    ).toEqual([]);
  });

  it('Cargo.toml / setup.cfg も拾う', () => {
    const refs = parsePackageNames({
      'Cargo.toml': '[package]\nname = "rusty"\n',
      'setup.cfg': '[metadata]\nname = legacy-pkg\n',
    });
    expect(refs).toContainEqual({ name: 'rusty', registry: 'crates' });
    expect(refs).toContainEqual({ name: 'legacy-pkg', registry: 'pypi' });
  });

  it('manifest が無ければ空', () => {
    expect(parsePackageNames({ 'tsconfig.json': '{}' })).toEqual([]);
  });
});

describe('checkRegistry', () => {
  it('200 なら published（PyPI の URL を叩く）', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }));
    const status = await checkRegistry(
      { name: 'wagtail', registry: 'pypi' },
      fetchImpl
    );
    expect(status).toBe('published');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://pypi.org/pypi/wagtail/json'
    );
  });

  it('404 は absent（明確に未公開）', async () => {
    const status = await checkRegistry(
      { name: 'nope', registry: 'npm' },
      async () => ({ ok: false })
    );
    expect(status).toBe('absent');
  });

  it('ネットワーク失敗は unknown（確認不能）', async () => {
    const status = await checkRegistry(
      { name: 'x', registry: 'pypi' },
      async () => {
        throw new Error('CORS');
      }
    );
    expect(status).toBe('unknown');
  });
});
