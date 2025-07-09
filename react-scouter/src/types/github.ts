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

export interface DetailedTechData {
  username: string;
  powerLevel: number;
  languages: ProcessedLanguage[];
  techStack: TechStack;
  stats: {
    repos: number;
    stars: number;
    contributions: number;
  };
}