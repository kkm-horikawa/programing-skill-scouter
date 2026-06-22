/**
 * 公開ライブラリの検出（背骨 S5＝初級/中級の決定線）。
 *
 * 2段で確度を上げる：
 * 1. manifest（pyproject.toml / package.json / Cargo.toml / setup.cfg）から
 *    パッケージ名を抽出。
 * 2. レジストリ（PyPI / npm / crates）に問い合わせて実際に公開済みか確認。
 *    PyPI・npm は CORS 許可済みでブラウザから叩ける。
 */

export type Registry = 'pypi' | 'npm' | 'crates';

export interface PackageRef {
  name: string;
  registry: Registry;
}

/** manifest の中身からパッケージ名とレジストリを抽出する純粋関数。 */
export function parsePackageNames(files: Record<string, string>): PackageRef[] {
  const refs: PackageRef[] = [];

  const pyproject = files['pyproject.toml'];
  if (pyproject && /\[project\]|\[tool\.poetry\]/.test(pyproject)) {
    const m = pyproject.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
    if (m) refs.push({ name: m[1], registry: 'pypi' });
  }

  const setupCfg = files['setup.cfg'];
  if (setupCfg && /\[metadata\]/.test(setupCfg)) {
    const m = setupCfg.match(/^\s*name\s*=\s*(\S+)\s*$/m);
    if (m) refs.push({ name: m[1], registry: 'pypi' });
  }

  const pkg = files['package.json'];
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg) as { name?: string; private?: boolean };
      if (parsed.name && parsed.private !== true) {
        refs.push({ name: parsed.name, registry: 'npm' });
      }
    } catch {
      // 壊れた package.json は無視
    }
  }

  const cargo = files['Cargo.toml'];
  if (cargo && /\[package\]/.test(cargo)) {
    const m = cargo.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
    if (m) refs.push({ name: m[1], registry: 'crates' });
  }

  // 同名重複を除く
  const seen = new Set<string>();
  return refs.filter((r) => {
    const key = `${r.registry}:${r.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type FetchLike = (url: string) => Promise<{ ok: boolean }>;

/** 公開状態。`unknown` は CORS/ネットワークで確認できなかった場合。 */
export type PublishStatus = 'published' | 'absent' | 'unknown';

function registryUrl(ref: PackageRef): string {
  const name = encodeURIComponent(ref.name);
  switch (ref.registry) {
    case 'pypi':
      return `https://pypi.org/pypi/${name}/json`;
    case 'npm':
      return `https://registry.npmjs.org/${name}`;
    case 'crates':
      return `https://crates.io/api/v1/crates/${name}`;
  }
}

/**
 * そのパッケージ名がレジストリに公開されているか確認する（I/O）。
 * 200=published、それ以外の応答=absent、失敗（CORS/ネットワーク）=unknown。
 * unknown と absent を分けることで、未公開アプリを誤って公開扱いしない。
 */
export async function checkRegistry(
  ref: PackageRef,
  fetchImpl: FetchLike = fetch
): Promise<PublishStatus> {
  try {
    const res = await fetchImpl(registryUrl(ref));
    return res.ok ? 'published' : 'absent';
  } catch {
    return 'unknown';
  }
}
