import type { RepoTree } from '../types';
import {
  commitBehavior,
  type CommitBehavior,
  type CommitSummary,
} from './commit-behavior';
import { configRigor, type ConfigRigor } from './config-rigor';
import { structureMetrics, type StructureMetrics } from './structure';

export type { CommitSummary } from './commit-behavior';
export type { ConfigRigor } from './config-rigor';
export { structureMetrics } from './structure';
export { commitBehavior } from './commit-behavior';
export { configRigor } from './config-rigor';

/** 1リポジトリの craft 計量（H-a 構造 ＋ H-b コミット振る舞い ＋ H-c 設定厳密さ）。 */
export interface CraftMetrics {
  structure: StructureMetrics;
  commits: CommitBehavior;
  config: ConfigRigor;
  /** 0..1。スコア合成の craftScore に入る */
  craftScore: number;
}

/**
 * ツリー・コミット列・key config から1リポジトリの craft を測る。
 * 取れた信号だけで合成する（コミットや config が無い repo でも破綻しない）。
 */
export function craftMetrics(
  tree: RepoTree,
  commits: readonly CommitSummary[] = [],
  configFiles: Record<string, string> = {}
): CraftMetrics {
  const structure = structureMetrics(tree);
  const commits_ = commitBehavior(commits);
  const config = configRigor(configFiles);

  // 取れた信号に重みを置き、欠けたら残りで正規化する
  const parts: Array<{ value: number; weight: number }> = [
    { value: structure.score, weight: 0.4 },
  ];
  if (commits_.count > 0) parts.push({ value: commits_.score, weight: 0.4 });
  if (config.hasData) parts.push({ value: config.score, weight: 0.2 });

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const craftScore =
    parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight;

  return { structure, commits: commits_, config, craftScore };
}
