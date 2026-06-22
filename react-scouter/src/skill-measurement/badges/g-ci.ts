import type { BadgeDefinition } from './types';
import { hasFileNamed, hasFileUnder, hasPathMatching } from './path-utils';

/**
 * G-CI：CI/CD・自動化の痕跡を、設定ファイルの「存在」だけで加点するバッジ群。
 * ファイル内容やコミット履歴は読まず、パスのみで判定する純粋関数。
 *
 * DEFERRED(step4・workflow内容依存): matrix（マトリクスビルド）, cache最適化,
 *   pinned-action SHA（アクションのSHA固定）, least-privilege（権限最小化）,
 *   status-badge（READMEのCIバッジ）
 *   いずれも .github/workflows/*.yml の中身を読まないと判定できないため step4 に回す。
 */
export const ciBadges: BadgeDefinition[] = [
  {
    id: 'ci.workflows',
    group: 'G-CI',
    label: 'GitHub Actions ワークフロー',
    // .github/workflows/ 配下の .yml / .yaml をワークフローとみなす
    detect: (ctx) =>
      hasPathMatching(ctx.tree, /^\.github\/workflows\/.+\.ya?ml$/),
  },
  {
    id: 'ci.composite-action',
    group: 'G-CI',
    label: '自作Action公開',
    // リポジトリルートの action.yml / action.yaml は再利用可能なActionの定義
    detect: (ctx) => hasFileNamed(ctx.tree, 'action.yml', 'action.yaml'),
  },
  {
    id: 'ci.release-automation',
    group: 'G-CI',
    label: 'リリース自動化',
    // semantic-release / release-please / changesets のいずれかの設定があるか
    detect: (ctx) =>
      hasPathMatching(ctx.tree, /(^|\/)\.releaserc(\..+)?$/) ||
      hasFileNamed(ctx.tree, 'release-please-config.json') ||
      hasFileUnder(ctx.tree, '.changeset/'),
  },
  {
    id: 'ci.preview-env',
    group: 'G-CI',
    label: 'プレビュー環境',
    // Vercel / Netlify によるデプロイ・プレビュー設定
    detect: (ctx) => hasFileNamed(ctx.tree, 'vercel.json', 'netlify.toml'),
  },
  {
    id: 'ci.dependabot',
    group: 'G-CI',
    label: 'Dependabot',
    // .github/dependabot.yml による依存更新自動化
    detect: (ctx) => hasPathMatching(ctx.tree, /^\.github\/dependabot\.ya?ml$/),
  },
  {
    id: 'ci.renovate',
    group: 'G-CI',
    label: 'Renovate',
    // Renovate の設定ファイル（複数の慣習パスをORで拾う）
    detect: (ctx) =>
      hasFileNamed(
        ctx.tree,
        'renovate.json',
        '.renovaterc',
        '.renovaterc.json'
      ) || hasPathMatching(ctx.tree, /^\.github\/renovate\.json$/),
  },
];
