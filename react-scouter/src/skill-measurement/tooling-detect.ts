/**
 * リポジトリ root のファイル/ディレクトリ名から、依存には現れない
 * インフラ/ビルド/開発ツールを検出する（履歴書の使用技術を網羅するため）。
 *
 * 多数のエコシステム横断で広く拾う。曖昧/誤検出はあり得るが、下書きは網羅優先で、
 * カテゴリ分け・取捨は編集機能の人間に委ねる方針。
 * package.json / pyproject.toml 等の主要マニフェストは呼び出し側で別途扱うのでここには含めない。
 */

/** root のファイル名（小文字） → ツール/技術名 */
const TOOL_BY_FILENAME: Record<string, string> = {
  // タスクランナー / Git hooks / 開発ワークフロー
  justfile: 'just',
  '.justfile': 'just',
  taskfile: 'Task',
  'taskfile.yml': 'Task',
  'taskfile.yaml': 'Task',
  makefile: 'Make',
  'lefthook.yml': 'lefthook',
  'lefthook.yaml': 'lefthook',
  '.lefthook.yml': 'lefthook',
  '.pre-commit-config.yaml': 'pre-commit',
  'commitlint.config.js': 'commitlint',
  '.czrc': 'Commitizen',
  '.editorconfig': 'EditorConfig',
  // バージョン管理 / ツールチェーン
  '.tool-versions': 'asdf/mise',
  'mise.toml': 'mise',
  '.mise.toml': 'mise',
  '.nvmrc': 'nvm',
  '.node-version': 'Node version',
  'rust-toolchain.toml': 'Rust toolchain',
  'rust-toolchain': 'Rust toolchain',
  '.ruby-version': 'rbenv',
  '.python-version': 'pyenv',
  // コンテナ / オーケストレーション
  containerfile: 'Docker',
  'docker-compose.yml': 'Docker Compose',
  'docker-compose.yaml': 'Docker Compose',
  'compose.yml': 'Docker Compose',
  'compose.yaml': 'Docker Compose',
  'docker-bake.hcl': 'Docker Buildx',
  'kustomization.yaml': 'Kustomize',
  'kustomization.yml': 'Kustomize',
  'chart.yaml': 'Helm',
  'skaffold.yaml': 'Skaffold',
  tiltfile: 'Tilt',
  // IaC / クラウド
  'pulumi.yaml': 'Pulumi',
  'cdk.json': 'AWS CDK',
  'samconfig.toml': 'AWS SAM',
  'terragrunt.hcl': 'Terragrunt',
  '.terraform.lock.hcl': 'Terraform',
  vagrantfile: 'Vagrant',
  'serverless.yml': 'Serverless Framework',
  'serverless.yaml': 'Serverless Framework',
  'now.json': 'Vercel',
  'vercel.json': 'Vercel',
  'netlify.toml': 'Netlify',
  'fly.toml': 'Fly.io',
  'render.yaml': 'Render',
  'app.json': 'Heroku/Expo',
  procfile: 'Heroku',
  'railway.json': 'Railway',
  // CI/CD
  jenkinsfile: 'Jenkins',
  '.gitlab-ci.yml': 'GitLab CI',
  'azure-pipelines.yml': 'Azure Pipelines',
  '.drone.yml': 'Drone CI',
  'bitbucket-pipelines.yml': 'Bitbucket Pipelines',
  '.woodpecker.yml': 'Woodpecker CI',
  '.buildkite': 'Buildkite',
  // ビルド / モノレポ（JS/TS 周辺）
  'turbo.json': 'Turborepo',
  'nx.json': 'Nx',
  'lerna.json': 'Lerna',
  'pnpm-workspace.yaml': 'pnpm',
  'rush.json': 'Rush',
  '.swcrc': 'SWC',
  'rollup.config.js': 'Rollup',
  'webpack.config.js': 'webpack',
  'tailwind.config.js': 'Tailwind CSS',
  'tailwind.config.ts': 'Tailwind CSS',
  'postcss.config.js': 'PostCSS',
  'next.config.js': 'Next.js',
  'next.config.mjs': 'Next.js',
  'nuxt.config.ts': 'Nuxt',
  'svelte.config.js': 'Svelte',
  'astro.config.mjs': 'Astro',
  'remix.config.js': 'Remix',
  'vite.config.ts': 'Vite',
  'vite.config.js': 'Vite',
  'biome.json': 'Biome',
  'biome.jsonc': 'Biome',
  'deno.json': 'Deno',
  'deno.jsonc': 'Deno',
  'bun.lockb': 'Bun',
  // テスト（JS/TS）
  'playwright.config.ts': 'Playwright',
  'cypress.config.ts': 'Cypress',
  'jest.config.js': 'Jest',
  'vitest.config.ts': 'Vitest',
  'karma.conf.js': 'Karma',
  // Lint/Format（言語横断）
  '.eslintrc': 'ESLint',
  '.eslintrc.json': 'ESLint',
  '.eslintrc.js': 'ESLint',
  'eslint.config.js': 'ESLint',
  '.prettierrc': 'Prettier',
  '.prettierrc.json': 'Prettier',
  'ruff.toml': 'Ruff',
  '.ruff.toml': 'Ruff',
  'mypy.ini': 'mypy',
  '.flake8': 'Flake8',
  '.pylintrc': 'Pylint',
  '.rubocop.yml': 'RuboCop',
  '.golangci.yml': 'golangci-lint',
  '.golangci.yaml': 'golangci-lint',
  'clippy.toml': 'Clippy',
  'rustfmt.toml': 'rustfmt',
  '.rustfmt.toml': 'rustfmt',
  '.scalafmt.conf': 'scalafmt',
  'checkstyle.xml': 'Checkstyle',
  'detekt.yml': 'detekt',
  '.stylelintrc': 'stylelint',
  '.shellcheckrc': 'ShellCheck',
  // Python タスク/環境
  'tox.ini': 'tox',
  'noxfile.py': 'nox',
  pipfile: 'Pipenv',
  'environment.yml': 'Conda',
  'conftest.py': 'pytest',
  // Rust / Go / その他言語ツール
  'deny.toml': 'cargo-deny',
  'cross.toml': 'cross',
  '.goreleaser.yml': 'GoReleaser',
  '.goreleaser.yaml': 'GoReleaser',
  'air.toml': 'Air',
  'dune-project': 'Dune (OCaml)',
  'mix.exs': 'Elixir/Mix',
  'rebar.config': 'Erlang/Rebar3',
  'stack.yaml': 'Haskell/Stack',
  'pubspec.yaml': 'Flutter/Dart',
  podfile: 'CocoaPods',
  'project.clj': 'Clojure/Leiningen',
  'deps.edn': 'Clojure',
  // .NET
  'global.json': '.NET',
  'nuget.config': 'NuGet',
  'directory.build.props': '.NET',
  // DB / マイグレーション
  'alembic.ini': 'Alembic',
  'flyway.conf': 'Flyway',
  'knexfile.js': 'Knex',
  'liquibase.properties': 'Liquibase',
  // データ / ML
  'dvc.yaml': 'DVC',
  'dbt_project.yml': 'dbt',
  'params.yaml': 'DVC',
  // 依存自動化 / セキュリティ
  'renovate.json': 'Renovate',
  '.renovaterc': 'Renovate',
  '.gitleaks.toml': 'gitleaks',
  'trivy.yaml': 'Trivy',
  'sonar-project.properties': 'SonarQube',
  // ドキュメント
  'mkdocs.yml': 'MkDocs',
  'book.toml': 'mdBook',
  '.readthedocs.yaml': 'Read the Docs',
};

