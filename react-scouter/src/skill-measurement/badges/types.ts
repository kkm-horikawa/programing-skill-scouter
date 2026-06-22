import type { RepoTree } from '../types';

/** バッジのグループ（設計の G-* に対応）。第一弾は規律コア6グループ。 */
export type BadgeGroup =
  | 'G-Git'
  | 'G-Quality'
  | 'G-Test'
  | 'G-CI'
  | 'G-Build'
  | 'G-Security';

/**
 * ツリーから取れないメタデータ。I/O層（repos一覧・PR・コミット署名）が供給する。
 * 未取得は false 既定。バッジ判定を純粋に保つため評価ロジックからは分離する。
 */
export interface RepoBadgeMeta {
  /** デフォルトブランチが保護されているか */
  hasBranchProtection: boolean;
  /** Verified（署名済み）コミットがあるか */
  hasSignedCommits: boolean;
  /** merged PR が1件以上あるか（PR駆動フロー） */
  usesPullRequests: boolean;
}

/** バッジ判定の入力。🟢はtree中心、tree外はmetaが埋める。 */
export interface BadgeContext {
  tree: RepoTree;
  meta: RepoBadgeMeta;
}

/**
 * バッジ定義。加点専用（無くても減点しない）の micro-gate。
 * detect は「この1リポジトリがバッジを満たすか」を返す純粋関数。
 * サンプル全体では「いずれかのrepoが満たせば獲得」で集計する。
 */
export interface BadgeDefinition {
  /** 一意ID。`git.codeowners` のように `<group小文字>.<名前>` 形式 */
  id: string;
  group: BadgeGroup;
  /** 表示用ラベル */
  label: string;
  detect: (ctx: BadgeContext) => boolean;
}
