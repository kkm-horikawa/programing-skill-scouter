/**
 * H-b コミット振る舞い：スロップ検出の本丸。
 *
 * AIは生成し続けるが、戻って整理しない。だから振る舞いの痕跡で分離できる：
 * - 巨大ダンプ（1コミットに大量行）→ スロップの臭い
 * - 削除がほぼ無い純増一辺倒 → リファクタしていない
 * - 定型/空メッセージばかり → 思考の跡がない
 * 逆に atomic・削除あり・意味のあるメッセージは craft の跡。
 */

export interface CommitSummary {
  message: string;
  /** 追加行。per-commit stats を取得できた場合のみ */
  additions?: number;
  /** 削除行。同上 */
  deletions?: number;
}

const CONVENTIONAL =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:\s/i;

/** 中身の無い定型メッセージ（1行全体がこれだけ） */
const GENERIC =
  /^(update|updates|updated|fix|fixes|fixed|change|changes|changed|wip|misc|stuff|edit|edits|test|tests|commit|temp|tmp|minor|cleanup|patch|\.|,)\.?$/i;

/** 1コミットの変更行がこれを超えると「巨大ダンプ」 */
const GIANT_LINES = 800;
/** 削除シェアがこの値に達したら整理点は満点（純増一辺倒でない） */
const DELETION_SHARE_FULL = 0.25;

export interface CommitBehavior {
  count: number;
  conventionalRate: number;
  genericRate: number;
  /** deletions / (additions + deletions)。stats のあるコミットのみで算出 */
  deletionShare: number;
  /** GIANT_LINES 超のコミット割合（stats のあるコミットのみ） */
  giantDumpRate: number;
  /** 0..1。高いほど craft */
  score: number;
}

function firstLine(message: string): string {
  return message.split('\n')[0].trim();
}

/**
 * このコミット履歴がスロップ的か（巨大ダンプが多く、かつ定型メッセージが多い）。
 * 降格キャップ（gates）を H-b で強化するための判定。
 */
export function isCommitSlop(behavior: CommitBehavior): boolean {
  return (
    behavior.count > 0 &&
    behavior.giantDumpRate > 0.5 &&
    behavior.genericRate > 0.5
  );
}

export function commitBehavior(
  commits: readonly CommitSummary[]
): CommitBehavior {
  const count = commits.length;
  if (count === 0) {
    return {
      count: 0,
      conventionalRate: 0,
      genericRate: 0,
      deletionShare: 0,
      giantDumpRate: 0,
      score: 0,
    };
  }

  let conventional = 0;
  let generic = 0;
  for (const c of commits) {
    const line = firstLine(c.message);
    if (CONVENTIONAL.test(line)) conventional++;
    if (GENERIC.test(line)) generic++;
  }
  const conventionalRate = conventional / count;
  const genericRate = generic / count;

  const withStats = commits.filter(
    (c) => c.additions != null && c.deletions != null
  );
  let adds = 0;
  let dels = 0;
  let giant = 0;
  for (const c of withStats) {
    adds += c.additions ?? 0;
    dels += c.deletions ?? 0;
    if ((c.additions ?? 0) + (c.deletions ?? 0) > GIANT_LINES) giant++;
  }
  const deletionShare = adds + dels > 0 ? dels / (adds + dels) : 0;
  const giantDumpRate = withStats.length ? giant / withStats.length : 0;

  const messageScore = conventionalRate * 0.5 + (1 - genericRate) * 0.5;
  const refactorScore = Math.min(deletionShare / DELETION_SHARE_FULL, 1);
  const notGiantScore = 1 - giantDumpRate;
  const score =
    withStats.length > 0
      ? messageScore * 0.5 + refactorScore * 0.25 + notGiantScore * 0.25
      : messageScore;

  return {
    count,
    conventionalRate,
    genericRate,
    deletionShare,
    giantDumpRate,
    score,
  };
}
