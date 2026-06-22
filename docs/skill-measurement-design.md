# スカウター測定強化 設計

## 解決したい問題

現状の戦闘力（`calculatePowerLevel`）は**ほぼ全部が量の足し算**（コミット数・PR数・star・follower・streak）。
これは「AI生成PRを無レビューでマージしまくる素人」ほど数字が上がる。**量で測る限り、量産者と実力者が分離できない。**

## 基本方針：二層構造

| 層 | 役割 | 性質 |
|---|---|---|
| **背骨ゲート（S0–S7）** | 階級＝桁を決める | **非補償**（量で代替不可） |
| **バッジ＋ヒューリスティック** | 階級内の精密ランク | **加点専用**（誤爆ゼロ優先） |

足し算スコアは compensatory（弱点を量で埋められる）＝スロップが勝つ。
ゲートは non-compensatory（その能力を実証しない限り次の桁に行けない）＝**スロップを構造的に殺す**。

- 階級 = 下から連続で通過できた最上位の背骨段
- 戦闘力 = 階級の帯ベース + 帯内ランク × 帯幅（**量では桁が動かない**）
- 表示 = 「中級 S3 ★★★★☆」＋ ✅/❌ チェックリスト（何をすれば上がるか可視化）

## サンプリング：全repoを舐めない、天井を測る

能力は代表作＝天井に出る。**private上位2 ＋ public上位3〜5（fork除外）= 計5〜7repo**。

- 自動抽出（直近活動 × コミット量 × コードサイズ）＋ **ユーザーがピン留め/差し替え可**
- これにより🟡のLLM採点も「7repoだけ読む」で現実的になる（ただし下記の理由でコア外）

### 2モード構成（潰し合わないので分ける）

| モード | スコープ | 対象 | 性格 |
|---|---|---|---|
| public スカウト（現状維持） | `public_repo` | 誰でも | バズ・占い |
| **deep 自己診断（新規）** | + `repo` | 自分だけ | 正確な実力測定 |

private は `repo` スコープが要り、かつ自分のものしか見えない → deep モードは自己診断ツールになる。
fine-grained PAT で対象repoを絞れる旨を案内する。

## LLM採点の扱い

設計品質の核心（抽象の妥当性・アルゴリズムの正しさ）は意味を読む＝LLMでしか測れない（🟡②）。
だが **client-only React/Vite アプリの境界を超える**（バックエンド or APIキー管理）。

→ **コアから外す。** 唯一スタンドアロンを保てる道＝ユーザーが自分のClaude APIキーを貼り
`anthropic-dangerous-direct-browser-access: true` で直接叩く方式は、**将来の任意トグル**として保留。

代わりに 🟡 の大半は「振る舞い・構造から数える」ヒューリスティックで代理する（後述 H群）。

---

## 検出可能性の凡例

- 🟢 repoツリー / メタデータから無料検出
- 🔵 ＋外部API（レジストリ・DL統計）必要
- 🟡 LLMコード読解が要る（コア外。一部は H群ヒューリスティックで代理）

---

## 第1層：背骨ゲート（非補償・順序固定）

| 段 | 階級 | 通過条件（実証内容） | 帯（仮） |
|---|---|---|---|
| S0 | 休眠 | original public repo 無し／活動なし | 0 |
| S1 | 初級 | 実コードのある original repo ≥1 | 〜10k |
| S2 | 中級見習い | 1 repo で **CI ∧ 非自明テスト ∧ Linter** が揃う | 〜30k |
| S3 | 中級 | **(PR駆動 ∨ ブランチ保護) ∧ (hooks ∨ タスクランナー)**＋プロフィールREADME | 〜60k |
| S4 | 上級見習い | **リリース/タグ ∨ コンテナ化 ∨ docsサイト**（出荷する） | 〜100k |
| S5 | 上級 | **レジストリにライブラリ公開**（PyPI/npm/crates…） | 〜200k |
| S6 | 上級+ | **外部merged PR ∨ review実施 ∨ 有意なstar**（他人が検証） | 〜400k |
| S7 | エキスパート | **実DL/利用数 ∨ 継続OSS貢献 ∨ 長期高star維持** | 400k〜 |

- 帯境界は仮。実データ分布で後較正
- S2 未満は何万コミットでもキャップ＝量産が頭打ち

### 降格キャップ（スロップ直撃）

一定規模（コード量・年齢）を超えた代表repoが
**テスト0 ∧ CI0 ∧ 全部main直コミット ∧ 定型コミット履歴** なら、量に関係なく **S1 にキャップ**。
若い/小さいrepoには適用しない（健全な新規開発を誤爆させない）。

---

## 第2層：バッジ（加点専用・ORグループで「実践」を評価）

ツールは互換グループ化。特定ツール縛りにせず実践そのものを拾う。各 🟢🔵 を検出。

