/**
 * H-c 設定の厳密さ：規律の「深さ」を測る。
 *
 * Linter があるか（バッジ）でなく、どれだけ厳しく締めているか。
 * tsconfig の strict 系フラグや mypy strict は、規律を形だけでなく本気で
 * 効かせている証拠。少数の key config の中身を読んで判定する。
 */

/** tsconfig で数える strict 系フラグ */
const TS_STRICT_FLAGS = [
  'strict',
  'noImplicitAny',
  'strictNullChecks',
  'noUncheckedIndexedAccess',
  'exactOptionalPropertyTypes',
  'noImplicitOverride',
];

/** JSONC でも壊れないよう、フルパースせず `"flag": true` を正規表現で見る */
function tsStrictFlagCount(tsconfig: string): number {
  return TS_STRICT_FLAGS.filter((flag) =>
    new RegExp(`"${flag}"\\s*:\\s*true`).test(tsconfig)
  ).length;
}

function isPyStrict(content: string): boolean {
  // mypy.ini の `strict = True` / pyproject の [tool.mypy] strict = true
  return /strict\s*=\s*[Tt]rue/.test(content);
}

export interface ConfigRigor {
  /** 判定材料となる config を1つでも読めたか */
  hasData: boolean;
  /** 有効な tsconfig strict 系フラグ数 */
  tsStrictFlags: number;
  pyStrict: boolean;
  /** 0..1。高いほど厳格 */
  score: number;
}

/**
 * key config の中身から厳密さを測る。
 * @param files path → 内容。tsconfig.json / mypy.ini / pyproject.toml などを想定。
 */
export function configRigor(files: Record<string, string>): ConfigRigor {
  const tsconfig = files['tsconfig.json'];
  const pyConfig =
    files['mypy.ini'] ?? files['.mypy.ini'] ?? files['pyproject.toml'];

  const hasData = tsconfig != null || pyConfig != null;
  const tsStrictFlags = tsconfig ? tsStrictFlagCount(tsconfig) : 0;
  const pyStrict = pyConfig ? isPyStrict(pyConfig) : false;

  const parts: number[] = [];
  if (tsconfig != null) parts.push(Math.min(tsStrictFlags / 3, 1));
  if (pyConfig != null) parts.push(pyStrict ? 1 : 0);
  const score = parts.length
    ? parts.reduce((s, p) => s + p, 0) / parts.length
    : 0;

  return { hasData, tsStrictFlags, pyStrict, score };
}
