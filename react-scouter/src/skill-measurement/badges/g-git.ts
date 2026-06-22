import type { BadgeDefinition } from './types';
import { blobPaths, hasFileNamed } from './path-utils';

// DEFERRED(step4): conventional-commits, atomic-commits, branch-naming, linear-history
//   いずれもコミット履歴（メッセージ・差分粒度・ブランチ名・マージ形態）が必要で、
//   RepoTree のパスや meta フラグだけでは判定できないため step4 に回す。

/**
 * G-Git: Git 運用の規律。テンプレート・所有者定義・属性ファイル・モノレポ構成・
 * 保護/署名/PR駆動といった「リポジトリ運用の作法」をパスと meta から検出する。
 */
export const gitBadges: BadgeDefinition[] = [
  {
    id: 'git.pr-template',
    group: 'G-Git',
    label: 'PR テンプレート',
    // GitHub が認識する3経路（.github 直下 / 複数テンプレ用ディレクトリ / docs 直下）を OR で見る。
    detect: ({ tree }) =>
      blobPaths(tree).some(
        (p) =>
          p === '.github/PULL_REQUEST_TEMPLATE.md' ||
          p.startsWith('.github/PULL_REQUEST_TEMPLATE/') ||
          p === 'docs/pull_request_template.md'
      ),
  },
  {
    id: 'git.issue-template',
    group: 'G-Git',
    label: 'Issue テンプレート',
    // 単一テンプレ（.github/ISSUE_TEMPLATE.md）と複数テンプレ用ディレクトリの両形式を許容する。
    detect: ({ tree }) =>
      blobPaths(tree).some(
        (p) =>
          p === '.github/ISSUE_TEMPLATE.md' ||
          p.startsWith('.github/ISSUE_TEMPLATE/')
      ),
  },
  {
    id: 'git.codeowners',
    group: 'G-Git',
    label: 'CODEOWNERS',
    // GitHub が CODEOWNERS を探す3つの場所（root / .github / docs）のどこにあっても可とする。
    detect: ({ tree }) =>
      blobPaths(tree).some(
        (p) =>
          p === 'CODEOWNERS' ||
          p === '.github/CODEOWNERS' ||
          p === 'docs/CODEOWNERS'
      ),
  },
  {
    id: 'git.gitattributes',
    group: 'G-Git',
    label: '.gitattributes',
    // 改行・diff・LFS など属性を明示管理している証跡。basename 一致で十分。
    detect: ({ tree }) => hasFileNamed(tree, '.gitattributes'),
  },
  {
    id: 'git.blame-ignore',
    group: 'G-Git',
    label: 'blame 無視リビジョン',
    // 一括整形コミットを blame から除外する設定。運用の成熟度を示す。
    detect: ({ tree }) => hasFileNamed(tree, '.git-blame-ignore-revs'),
  },
  {
    id: 'git.monorepo',
    group: 'G-Git',
    label: 'モノレポ構成',
    // 代表的なモノレポ管理ツールの設定ファイルのいずれかが root にあれば成立とみなす。
    detect: ({ tree }) =>
      hasFileNamed(
        tree,
        'pnpm-workspace.yaml',
        'lerna.json',
        'nx.json',
        'turbo.json'
      ),
  },
  {
    id: 'git.branch-protection',
    group: 'G-Git',
    label: 'ブランチ保護',
    // ツリーには現れないため I/O 層が供給する meta フラグで判定する。
    detect: ({ meta }) => meta.hasBranchProtection,
  },
  {
    id: 'git.signed-commits',
    group: 'G-Git',
    label: '署名コミット',
    // Verified コミットの有無は meta が供給する。
    detect: ({ meta }) => meta.hasSignedCommits,
  },
  {
    id: 'git.pr-driven',
    group: 'G-Git',
    label: 'PR 駆動開発',
    // merged PR の有無は meta が供給する。
    detect: ({ meta }) => meta.usesPullRequests,
  },
];