### G-Git：バージョン管理規律
🟢 Conventional Commits ・🟢 atomic commit粒度 ・🟢 ブランチ命名規約 ・🟢 PR駆動 ・🟢 ブランチ保護 ・🟢 linear history ・🟢 署名コミット/タグ(Verified) ・🟢 PR/Issueテンプレート ・🟢 CODEOWNERS ・🟢 レビュー必須設定 ・🟢 `.gitattributes`/`.git-blame-ignore-revs` ・🟢 monorepo管理(turbo/nx)

### G-Quality：コード品質/静的解析
🟢 Linter ・🟢 Formatter ・🟢 型システム活用(TS strict/mypy/pyright) ・🟢 strict設定 ・🟢 複雑度制限 ・🟢 dead code検出 ・🟢 spell checker ・🟢 markdownlint/yamllint/shellcheck ・🟢 EditorConfig ・🟢 lintをCIでブロッキング ・🔵 Sonar/CodeClimate連携

### G-Test：テスト
🟢 単体(非自明) ・🟢 統合 ・🟢 E2E(playwright/cypress) ・🟢 カバレッジ閾値ゲート ・🟢 property-based ・🟢 mutation testing ・🟢 snapshot ・🟢 contract testing ・🟢 load/perf ・🟢 fuzzing ・🟢 CIテストマトリクス ・🟢 visual regression ・🟢 a11yテスト ・🔵 codecov/coverallsバッジ

### G-CI：CI/CD・自動化
🟢 CI存在 ・🟢 マトリクスビルド ・🟢 キャッシュ最適化 ・🟢 required checks連携 ・🟢 CD ・🟢 環境分離 ・🟢 リリース自動化(semantic-release/changesets) ・🔵 プレビュー環境 ・🟢 reusable/composite workflow ・🟢 pinned action SHA＋least-privilege ・🟢 status badge ・🔵 自作GitHub Action公開

### G-Build：ビルド/依存
🟢 ロックファイル ・🟢 依存自動更新(renovate/dependabot) ・🟢 脆弱性スキャン ・🟢 SBOM ・🟢 再現可能ビルド(nix/bazel) ・🟢 bundle size CI監視 ・🟢 cross-compile ・🟢 版マネージャ(mise/.nvmrc) ・🟢 先進PM(pnpm/uv/poetry/pdm)

### G-Release：リリース/配布
🟢 semver ・🟢 CHANGELOG維持 ・🟢 Releases+ノート ・🔵 レジストリ公開 ・🔵 複数ターゲット配布 ・🔵 プレリリース運用 ・🔵 provenance/署名 ・🔵 Homebrew/AUR/apt/snap ・🔵 Dockerイメージ公開(マルチアーキ) ・🔵 cosign署名 ・🔵 DL数/採用実績 ・🟢 deprecationポリシー

### G-Docs：ドキュメント
🟢 構造化README ・🟢 API自動生成(typedoc/sphinx/rustdoc/godoc) ・🔵 docsサイト ・🟢 examples/チュートリアル ・🟢 ADR ・🟢 mermaid/C4図 ・🟢 CONTRIBUTING ・🟢 CODE_OF_CONDUCT ・🟢 SECURITY.md ・🟢 doctest ・🟢 バージョン別ドキュメント

### G-Security：セキュリティ/サプライチェーン
🟢 secret scanning(gitleaks/trufflehog) ・🟢 SAST(CodeQL/semgrep/bandit) ・🟢 依存脆弱性スキャン ・🟢 SECURITY.md ・🟢 署名コミット ・🟢 SLSA/provenance/pinned actions ・🟢 SBOM ・🟢 container scan(trivy/grype) ・🟢 secrets管理(vault/sops) ・🔵 license compliance ・🔵 security advisory発行(GHSA)

### G-Ops：可観測性/運用
🟢 構造化ロギング ・🟢 メトリクス(prometheus/OTel) ・🟢 分散トレーシング ・🟢 ヘルスチェック ・🔵 sentry連携 ・🟢 dashboard as code ・🟢 SLO/SLI定義 ・🟢 runbook ・🟢 feature flags

### G-Infra：インフラ/DevOps
🟢 IaC(terraform/pulumi/cdk) ・🟢 構成管理(ansible) ・🟢 K8s/Helm/kustomize ・🟢 GitOps(argocd/flux) ・🟢 Dockerfile(multi-stage/distroless) ・🟢 devcontainer ・🟢 サーバレス

### G-Perf：性能
🟢 ベンチマークスイート(criterion/pytest-benchmark/JMH) ・🟢 ベンチのCI回帰検出 ・🟢 バイナリ/バンドルサイズ監視 ・🟢 負荷テスト

### G-API：API設計
🟢 OpenAPI/Swagger ・🟢 GraphQLスキーマ ・🟢 gRPC/protobuf ・🟢 APIバージョニング ・🟢 webhook設計 ・🟢 クライアント自動生成

