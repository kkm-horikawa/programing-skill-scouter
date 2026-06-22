import type { GitHubRepo } from '../types/github';

/** リポジトリの公開状態 */
export type RepoVisibility = 'public' | 'private';

/**
 * サンプルに選ばれた代表リポジトリ。
 * 能力は「全repoの量」ではなく「代表作＝天井」に出る、という前提のサンプル単位。
 */
export interface SampledRepo {
  repo: GitHubRepo;
  visibility: RepoVisibility;
  /** 代表性スコア（高いほど本命。recency × volume × reach の合成） */
  representativeness: number;
  /** ユーザーが手動でピン留めしたか */
  pinned: boolean;
}

/** 代表リポジトリ選定の設定 */
export interface SamplingPolicy {
  /** private から自動採用する最大数 */
  maxPrivate: number;
  /** public から自動採用する最大数 */
  maxPublic: number;
  /** 常に含める repo の full_name（ユーザーの手動上書き） */
  pinnedFullNames: readonly string[];
}

/** private 上位2 ＋ public 上位5。設計の既定値。 */
export const DEFAULT_SAMPLING_POLICY: SamplingPolicy = {
  maxPrivate: 2,
  maxPublic: 5,
  pinnedFullNames: [],
};

/** リポジトリツリーの1エントリ */
export interface RepoTreeEntry {
  path: string;
  type: 'blob' | 'tree' | 'commit';
  /** blob のバイトサイズ。tree / commit では未定義 */
  size?: number;
}

/** git/trees から取得した1リポジトリの全パス */
export interface RepoTree {
  fullName: string;
  branch: string;
  entries: RepoTreeEntry[];
  /** GitHub が巨大ツリーを打ち切ったか（打ち切り時は一部欠落） */
  truncated: boolean;
}
