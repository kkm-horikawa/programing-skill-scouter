import type { RepoTree } from '../types';

/** パスの最後の要素（ファイル名/ディレクトリ名） */
export function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** blob（ファイル）のフルパス一覧 */
export function blobPaths(tree: RepoTree): string[] {
  return tree.entries.filter((e) => e.type === 'blob').map((e) => e.path);
}

/** blob（ファイル）の basename 一覧 */
export function blobBasenames(tree: RepoTree): string[] {
  return blobPaths(tree).map(basename);
}

/** いずれかのエントリのフルパスが正規表現にマッチするか */
export function hasPathMatching(tree: RepoTree, re: RegExp): boolean {
  return tree.entries.some((e) => re.test(e.path));
}

/** いずれかの blob の basename が正規表現にマッチするか */
export function hasBasenameMatching(tree: RepoTree, re: RegExp): boolean {
  return blobBasenames(tree).some((b) => re.test(b));
}

/** 指定 basename のファイルがちょうど存在するか（複数候補をORで） */
export function hasFileNamed(tree: RepoTree, ...names: string[]): boolean {
  const set = new Set(names);
  return blobBasenames(tree).some((b) => set.has(b));
}

/** 指定プレフィックスのディレクトリ配下にファイルが存在するか */
export function hasFileUnder(tree: RepoTree, ...prefixes: string[]): boolean {
  return blobPaths(tree).some((p) => prefixes.some((pre) => p.startsWith(pre)));
}