### G-Data：データ/DB
🟢 マイグレーション管理(alembic/flyway/prisma) ・🟢 バリデーション(pydantic/zod) ・🟢 データパイプライン(airflow/dbt)

### G-Breadth：言語/ドメインの幅
🟢 複数言語の実用習熟(バイト量で重み) ・🟢 システム言語実績(Rust/C/C++/Go/Zig) ・🟢 関数型言語(Haskell/OCaml/Elixir/Clojure) ・🟢 複数ドメイン(web/CLI/lib/embedded/ML/game) ・🟡 高度専門ドメイン(分散/コンパイラ/DB内部/暗号/ML/グラフィックス) ※repo存在は🟢、中身の正しさは🟡

### G-OSS：OSSシチズンシップ
🟢 外部merged PR ・🟢 review given ・🟢 issue技術議論 ・🟢 triage/ラベリング ・🟢 GOVERNANCE/RFC ・🔵 Sponsors/funding ・🟢 複数org貢献 ・🟢 org member/commit権限 ・🟢 継続リリース

### G-Impact：外部インパクト
🟢 star帯(1/10/100/1k/10k) ・🟢 fork数 ・🔵 dependents数 ・🔵 DL数 ・🔵 awesome/used-by掲載 ・🟢 follower数 ・🟢 contributor数

### G-Comm：技術コミュニケーション/発信
🟢 PR説明/issue起票の質(長さ・構造) ・🔵 技術ブログ(zenn/dev.to) ・🟢 登壇/スライドrepo ・🟢 ADR/RFC執筆 ・🟢 図解

### G-Cross：横断品質(a11y/i18n/UX)
🟢 アクセシビリティ(axe/WCAG) ・🟢 国際化(i18n/l10n) ・🔵 Lighthouse CI ・🟢 design system/storybook

### G-Maturity：プロジェクト成熟度
🟢 changelog/semver/リリースサイクル ・🟢 マイルストーン運用 ・🟢 ラベル体系 ・🟢 後方互換性維持 ・🟢 deprecation段階運用

---

## 第3層：ヒューリスティック（🟡の代理・LLMなしでブラウザ計算）

意味は読まないが、振る舞い・構造の痕跡でスロップ/craftを分離する。ゲート判定の補強と craft 修正値に使う。

### H-a：構造メトリクス（ツリー＋blobサイズから）
- 最大/平均ファイル長 → **god-fileの臭い**
- テスト:本体 のファイル数・行数比 → テスト充実度
- ディレクトリ命名 → `features/ domain/`(縦割り) vs `controllers/ models/`(横割り) ＝ Screaming Architecture近似
- ディレクトリ深さ/ファンアウト

### H-b：コミット振る舞い（commits/PR APIから）※スロップ検出の本丸
- コミット粒度：追加/削除行の分布 → **巨大ダンプ vs atomic**
- **削除・リファクタ率**：純増一辺倒か、戻って整理しているか（AIは整理しない）
- メッセージ品質：Conventional Commits準拠率・定型/空メッセージ率
- 時系列：継続 vs バースト投下
- PR説明文の長さ・構造

### H-c：設定の厳密さ（key configを数ファイル取得して解析）
- `tsconfig.json` strict系フラグ／`mypy --strict`／eslintルール数 → 規律の深さ
- CIワークフローが test/lint/build を実走しているか（空workflowでない）

---

## 最終スコア合成

```
tier        = 通過した最上位の背骨段（降格キャップ適用後）
bandBase, bandWidth = tier に対応する帯

badgeFill   = 獲得バッジ数 / 関連バッジ総数            (0..1)
craftScore  = H-a/H-b/H-c の合成                       (0..1)

power = bandBase + (badgeFill * 0.5 + craftScore * 0.5) * bandWidth
```

- **桁は背骨が決める。バッジもヒューリスティックも帯を超えない。**
- 量（コミット/PR/star生数）はバッジ判定の材料に格下げ。生数の足し算で桁を稼ぐ経路を断つ。
- 表示は数値＋階級＋ゲートチェックリスト＋「次の段に必要なもの」。

---

## 実装順序（事故らない順）

1. **サンプリング＋ツリー取得基盤**（private対応 `repo` スコープ、代表repo抽出、ピン留めUI）
2. **背骨ゲート S1–S7 判定**（🟢中心＋🔵リリース/レジストリ）＋降格キャップ
3. **バッジ検出**（🟢無料分を優先、🔵は後追い）
4. **ヒューリスティック H-a/b/c**
5. **スコア合成＋表示（チェックリストUI）**
6. （任意・将来）BYO Claude key トグルで 🟡② 設計品質採点

各段は実装と同時にテストをコミット。検出ロジックは固定 fixture（実repoのツリー/コミットJSON）で検証し、assumed mock を禁ずる。
