import type { BadgeDefinition } from './types';
import {
  hasBasenameMatching,
  hasFileNamed,
  hasFileUnder,
  hasPathMatching,
} from './path-utils';

/**
 * G-Security：セキュリティ実践の痕跡をリポジトリツリーから検出する加点バッジ群。
 * ファイル内容は読まず、設定ファイルの存在パターンだけで判定する純粋関数。
 *
 * DEFERRED(step4): 以下は workflow YAML の中身を読まないと判定できないため未実装。
 *   - security.slsa（SLSA / provenance 生成ステップ）
 *   - security.pinned-actions（actions を commit SHA でピン留めしているか）
 *   - security.sbom（SBOM 生成ステップ）
 *   dependabot は G-CI グループ担当のため当グループでは扱わない。
 */
export const securityBadges: BadgeDefinition[] = [
  {
    id: 'security.policy',
    group: 'G-Security',
    label: 'セキュリティポリシー（SECURITY.md）',
    // GitHub が探す既定の場所（ルート / .github/ / docs/）の SECURITY.md を拾う
    detect: ({ tree }) =>
      hasPathMatching(tree, /^(\.github\/|docs\/)?SECURITY\.md$/),
  },
  {
    id: 'security.codeql',
    group: 'G-Security',
    label: 'CodeQL コード解析',
    // ワークフロー配下に codeql を名前に含む yml があれば CodeQL 運用とみなす
    detect: ({ tree }) =>
      hasPathMatching(tree, /^\.github\/workflows\/.*codeql.*\.ya?ml$/i),
  },
  {
    id: 'security.sast',
    group: 'G-Security',
    label: '静的解析（SAST）',
    // semgrep / bandit / gosec の設定ファイルの存在で SAST 導入を検出
    detect: ({ tree }) =>
      hasFileNamed(
        tree,
        '.semgrep.yml',
        'semgrep.yml',
        '.bandit',
        'bandit.yaml',
        '.gosec.json'
      ),
  },
  {
    id: 'security.secret-scan',
    group: 'G-Security',
    label: 'シークレットスキャン',
    // gitleaks / trufflehog の設定でコミット内の秘密情報検出を検出
    detect: ({ tree }) =>
      hasFileNamed(tree, '.gitleaks.toml', 'gitleaks.toml') ||
      hasBasenameMatching(tree, /^\.trufflehog\..+$/),
  },
  {
    id: 'security.container-scan',
    group: 'G-Security',
    label: 'コンテナイメージスキャン',
    // trivy / grype の設定でイメージ脆弱性スキャンを検出
    detect: ({ tree }) =>
      hasFileNamed(tree, 'trivy.yaml', '.trivyignore', 'grype.yaml'),
  },
  {
    id: 'security.secrets-mgmt',
    group: 'G-Security',
    label: 'シークレット管理（暗号化）',
    // sops / sealed-secrets で秘密情報を暗号化管理しているか
    detect: ({ tree }) =>
      hasFileNamed(tree, '.sops.yaml', '.sops.yml') ||
      hasFileUnder(tree, 'sealed-secrets') ||
      hasPathMatching(tree, /(^|\/)sealed-secrets/),
  },
];
