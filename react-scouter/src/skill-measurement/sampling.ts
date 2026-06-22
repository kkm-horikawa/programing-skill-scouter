import type { GitHubRepo } from '../types/github';
import {
  DEFAULT_SAMPLING_POLICY,
  type SampledRepo,
  type SamplingPolicy,
} from './types';

const DAY_MS = 1000 * 60 * 60 * 24;

/** 代表性スコアの重み。recency を最重視（＝今まさに触っている本命を拾う）。 */
export const REPRESENTATIVENESS_WEIGHTS = {
  recency: 2,
  volume: 1,
  reach: 1,
} as const;

/** pushed_at の新しさ。0日で1.0、約260日で 1/e に減衰。 */
function recencyWeight(pushedAt: string, now: number): number {
  const days = (now - Date.parse(pushedAt)) / DAY_MS;
  if (!Number.isFinite(days)) return 0;
  return Math.exp(-Math.max(0, days) / 260);
}

/** コードのボリューム（size は KB）。おもちゃ repo を弾くため対数で効かせる。 */
function volumeWeight(sizeKb: number): number {
  return Math.log10(Math.max(0, sizeKb) + 1);
}

/** 外部到達（star）。private では使わない。 */
function reachWeight(stars: number): number {
  return Math.log10(Math.max(0, stars) + 1);
}

/**
 * 代表性スコア＝「この repo が本人の実力を映す度合い」。
 * 最近触っていて・実体があり・（公開なら）他人に届いているほど高い。
 */
export function representativeness(repo: GitHubRepo, now: number): number {
  const w = REPRESENTATIVENESS_WEIGHTS;
  const reach = repo.private ? 0 : reachWeight(repo.stargazers_count);
  return (
    recencyWeight(repo.pushed_at, now) * w.recency +
    volumeWeight(repo.size) * w.volume +
    reach * w.reach
  );
}

function toSampled(
  repo: GitHubRepo,
  now: number,
  pinned: boolean
): SampledRepo {
  return {
    repo,
    visibility: repo.private ? 'private' : 'public',
    representativeness: representativeness(repo, now),
    pinned,
  };
}

/**
 * 代表リポジトリを選ぶ。
 *
 * - fork は除外（自分の設計を映さないため）。ただしピン留めは fork でも尊重する。
 * - private / public ごとに代表性スコアの上位を採る。
 * - ピン留めは必ず含め、その分の自動枠を消費する。ピンだけで枠を超える場合も全て含める。
 *
 * @param now テスト容易性のため注入可能（既定は現在時刻）
 */
export function selectRepresentativeRepos(
  repos: readonly GitHubRepo[],
  policy: SamplingPolicy = DEFAULT_SAMPLING_POLICY,
  now: number = Date.now()
): SampledRepo[] {
  const pinnedSet = new Set(policy.pinnedFullNames);

  const pinned = repos
    .filter((r) => pinnedSet.has(r.full_name))
    .map((r) => toSampled(r, now, true));

  const pinnedFullNames = new Set(pinned.map((s) => s.repo.full_name));

  const auto = repos
    .filter((r) => !r.fork && !pinnedFullNames.has(r.full_name))
    .map((r) => toSampled(r, now, false))
    .sort((a, b) => b.representativeness - a.representativeness);

  const result: SampledRepo[] = [...pinned];

  const remaining = (visibility: SampledRepo['visibility'], max: number) => {
    const used = pinned.filter((s) => s.visibility === visibility).length;
    return Math.max(0, max - used);
  };

  let privateSlots = remaining('private', policy.maxPrivate);
  let publicSlots = remaining('public', policy.maxPublic);

  for (const candidate of auto) {
    if (candidate.visibility === 'private' && privateSlots > 0) {
      result.push(candidate);
      privateSlots--;
    } else if (candidate.visibility === 'public' && publicSlots > 0) {
      result.push(candidate);
      publicSlots--;
    }
  }

  return result;
}