/** root のディレクトリ名（小文字） → ツール名 */
const TOOL_BY_DIRNAME: Record<string, string> = {
  terraform: 'Terraform',
  k8s: 'Kubernetes',
  kubernetes: 'Kubernetes',
  helm: 'Helm',
  charts: 'Helm',
  manifests: 'Kubernetes',
  ansible: 'Ansible',
  '.husky': 'husky',
  '.githooks': 'Git hooks',
  '.changeset': 'Changesets',
  '.devcontainer': 'Dev Container',
  fastlane: 'Fastlane',
  '.dvc': 'DVC',
  dags: 'Airflow',
  '.cargo': 'Cargo',
  '.mvn': 'Maven',
  '.circleci': 'CircleCI',
  cdk: 'AWS CDK',
  pulumi: 'Pulumi',
  '.storybook': 'Storybook',
  supabase: 'Supabase',
  prisma: 'Prisma',
  migrations: 'DB migrations',
};

/** 接尾辞（小文字） → ツール名。複合拡張子は単純拡張子より前に置く。 */
const TOOL_BY_SUFFIX: ReadonlyArray<readonly [string, string]> = [
  ['.tf.json', 'Terraform'],
  ['.pkr.hcl', 'Packer'],
  ['.tf', 'Terraform'],
  ['.tfvars', 'Terraform'],
  ['.bicep', 'Bicep'],
  ['.csproj', '.NET'],
  ['.fsproj', 'F#'],
  ['.vbproj', '.NET'],
  ['.sln', '.NET'],
  ['.ipynb', 'Jupyter'],
  ['.podspec', 'CocoaPods'],
  ['.gemspec', 'RubyGems'],
  ['.cabal', 'Haskell/Cabal'],
  ['.nimble', 'Nim'],
  ['.gradle', 'Gradle'],
];

/**
 * root contents の1エントリ（name, type）から、検出したツール名を返す（無ければ null）。
 */
export function detectTool(name: string, type: string): string | null {
  const lower = name.toLowerCase();
  if (type === 'dir') {
    return TOOL_BY_DIRNAME[lower] ?? null;
  }
  if (TOOL_BY_FILENAME[lower]) return TOOL_BY_FILENAME[lower];
  for (const [suffix, tool] of TOOL_BY_SUFFIX) {
    if (lower.endsWith(suffix)) return tool;
  }
  return null;
}
