export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  hireable: boolean | null;
  bio: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
  };
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  languages_url: string;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language: string | null;
  size: number;
}

export interface GitHubEvent {
  id: string;
  type: string;
  actor: {
    id: number;
    login: string;
    avatar_url: string;
  };
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: {
    commits?: Array<{
      sha: string;
      message: string;
      author: {
        name: string;
        email: string;
      };
    }>;
    pull_request?: {
      id: number;
      title: string;
      state: string;
    };
    issue?: {
      id: number;
      title: string;
      state: string;
    };
  };
  created_at: string;
}

export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface GitHubRateLimit {
  rate: RateLimit;
  search: RateLimit;
  graphql: RateLimit;
  integration_manifest: RateLimit;
  source_import: RateLimit;
  code_scanning_upload: RateLimit;
  actions_runner_registration: RateLimit;
  scim: RateLimit;
  dependency_snapshots: RateLimit;
}

export interface LanguageStats {
  [language: string]: number;
}

export interface ProcessedLanguage {
  name: string;
  percentage: number;
  bytes: number;
}

export interface TechStack {
  languages: Record<string, number>;
  frameworks: Set<string>;
  devops: Set<string>;
  testing: Set<string>;
  databases: Set<string>;
  infrastructure: Set<string>;
}

export interface ActivityData {
  commits: number;
  pullRequests: number;
  issues: number;
  recentContributions: number;
}

export interface PowerLevelResult {
  power: number;
  stats: {
    repos: number;
    originalRepos: number;
    stars: number;
    forks: number;
    followers: number;
    following: number;
    accountAge: number;
    languages: ProcessedLanguage[];
    activity: ActivityData;
    gists: number;
  };
}

// プロフィールREADME情報
export interface ProfileReadme {
  content: string | null;
  hasReadme: boolean;
  sections: {
    introduction?: string;
    skills?: string;
    projects?: string;
    contact?: string;
    other?: string[];
  };
}

// アチーブメント情報
export interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'SECRET';
  category: string;
  unlockedAt: string;
  badgeUrl?: string;
}

// リポジトリの詳細情報
export interface DetailedRepo extends GitHubRepo {
  topics: string[];
  license: {
    key: string;
    name: string;
  } | null;
  default_branch: string;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  archived: boolean;
  disabled: boolean;
  readme?: {
    content: string;
    hasDemo: boolean;
    hasDocumentation: boolean;
    technologies: string[];
  };
}

// 拡張されたユーザー情報
export interface ExtendedGitHubUser extends GitHubUser {
  twitter_username: string | null;
  gravatar_id: string | null;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  // プロフィール追加情報
  profile: {
    pronouns?: string;
    work?: string;
    education?: string;
    interests?: string[];
    achievements?: Achievement[];
    sponsors?: {
      isSponsoring: boolean;
      sponsorsCount: number;
      sponsoringCount: number;
    };
  };
}

// 組織情報
export interface Organization {
  login: string;
  id: number;
  url: string;
  avatar_url: string;
  description: string | null;
}

// コントリビューション詳細
export interface ContributionDetails {
  totalContributions: number;
  weeks: Array<{
    contributionDays: Array<{
      contributionCount: number;
      date: string;
    }>;
  }>;
  mostActiveDay: string;
  longestStreak: number;
  currentStreak: number;
}

// ライブラリ情報の型定義
export interface LibraryInfo {
  name: string;
  category: string;
  usage: number; // 使用しているリポジトリ数
  versions: string[]; // 使用されているバージョン
}

export interface LanguageLibraries {
  language: string;
  libraries: LibraryInfo[];
  totalLibraries: number;
}

export interface DetailedTechData {
  username: string;
  powerLevel: number;
  languages: ProcessedLanguage[];
  techStack: TechStack;
  stats: {
    repos: number;
    stars: number;
    contributions: number;
    followers: number;
    following: number;
    gists: number;
  };
  // 拡張情報
  profile: ExtendedGitHubUser;
  profileReadme: ProfileReadme;
  achievements: Achievement[];
  topRepositories: DetailedRepo[];
  organizations: Organization[];
  contributionDetails: ContributionDetails;
  accountMetrics: {
    accountAge: number; // 日数
    firstCommitDate: string | null;
    lastActiveDate: string;
    totalCommits: number;
    totalPullRequests: number;
    totalIssues: number;
  };
  // ライブラリ情報
  libraryAnalysis?: {
    languages: LanguageLibraries[];
    topLibraries: LibraryInfo[]; // 全言語での上位ライブラリ
    totalUniqueLibraries: number;
  };
}