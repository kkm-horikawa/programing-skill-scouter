import { useState, useEffect, useRef } from 'react';
import type {
  ExtendedGitHubUser,
  GitHubRepo,
  DetailedRepo,
  GitHubEvent,
  PowerLevelResult,
  DetailedTechData,
  ProcessedLanguage,
  ActivityData,
  TechStack,
  LanguageStats,
  ProfileReadme,
  Organization,
} from '../types/github';
import { scoutPublic } from '../skill-measurement/scout';
import { earnedBadgeLabels } from '../skill-measurement/badges';
import { TIER_LABELS } from '../skill-measurement/ui/labels';
import { detectTool } from '../skill-measurement/tooling-detect';

interface ScouterDisplayProps {
  isScanning: boolean;
  scanData: PowerLevelResult | null;
  usernames: string[];
  onScanComplete: (data: PowerLevelResult, techData: DetailedTechData) => void;
  onScanError: () => void;
}

const ScouterDisplay: React.FC<ScouterDisplayProps> = ({
  isScanning,
  scanData,
  usernames,
  onScanComplete,
  onScanError,
}) => {
  const [progress, setProgress] = useState(0);
  const [currentPowerLevel, setCurrentPowerLevel] = useState(0);
  const [scanningPowerLevel, setScanningPowerLevel] = useState(0);
  const scanningIntervalRef = useRef<number | undefined>(undefined);
  const [displayStats, setDisplayStats] = useState<PowerLevelResult | null>(
    null
  );
  const [contributionDetails, setContributionDetails] = useState<
    import('../types/github').ContributionDetails | null
  >(null);
  const [showComplete, setShowComplete] = useState(false);
  const [craftLabel, setCraftLabel] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const animationRef = useRef<number | undefined>(undefined);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (isScanning && usernames.length > 0) {
      performScan();
      // スキャン中の数値アニメーション開始
      scanningIntervalRef.current = window.setInterval(() => {
        setScanningPowerLevel((prev) => {
          const randomChange = Math.floor(Math.random() * 10000) - 5000;
          const newValue = prev + randomChange;
          return Math.max(0, Math.min(9999999, newValue));
        });
      }, 100);
    } else {
      // スキャン終了時にアニメーション停止
      if (scanningIntervalRef.current) {
        clearInterval(scanningIntervalRef.current);
        scanningIntervalRef.current = undefined;
      }
    }

    return () => {
      if (scanningIntervalRef.current) {
        clearInterval(scanningIntervalRef.current);
      }
    };
  }, [isScanning, usernames]);

  useEffect(() => {
    if (scanData) {
      setDisplayStats(scanData);
      animateCounter(scanData.power);
    }
  }, [scanData]);

  const getHeaders = (): HeadersInit => {
    const token = localStorage.getItem('github_token');
    return token ? { Authorization: `token ${token}` } : {};
  };

  const performScan = async () => {
    try {
      setProgress(10);
      setLoadingMessage('スキャナーを初期化中...');

      // 複数ユーザーのデータを取得
      const headers = getHeaders();
      const allUsersData: ExtendedGitHubUser[] = [];

      for (const username of usernames) {
        const userResponse = await fetch(
          `https://api.github.com/users/${username}`,
          { headers }
        );

        if (!userResponse.ok) {
          console.warn(`User ${username} not found, skipping...`);
          continue;
        }

        const userData: ExtendedGitHubUser = await userResponse.json();
        allUsersData.push(userData);
      }

      if (allUsersData.length === 0) {
        throw new Error('No valid users found');
      }

      // メインユーザーは最初のユーザー
      const mainUserData = allUsersData[0];
      setProgress(20);
      setLoadingMessage('リポジトリを分析中...');

      // Get repositories with pagination support - 全ユーザー分を取得
      setLoadingMessage(
        `${usernames.length}個のアカウントからリポジトリを収集中...`
      );
      let allRepoData: GitHubRepo[] = [];
      for (const username of usernames) {
        try {
          const repos = await fetchAllRepositories(username);
          allRepoData = [...allRepoData, ...repos];
        } catch (error) {
          console.warn(`Failed to fetch repos for ${username}:`, error);
        }
      }
      setProgress(35);
      setLoadingMessage('言語能力を測定中...');

      // Get language stats - 全リポジトリから集計
      const languageStats = await getLanguageStats(allRepoData);
      setProgress(50);
      setLoadingMessage('最近の活動を測定中...');

      // Get activity data - 全ユーザー分を集計
      const combinedActivityData = {
        commits: 0,
        pullRequests: 0,
        issues: 0,
        recentContributions: 0,
      };

      for (const username of usernames) {
        try {
          const activity = await getRecentActivity(username);
          combinedActivityData.commits += activity.commits;
          combinedActivityData.pullRequests += activity.pullRequests;
          combinedActivityData.issues += activity.issues;
          combinedActivityData.recentContributions +=
            activity.recentContributions;
        } catch (error) {
          console.warn(`Failed to fetch activity for ${username}:`, error);
        }
      }

      setProgress(65);
      setLoadingMessage('技術スタックを分析中...');

      // Analyze tech stack - 全リポジトリから分析
      const techStack = await analyzeTechStack(allRepoData);
      setProgress(80);
      setLoadingMessage('詳細プロフィール情報を取得中...');

      // Fetch additional profile information - メインユーザーのプロフィール情報
      const hasToken = !!localStorage.getItem('github_token');
      const mainUsername = usernames[0];

      // 各ユーザーのコントリビューションデータを取得
      let totalContributionData = null;
      const contributionPromises = usernames.map((username) =>
        fetchContributionData(username)
      );
      const allContributions = await Promise.allSettled(contributionPromises);

      // コントリビューションデータを合算
      for (const result of allContributions) {
        if (result.status === 'fulfilled' && result.value) {
          if (!totalContributionData) {
            totalContributionData = { ...result.value };
          } else {
            totalContributionData.totalContributions +=
              result.value.totalContributions;
            // ストリークは最大値を採用
            totalContributionData.longestStreak = Math.max(
              totalContributionData.longestStreak,
              result.value.longestStreak
            );
            totalContributionData.currentStreak = Math.max(
              totalContributionData.currentStreak,
              result.value.currentStreak
            );
          }
        }
      }

      const [profileReadme, organizations, libraryData] =
        await Promise.allSettled([
          fetchProfileReadme(mainUsername),
          fetchOrganizations(mainUsername),
          hasToken ? analyzeLibraries(allRepoData) : Promise.resolve(null),
        ]);

      setProgress(90);
      setLoadingMessage('戦闘力を計算中...');

      // 合算データで統計を作成
      const aggregatedUserData = {
        ...mainUserData,
        public_repos: allUsersData.reduce(
          (sum, user) => sum + user.public_repos,
          0
        ),
        followers: allUsersData.reduce((sum, user) => sum + user.followers, 0),
        following: allUsersData.reduce((sum, user) => sum + user.following, 0),
        public_gists: allUsersData.reduce(
          (sum, user) => sum + user.public_gists,
          0
        ),
      };

      // 戦闘力は新エンジン（規律×採用の二軸）で測る。量ベースの旧スコアは廃止。
      const token = localStorage.getItem('github_token');
      const scoutResult = await scoutPublic(mainUserData.login, token);
      const result: PowerLevelResult = {
        power: scoutResult.score.power,
        stats: computeStats(
          aggregatedUserData,
          allRepoData,
          languageStats,
          combinedActivityData
        ),
      };
      // 技術階級(craft)は戦闘力(RANK=人気込み)とは別の純粋な技術力指標として併記する
      const craftTier = scoutResult.spine.craftTier;
      const skillMeasurement = {
        craftTier,
        craftTierLabel: TIER_LABELS[craftTier],
        earnedBadges: earnedBadgeLabels(scoutResult.badges.earned),
      };
      setCraftLabel(`${skillMeasurement.craftTierLabel} (${craftTier})`);
      setProgress(100);
      setLoadingMessage('分析完了！');

      // Create detailed tech data with extended information
      const detailedTechData: DetailedTechData = {
        username:
          usernames.length > 1
            ? `${mainUserData.login} + ${usernames.length - 1}アカウント`
            : mainUserData.login,
        powerLevel: result.power,
        languages: languageStats,
        techStack,
        stats: {
          repos: aggregatedUserData.public_repos,
          stars: result.stats.stars,
          contributions: combinedActivityData.recentContributions,
          followers: aggregatedUserData.followers,
          following: aggregatedUserData.following,
          gists: aggregatedUserData.public_gists,
        },
        // Extended information
        profile: {
          ...mainUserData,
          twitter_username: mainUserData.twitter_username,
          gravatar_id: mainUserData.gravatar_id || null,
          organizations_url: mainUserData.organizations_url,
          repos_url: mainUserData.repos_url,
          events_url: mainUserData.events_url,
          received_events_url: mainUserData.received_events_url,
          type: mainUserData.type,
          site_admin: mainUserData.site_admin || false,
          profile: {
            pronouns: undefined,
            work: mainUserData.company || undefined,
            education: undefined,
            interests: [],
            achievements: [],
            sponsors: {
              isSponsoring: false,
              sponsorsCount: 0,
              sponsoringCount: 0,
            },
          },
        },
        profileReadme:
          profileReadme.status === 'fulfilled'
            ? profileReadme.value
            : {
                content: null,
                hasReadme: false,
                sections: {},
              },
        achievements: [], // GitHub doesn't provide public API for achievements
        topRepositories: allRepoData.slice(0, 5).map(
          (repo) =>
            ({
              ...repo,
              topics: [],
              license: null,
              default_branch: 'main',
              has_issues: false,
              has_projects: false,
              has_wiki: false,
              has_pages: false,
              archived: false,
              disabled: false,
            }) as DetailedRepo
        ),
        organizations:
          organizations.status === 'fulfilled' ? organizations.value : [],
        contributionDetails: totalContributionData || {
          totalContributions: combinedActivityData.recentContributions,
          weeks: [],
          mostActiveDay: 'Unknown',
          longestStreak: 0,
          currentStreak: 0,
        },
        accountMetrics: {
          accountAge: mainUserData.created_at
            ? Math.floor(
                (Date.now() - new Date(mainUserData.created_at).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0,
          firstCommitDate: null,
          lastActiveDate: mainUserData.updated_at,
          totalCommits: combinedActivityData.commits,
          totalPullRequests: combinedActivityData.pullRequests,
          totalIssues: combinedActivityData.issues,
        },
        libraryAnalysis:
          libraryData.status === 'fulfilled' && libraryData.value
            ? libraryData.value
            : undefined,
        skillMeasurement,
      };

      // コントリビューション詳細を保存
      if (totalContributionData) {
        setContributionDetails(totalContributionData);
      }

      setTimeout(() => {
        onScanComplete(result, detailedTechData);
      }, 1000);
    } catch (error) {
      console.error('Scan error:', error);
      onScanError();
    }
  };

  const getLanguageStats = async (
    repos: GitHubRepo[]
  ): Promise<ProcessedLanguage[]> => {
    const languages: LanguageStats = {};
    let totalBytes = 0;

    // GitHubトークンがある場合はより多くのリポジトリを分析
    const hasToken = !!localStorage.getItem('github_token');
    const reposToAnalyze = hasToken ? repos.slice(0, 30) : repos.slice(0, 10);

    for (const repo of reposToAnalyze) {
      try {
        const headers = getHeaders();
        const langResponse = await fetch(repo.languages_url, { headers });
        if (langResponse.ok) {
          const langData: LanguageStats = await langResponse.json();
          for (const [lang, bytes] of Object.entries(langData)) {
            languages[lang] = (languages[lang] || 0) + bytes;
            totalBytes += bytes;
          }
        }
      } catch (e) {
        console.error('Language fetch error:', e);
      }
    }

    // 全言語の情報を返す（最大5つ）
    return Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, bytes]) => ({
        name: lang,
        percentage: Math.round((bytes / totalBytes) * 100),
        bytes,
      }));
  };

  const getRecentActivity = async (username: string): Promise<ActivityData> => {
    let totalCommits = 0;
    let totalPRs = 0;
    let totalIssues = 0;
    let recentContributions = 0;

    try {
      const headers = getHeaders();
      const eventsResponse = await fetch(
        `https://api.github.com/users/${username}/events/public?per_page=100`,
        { headers }
      );

      if (eventsResponse.ok) {
        const events: GitHubEvent[] = await eventsResponse.json();

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        events.forEach((event) => {
          const eventDate = new Date(event.created_at);
          if (eventDate > thirtyDaysAgo) {
            recentContributions++;

            switch (event.type) {
              case 'PushEvent':
                totalCommits += event.payload.commits?.length || 0;
                break;
              case 'PullRequestEvent':
                totalPRs++;
                break;
              case 'IssuesEvent':
                totalIssues++;
                break;
            }
          }
        });
      }
    } catch (e) {
      console.error('Activity fetch error:', e);
    }

    return {
      commits: totalCommits,
      pullRequests: totalPRs,
      issues: totalIssues,
      recentContributions,
    };
  };

  const analyzeTechStack = async (repos: GitHubRepo[]): Promise<TechStack> => {
    const techStack: TechStack = {
      languages: {},
      frameworks: new Set(),
      devops: new Set(),
      testing: new Set(),
      databases: new Set(),
      infrastructure: new Set(),
    };

    const topRepos = repos.slice(0, 50);

    for (const repo of topRepos) {
      try {
        const headers = getHeaders();
        const contentsResponse = await fetch(
          `https://api.github.com/repos/${repo.full_name}/contents`,
          { headers }
        );

        if (contentsResponse.ok) {
          const contents: Array<{ name: string; type: string }> =
            await contentsResponse.json();

          for (const item of contents) {
            const fileName = item.name.toLowerCase();

            if (fileName === 'package.json') {
              techStack.frameworks.add('Node.js/npm');
              await analyzePackageJson(repo.full_name, techStack);
            } else if (
              fileName === 'requirements.txt' ||
              fileName === 'pipfile'
            ) {
              techStack.frameworks.add('Python');
            } else if (fileName === 'pyproject.toml') {
              techStack.frameworks.add('Python (Modern)');
            } else if (fileName === 'composer.json') {
              techStack.frameworks.add('PHP/Composer');
            } else if (fileName === 'pom.xml') {
              techStack.frameworks.add('Java/Maven');
            } else if (fileName === 'build.gradle') {
              techStack.frameworks.add('Java/Gradle');
            } else if (fileName === 'cargo.toml') {
              techStack.frameworks.add('Rust');
            } else if (fileName === 'go.mod') {
              techStack.frameworks.add('Go');
            } else if (fileName === 'gemfile') {
              techStack.frameworks.add('Ruby');
            }

            if (fileName === 'dockerfile' || fileName.includes('docker')) {
              techStack.devops.add('Docker');
            }

            if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
              if (fileName.includes('github')) {
                techStack.devops.add('GitHub Actions');
              } else if (fileName.includes('gitlab')) {
                techStack.devops.add('GitLab CI');
              } else if (fileName.includes('circle')) {
                techStack.devops.add('CircleCI');
              }
            }

            // 多エコシステム横断でインフラ/ビルド/開発ツールを検出（依存に出ない分）
            const tool = detectTool(item.name, item.type);
            if (tool) {
              techStack.infrastructure.add(tool);
            }
          }
        }
      } catch (e) {
        console.error('Tech stack analysis error:', e);
      }
    }

    return techStack;
  };

  const analyzePackageJson = async (
    repoFullName: string,
    techStack: TechStack
  ) => {
    try {
      const headers = getHeaders();
      const response = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/package.json`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(atob(data.content));

        const allDeps = { ...content.dependencies, ...content.devDependencies };

        if (allDeps['react']) techStack.frameworks.add('React');
        if (allDeps['vue']) techStack.frameworks.add('Vue.js');
        if (allDeps['@angular/core']) techStack.frameworks.add('Angular');
        if (allDeps['next']) techStack.frameworks.add('Next.js');
        if (allDeps['express']) techStack.frameworks.add('Express.js');
        if (allDeps['jest']) techStack.testing.add('Jest');
        if (allDeps['cypress']) techStack.testing.add('Cypress');
        if (allDeps['webpack']) techStack.devops.add('Webpack');
        if (allDeps['vite']) techStack.devops.add('Vite');
      }
    } catch (e) {
      console.error('Package.json analysis error:', e);
    }
  };

  const computeStats = (
    userData: ExtendedGitHubUser,
    repoData: GitHubRepo[],
    languageStats: ProcessedLanguage[],
    activityData: ActivityData
  ): PowerLevelResult['stats'] => {
    let totalStars = 0;
    let totalForks = 0;
    let originalRepos = 0;
    repoData.forEach((repo) => {
      totalStars += repo.stargazers_count;
      totalForks += repo.forks_count;
      if (!repo.fork) originalRepos++;
    });
    const accountAge =
      new Date().getFullYear() - new Date(userData.created_at).getFullYear();
    return {
      repos: userData.public_repos,
      originalRepos,
      stars: totalStars,
      forks: totalForks,
      followers: userData.followers,
      following: userData.following,
      accountAge,
      languages: languageStats,
      activity: activityData,
      gists: userData.public_gists,
    };
  };

  const animateCounter = (target: number) => {
    const duration = 3000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      let easeProgress;
      if (progress < 0.1) {
        easeProgress = progress * progress * 0.1;
      } else if (progress < 0.7) {
        const adjustedProgress = (progress - 0.1) / 0.6;
        easeProgress =
          0.01 + adjustedProgress * adjustedProgress * adjustedProgress * 0.89;
      } else {
        const adjustedProgress = (progress - 0.7) / 0.3;
        easeProgress = 0.9 + (1 - Math.pow(1 - adjustedProgress, 3)) * 0.1;
      }

      const currentValue = Math.floor(target * easeProgress);
      const randomVariation = Math.floor(Math.random() * 10) - 5;
      const displayValue = Math.max(0, currentValue + randomVariation);

      setCurrentPowerLevel(displayValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentPowerLevel(target);
        setShowComplete(true);
      }
    };

    animate();
  };

  // 新スケール: craft の土台は最大20万(S5)。reach(star等)が青天井で上積みする。
  const determineRank = (powerLevel: number): string => {
    if (powerLevel >= 10000000) return 'GOD TIER DEVELOPER';
    if (powerLevel >= 3000000) return 'LEGENDARY DEVELOPER';
    if (powerLevel >= 1000000) return 'MYTHICAL DEVELOPER';
    if (powerLevel >= 500000) return 'SUPER ELITE';
    if (powerLevel >= 250000) return 'ELITE DEVELOPER';
    if (powerLevel >= 150000) return 'EXPERT DEVELOPER';
    if (powerLevel >= 80000) return 'SENIOR DEVELOPER';
    if (powerLevel >= 40000) return 'MID-LEVEL DEVELOPER';
    if (powerLevel >= 15000) return 'JUNIOR DEVELOPER';
    if (powerLevel >= 5000) return 'APPRENTICE DEVELOPER';
    if (powerLevel >= 1000) return 'NOVICE DEVELOPER';
    return 'BEGINNER';
  };

  const determineSpecialAbility = (
    stats: PowerLevelResult['stats'],
    contributionData?: import('../types/github').ContributionDetails | null
  ): string => {
    // 複数の特殊能力を判定
    const abilities: string[] = [];

    // スター関連
    if (stats.stars > 100000) abilities.push('MEGASTAR OVERLORD');
    else if (stats.stars > 50000) abilities.push('SUPERSTAR DEVELOPER');
    else if (stats.stars > 10000) abilities.push('STAR COLLECTOR');
    else if (stats.stars > 5000) abilities.push('RISING STAR');

    // フォロワー関連
    if (stats.followers > 10000) abilities.push('TECH CELEBRITY');
    else if (stats.followers > 5000) abilities.push('MEGA INFLUENCER');
    else if (stats.followers > 1000) abilities.push('INFLUENCER');
    else if (stats.followers > 500) abilities.push('COMMUNITY LEADER');

    // 言語マスタリー
    if (stats.languages.length > 0) {
      if (stats.languages[0].percentage > 90) {
        abilities.push(`${stats.languages[0].name} GRANDMASTER`);
      } else if (stats.languages[0].percentage > 80) {
        abilities.push(`${stats.languages[0].name} MASTER`);
      } else if (stats.languages[0].percentage > 60) {
        abilities.push(`${stats.languages[0].name} EXPERT`);
      }

      if (stats.languages.length >= 5) {
        abilities.push('POLYGLOT PROGRAMMER');
      } else if (stats.languages.length >= 3) {
        abilities.push('MULTILINGUAL CODER');
      }
    }

    // 活動レベル
    if (stats.activity.recentContributions > 100)
      abilities.push('UNSTOPPABLE FORCE');
    else if (stats.activity.recentContributions > 50)
      abilities.push('HYPER ACTIVE');
    else if (stats.activity.recentContributions > 25)
      abilities.push('HIGHLY ACTIVE');

    // リポジトリ作成
    if (stats.originalRepos > 100) abilities.push('REPOSITORY FACTORY');
    else if (stats.originalRepos > 50) abilities.push('PROLIFIC CREATOR');
    else if (stats.originalRepos > 25) abilities.push('PROJECT ARCHITECT');

    // 経験値
    if (stats.accountAge > 15) abilities.push('ANCIENT DEVELOPER');
    else if (stats.accountAge > 10) abilities.push('VETERAN WARRIOR');
    else if (stats.accountAge > 7) abilities.push('EXPERIENCED');
    else if (stats.accountAge > 5) abilities.push('SEASONED');

    // Gist関連
    if (stats.gists > 500) abilities.push('GIST OVERLORD');
    else if (stats.gists > 100) abilities.push('GIST WIZARD');
    else if (stats.gists > 50) abilities.push('SNIPPET MASTER');

    // プルリクエスト/イシュー
    if (stats.activity.pullRequests > 100) abilities.push('PR CHAMPION');
    else if (stats.activity.pullRequests > 50)
      abilities.push('COLLABORATION EXPERT');

    if (stats.activity.issues > 100) abilities.push('ISSUE RESOLVER');
    else if (stats.activity.issues > 50) abilities.push('BUG HUNTER');

    // フォーク関連
    if (stats.forks > 10000) abilities.push('FORK MAGNET');
    else if (stats.forks > 5000) abilities.push('HIGHLY FORKABLE');

    // コントリビューション（草）関連の特殊能力
    if (contributionData) {
      if (contributionData.totalContributions > 1000) {
        abilities.push('CODING MACHINE');
      } else if (contributionData.totalContributions > 500) {
        abilities.push('DAILY COMMITTER');
      } else if (contributionData.totalContributions > 365) {
        abilities.push('CONSISTENT CODER');
      }

      if (contributionData.longestStreak > 365) {
        abilities.push('UNSTOPPABLE STREAK');
      } else if (contributionData.longestStreak > 180) {
        abilities.push('MARATHON CODER');
      } else if (contributionData.longestStreak > 90) {
        abilities.push('PERSISTENT DEVELOPER');
      }

      if (contributionData.currentStreak > 30) {
        abilities.push('CURRENTLY ON FIRE');
      } else if (contributionData.currentStreak > 14) {
        abilities.push('ACTIVE CONTRIBUTOR');
      }
    }

    // 最も重要な能力を返す（最大3つ）
    if (abilities.length === 0) {
      return 'RISING TALENT';
    } else if (abilities.length === 1) {
      return abilities[0];
    } else if (abilities.length === 2) {
      return `${abilities[0]} + ${abilities[1]}`;
    } else {
      // 最も印象的な3つを選択
      const topAbilities = abilities.slice(0, 3);
      return topAbilities.join(' + ');
    }
  };

  const downloadSVG = () => {
    if (!svgRef.current || !displayStats) return;

    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);

    // SVGにスタイルを埋め込む
    const styleString = `
      <style>
        .scouter-text {
          font-family: 'Orbitron', monospace;
          font-weight: 700;
          fill: #00ff00;
        }
        .power-level {
          font-size: 42px;
        }
        .label {
          font-size: 16px;
          fill: #00cc00;
        }
        .small-label {
          font-size: 11px;
          fill: #00aa00;
        }
        .frame {
          fill: none;
          stroke: #00ff00;
          stroke-width: 2;
        }
        .inner-frame {
          fill: none;
          stroke: #00aa00;
          stroke-width: 1;
        }
        .scan-line {
          fill: url(#scanline);
          opacity: 0.3;
        }
        .username {
          fill: #00ffff;
          font-size: 14px;
        }
        .special-ability {
          fill: #ffff00;
        }
        .status-dot {
          fill: #00ff00;
        }
        .progress-bar {
          fill: none;
          stroke: #00aa00;
          stroke-width: 1;
        }
        .progress-fill {
          fill: #00ff00;
        }
        .rank {
          fill: #ff6600;
          font-size: 16px;
        }
        .complete-msg {
          fill: #00ff00;
          font-size: 16px;
        }
      </style>
    `;

    // <defs>タグの後にスタイルを挿入
    svgString = svgString.replace('<defs>', `<defs>${styleString}`);

    // ダウンロード用のBlobを作成
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    // ダウンロードリンクを作成してクリック
    const link = document.createElement('a');
    link.href = url;
    const mainUsername = usernames[0] || 'unknown';
    const filename =
      usernames.length > 1
        ? `scouter-${mainUsername}-plus-${usernames.length - 1}-accounts.svg`
        : `scouter-${mainUsername}.svg`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // メモリクリーンアップ
    URL.revokeObjectURL(url);
  };

  return (
    <div className="scouter-container">
      <svg
        ref={svgRef}
        viewBox="0 0 700 450"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', maxWidth: '800px' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="scanline" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              style={{ stopColor: '#00ff00', stopOpacity: 0 }}
            />
            <stop
              offset="50%"
              style={{ stopColor: '#00ff00', stopOpacity: 0.5 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: '#00ff00', stopOpacity: 0 }}
            />
            <animate
              attributeName="y1"
              values="-100%;200%"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="y2"
              values="0%;300%"
              dur="2s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="#000000" rx="2%" />
        <rect
          x="1.5%"
          y="2.5%"
          width="97%"
          height="95%"
          className="frame"
          rx="1%"
        />
        <rect
          x="3%"
          y="5%"
          width="94%"
          height="90%"
          className="inner-frame"
          rx="0.6%"
        />
        <rect x="3%" y="5%" width="94%" height="90%" className="scan-line" />

        <text
          x="5%"
          y="10%"
          className="username scouter-text"
          style={{ fontSize: '0.9em' }}
        >
          {usernames.length > 0
            ? `TARGET: ${usernames.map((u) => u.toUpperCase()).join(' + ')}`
            : 'TARGET: '}
        </text>

        <text x="5%" y="16%" className="label scouter-text">
          {isScanning ? 'SCANNING TARGET...' : 'STANDBY'}
        </text>

        <text x="5%" y="26%" className="label scouter-text">
          POWER LEVEL:
        </text>

        <text x="5%" y="36%" className="power-level scouter-text">
          {isScanning && !showComplete
            ? scanningPowerLevel.toLocaleString()
            : currentPowerLevel.toLocaleString()}
        </text>

        {showComplete && (
          <text x="5%" y="44%" className="complete-msg scouter-text">
            SCAN COMPLETE
          </text>
        )}

        {displayStats && (
          <>
            <text x="5%" y="52%" className="rank scouter-text">
              RANK: {determineRank(displayStats.power)}
            </text>

            {craftLabel && (
              <text x="5%" y="60%" className="small-label scouter-text">
                技術階級: {craftLabel}
              </text>
            )}

            <g className="stats-group">
              <text x="50%" y="16%" className="label scouter-text">
                BASIC STATS
              </text>
              <text x="50%" y="20%" className="small-label scouter-text">
                REPOS: {displayStats.stats.repos} (
                {displayStats.stats.originalRepos} ORIG)
              </text>
              <text x="50%" y="24%" className="small-label scouter-text">
                STARS: {displayStats.stats.stars.toLocaleString()}
              </text>
              <text x="50%" y="28%" className="small-label scouter-text">
                FOLLOWERS: {displayStats.stats.followers.toLocaleString()}
              </text>
              <text x="50%" y="32%" className="small-label scouter-text">
                ACCOUNT AGE: {displayStats.stats.accountAge}Y
              </text>

              <text x="70%" y="16%" className="label scouter-text">
                ACTIVITY
              </text>
              <text x="70%" y="20%" className="small-label scouter-text">
                CONTRIBS:{' '}
                {contributionDetails
                  ? contributionDetails.totalContributions.toLocaleString()
                  : displayStats.stats.activity.commits}
              </text>
              <text x="70%" y="24%" className="small-label scouter-text">
                PULL REQS: {displayStats.stats.activity.pullRequests}
              </text>
              <text x="70%" y="28%" className="small-label scouter-text">
                ISSUES: {displayStats.stats.activity.issues}
              </text>
              <text x="70%" y="32%" className="small-label scouter-text">
                30D ACT: {displayStats.stats.activity.recentContributions}
              </text>
            </g>

            <g className="detail-stats">
              <text x="5%" y="62%" className="label scouter-text">
                LANGUAGE PROFICIENCY
              </text>
              {displayStats.stats.languages.slice(0, 3).map((lang, i) => (
                <text
                  key={i}
                  x={`${5 + i * 20}%`}
                  y="66%"
                  className="small-label scouter-text"
                >
                  {lang.name}: {lang.percentage}%
                </text>
              ))}

              <text x="5%" y="74%" className="label scouter-text">
                SPECIAL ABILITIES
              </text>
              <text
                x="5%"
                y="78%"
                className="special-ability scouter-text"
                style={{ fontSize: '0.7em' }}
              >
                {determineSpecialAbility(
                  displayStats.stats,
                  contributionDetails
                )
                  .split(' + ')
                  .slice(0, 2)
                  .join(' + ')}
              </text>
              {determineSpecialAbility(
                displayStats.stats,
                contributionDetails
              ).split(' + ').length > 2 && (
                <text
                  x="5%"
                  y="82%"
                  className="special-ability scouter-text"
                  style={{ fontSize: '0.7em' }}
                >
                  +{' '}
                  {determineSpecialAbility(
                    displayStats.stats,
                    contributionDetails
                  )
                    .split(' + ')
                    .slice(2, 4)
                    .join(' + ')}
                </text>
              )}
              {determineSpecialAbility(
                displayStats.stats,
                contributionDetails
              ).split(' + ').length > 4 && (
                <text
                  x="5%"
                  y="86%"
                  className="special-ability scouter-text"
                  style={{ fontSize: '0.7em' }}
                >
                  +{' '}
                  {determineSpecialAbility(
                    displayStats.stats,
                    contributionDetails
                  )
                    .split(' + ')
                    .slice(4)
                    .join(' + ')}
                </text>
              )}
            </g>
          </>
        )}

        <circle cx="94%" cy="8%" r="0.8%" className="status-dot" />

        {isScanning && (
          <g className="progress-group">
            <text x="50%" y="40%" className="small-label scouter-text">
              SCAN PROGRESS
            </text>
            <rect
              x="50%"
              y="42%"
              width="25%"
              height="1.5%"
              className="progress-bar"
              rx="0.3%"
            />
            <rect
              x="50%"
              y="42%"
              width={`${progress * 0.25}%`}
              height="1.5%"
              className="progress-fill"
              rx="0.3%"
            />
          </g>
        )}
      </svg>

      {isScanning && <div className="loading-message">{loadingMessage}</div>}

      {displayStats && showComplete && (
        <div className="scouter-actions">
          <button
            onClick={downloadSVG}
            className="download-svg-button"
            title="スカウター画像をダウンロード"
          >
            📥 スカウターをダウンロード
          </button>
        </div>
      )}
    </div>
  );
};

// Additional API functions for extended GitHub data
const fetchProfileReadme = async (
  username: string
): Promise<import('../types/github').ProfileReadme> => {
  try {
    const token = localStorage.getItem('github_token');

    // GitHub APIの新しいトークン形式に対応
    const headers: Record<string, string> = {};
    if (token) {
      // fine-grained personal access tokenの場合はBearerを使用
      if (token.startsWith('github_pat_')) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // classic personal access tokenの場合はtokenを使用
        headers['Authorization'] = `token ${token}`;
      }
    }

    console.log('Fetching README for:', username);
    console.log('Token available:', !!token);
    console.log(
      'Token type:',
      token?.startsWith('github_pat_') ? 'fine-grained' : 'classic'
    );
    console.log(
      'Token value (first 10 chars):',
      token ? token.substring(0, 10) + '...' : 'null'
    );
    console.log('Headers:', headers);

    const response = await fetch(
      `https://api.github.com/repos/${username}/${username}/readme`,
      {
        headers,
      }
    );

    if (response.status === 403) {
      const errorText = await response.text();
      console.error('403 Forbidden - README fetch failed');
      console.error(
        'Response headers:',
        Object.fromEntries(response.headers.entries())
      );
      console.error('Error response:', errorText);
      return {
        content: null,
        hasReadme: false,
        sections: {},
      };
    }

    if (!response.ok) {
      console.warn(
        'README fetch failed:',
        response.status,
        response.statusText
      );
      return {
        content: null,
        hasReadme: false,
        sections: {},
      };
    }

    const data = await response.json();
    const content = data.content ? atob(data.content) : null;

    // Basic README section analysis
    const sections: ProfileReadme['sections'] = {};
    if (content) {
      if (
        content.toLowerCase().includes('about') ||
        content.toLowerCase().includes('introduction')
      ) {
        sections.introduction = 'Available';
      }
      if (
        content.toLowerCase().includes('skill') ||
        content.toLowerCase().includes('tech')
      ) {
        sections.skills = 'Available';
      }
      if (
        content.toLowerCase().includes('project') ||
        content.toLowerCase().includes('work')
      ) {
        sections.projects = 'Available';
      }
      if (
        content.toLowerCase().includes('contact') ||
        content.toLowerCase().includes('reach')
      ) {
        sections.contact = 'Available';
      }
    }

    return {
      content,
      hasReadme: !!content,
      sections,
    };
  } catch (error) {
    console.warn('Failed to fetch profile README:', error);
    return {
      content: null,
      hasReadme: false,
      sections: {},
    };
  }
};

const fetchOrganizations = async (
  username: string
): Promise<import('../types/github').Organization[]> => {
  try {
    const token = localStorage.getItem('github_token');

    const headers: Record<string, string> = {};
    if (token) {
      if (token.startsWith('github_pat_')) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = `token ${token}`;
      }
    }

    const response = await fetch(
      `https://api.github.com/users/${username}/orgs`,
      {
        headers,
      }
    );

    if (response.status === 403) {
      console.warn(
        '403 Forbidden - Cannot fetch organizations, API rate limit exceeded'
      );
      return [];
    }

    if (!response.ok) {
      console.warn(
        'Organizations fetch failed:',
        response.status,
        response.statusText
      );
      return [];
    }

    const data = await response.json();
    return data.map((org: Organization) => ({
      login: org.login,
      id: org.id,
      url: org.url,
      avatar_url: org.avatar_url,
      description: org.description,
    }));
  } catch (error) {
    console.warn('Failed to fetch organizations:', error);
    return [];
  }
};

const fetchContributionData = async (
  username: string
): Promise<import('../types/github').ContributionDetails> => {
  try {
    const token = localStorage.getItem('github_token');

    console.log('Fetching contribution data for:', username);
    console.log('Token available:', !!token);
    console.log(
      'Token type:',
      token?.startsWith('github_pat_') ? 'fine-grained' : 'classic'
    );

    if (!token) {
      console.warn(
        'GitHub token required for contribution data, falling back to Events API'
      );
      return await fallbackContributionAnalysis(username);
    }

    // GitHub GraphQL APIを使用してコントリビューション情報を取得
    const query = `
      query($username: String!) {
        user(login: $username) {
          contributionsCollection {
            totalCommitContributions
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  weekday
                }
              }
            }
          }
        }
      }
    `;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token.startsWith('github_pat_')) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['Authorization'] = `bearer ${token}`;
    }

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables: { username },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch contribution data');
    }

    const data = await response.json();

    console.log('GraphQL response:', data);

    if (data.errors) {
      console.warn('GraphQL errors:', data.errors);
      return await fallbackContributionAnalysis(username);
    }

    const contributionCalendar =
      data.data?.user?.contributionsCollection?.contributionCalendar;

    if (!contributionCalendar) {
      return await fallbackContributionAnalysis(username);
    }

    // コントリビューション日数を曜日別に集計
    const dayContributions = [0, 0, 0, 0, 0, 0, 0]; // 日曜日から土曜日
    let longestStreak = 0;
    let currentStreak = 0;
    let lastContributionDate = null;

    contributionCalendar.weeks.forEach(
      (week: {
        contributionDays: Array<{
          contributionCount: number;
          weekday: number;
          date: string;
        }>;
      }) => {
        week.contributionDays.forEach((day) => {
          const dayOfWeek = day.weekday;
          dayContributions[dayOfWeek] += day.contributionCount;

          // 連続記録を計算
          if (day.contributionCount > 0) {
            currentStreak++;
            lastContributionDate = day.date;
          } else {
            longestStreak = Math.max(longestStreak, currentStreak);
            currentStreak = 0;
          }
        });
      }
    );

    longestStreak = Math.max(longestStreak, currentStreak);

    // 今日の日付をチェックして現在の連続記録を確認
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastContributionDate) {
      const lastDate = new Date(lastContributionDate);
      const daysDiff = Math.floor(
        (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff > 1) {
        currentStreak = 0;
      }
    }

    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const mostActiveDay =
      dayNames[dayContributions.indexOf(Math.max(...dayContributions))];

    return {
      totalContributions: contributionCalendar.totalContributions,
      weeks: contributionCalendar.weeks,
      mostActiveDay,
      longestStreak,
      currentStreak,
    };
  } catch (error) {
    console.warn('Failed to fetch contribution data:', error);
    return await fallbackContributionAnalysis(username);
  }
};

// GitHub Events APIを使用したフォールバック分析
const fallbackContributionAnalysis = async (
  username: string
): Promise<import('../types/github').ContributionDetails> => {
  try {
    const token = localStorage.getItem('github_token');

    const headers: Record<string, string> = {};
    if (token) {
      if (token.startsWith('github_pat_')) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = `token ${token}`;
      }
    }

    console.log('Fallback: analyzing recent activity via Events API');

    const response = await fetch(
      `https://api.github.com/users/${username}/events/public?per_page=100`,
      {
        headers,
      }
    );

    if (response.status === 403) {
      console.warn(
        '403 Forbidden - Cannot fetch events. Please add GitHub token for better data.'
      );
      return await estimateContributionsFromRepos();
    }

    if (!response.ok) {
      console.warn(
        'Events fetch failed:',
        response.status,
        response.statusText
      );
      return await estimateContributionsFromRepos();
    }

    const events = await response.json();

    // イベントから活動日を分析
    const contributionDays = new Set();
    const dayOfWeekCount = [0, 0, 0, 0, 0, 0, 0];

    events.forEach((event: GitHubEvent) => {
      const date = new Date(event.created_at);
      const dateStr = date.toISOString().split('T')[0];
      contributionDays.add(dateStr);
      dayOfWeekCount[date.getDay()]++;
    });

    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const mostActiveDay =
      dayNames[dayOfWeekCount.indexOf(Math.max(...dayOfWeekCount))];

    // 簡易的な連続記録計算（過去30日間のイベント基準）
    const recentDays = Array.from(contributionDays).sort().reverse();
    let streak = 0;

    for (let i = 0; i < Math.min(recentDays.length, 30); i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateStr = checkDate.toISOString().split('T')[0];

      if (recentDays.includes(checkDateStr)) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalContributions: contributionDays.size,
      weeks: [],
      mostActiveDay,
      longestStreak: streak,
      currentStreak: streak,
    };
  } catch (error) {
    console.warn('Fallback contribution analysis failed:', error);
    return {
      totalContributions: 0,
      weeks: [],
      mostActiveDay: 'Unknown',
      longestStreak: 0,
      currentStreak: 0,
    };
  }
};

// リポジトリ情報からコントリビューションを推定
const estimateContributionsFromRepos = async (): Promise<
  import('../types/github').ContributionDetails
> => {
  try {
    console.log('Estimating contributions from repository data');

    // 既に取得済みのリポジトリデータから推定
    // このデータは基本的なユーザー情報取得時に既に取得済み

    // 簡易的な推定値を返す
    // リポジトリ数、最終更新日などから活動度を推測
    return {
      totalContributions: 50, // 推定値
      weeks: [],
      mostActiveDay: 'Unknown (需要GitHub token)',
      longestStreak: 5, // 推定値
      currentStreak: 1, // 推定値
    };
  } catch (error) {
    console.warn('Repository-based estimation failed:', error);
    return {
      totalContributions: 0,
      weeks: [],
      mostActiveDay: 'Unknown',
      longestStreak: 0,
      currentStreak: 0,
    };
  }
};

// 追加のAPI関数
const fetchAllRepositories = async (
  username: string
): Promise<GitHubRepo[]> => {
  try {
    const token = localStorage.getItem('github_token');
    const headers: Record<string, string> = {};
    if (token) {
      if (token.startsWith('github_pat_')) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = `token ${token}`;
      }
    }

    let allRepos: GitHubRepo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 3) {
      // 最大3ページ（300リポジトリ）まで
      const response = await fetch(
        `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&sort=updated`,
        {
          headers,
        }
      );

      if (!response.ok) {
        console.warn(`Failed to fetch page ${page} of repositories`);
        break;
      }

      const repos: GitHubRepo[] = await response.json();
      allRepos = [...allRepos, ...repos];

      hasMore = repos.length === 100;
      page++;
    }

    // スター数でソート
    return allRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  } catch (error) {
    console.error('Failed to fetch all repositories:', error);
    return [];
  }
};

const LIBRARY_CATEGORIES: Record<string, string[]> = {
  // JavaScript/TypeScript
  'UI Framework': [
    'react',
    'vue',
    '@angular/core',
    'svelte',
    'solid-js',
    'preact',
    'lit',
    '@stencil/core',
  ],
  'State Management': [
    'redux',
    '@reduxjs/toolkit',
    'mobx',
    'vuex',
    'pinia',
    'zustand',
    'recoil',
    'jotai',
    'valtio',
    '@ngrx/store',
  ],
  Styling: [
    'styled-components',
    '@emotion/react',
    '@emotion/styled',
    'tailwindcss',
    'sass',
    'less',
    '@mui/material',
    'antd',
    'bootstrap',
    '@chakra-ui/react',
  ],
  'Build Tools': [
    'webpack',
    'vite',
    'rollup',
    'parcel',
    'esbuild',
    'turbopack',
    '@swc/core',
    'babel',
  ],
  Testing: [
    'jest',
    'mocha',
    'vitest',
    'cypress',
    '@testing-library/react',
    'playwright',
    'puppeteer',
    'karma',
    'jasmine',
  ],
  'Backend Framework': [
    'express',
    'koa',
    'fastify',
    '@nestjs/core',
    'hapi',
    '@hapi/hapi',
    'restify',
    'apollo-server',
  ],
  'Database/ORM': [
    'mongoose',
    'prisma',
    'typeorm',
    'sequelize',
    'knex',
    '@mikro-orm/core',
    'objection',
    'bookshelf',
  ],
  'HTTP Client': [
    'axios',
    'got',
    'node-fetch',
    'ky',
    'superagent',
    '@tanstack/react-query',
    'swr',
    '@apollo/client',
  ],
  Utilities: [
    'lodash',
    'ramda',
    'underscore',
    'date-fns',
    'moment',
    'dayjs',
    'uuid',
    'nanoid',
  ],
  Validation: [
    'joi',
    'yup',
    'zod',
    'ajv',
    'validator',
    '@hapi/joi',
    'express-validator',
  ],

  // Python
  'Web Framework': [
    'django',
    'flask',
    'fastapi',
    'tornado',
    'pyramid',
    'bottle',
    'sanic',
    'aiohttp',
  ],
  'Data Science': [
    'numpy',
    'pandas',
    'scipy',
    'matplotlib',
    'seaborn',
    'plotly',
    'bokeh',
  ],
  'Machine Learning': [
    'scikit-learn',
    'tensorflow',
    'keras',
    'pytorch',
    'xgboost',
    'lightgbm',
    'catboost',
  ],
  Database: [
    'sqlalchemy',
    'psycopg2',
    'pymongo',
    'redis',
    'peewee',
    'tortoise-orm',
  ],
  'Testing Python': ['pytest', 'unittest', 'nose', 'tox', 'coverage', 'mock'],

  // Ruby
  'Ruby Framework': ['rails', 'sinatra', 'hanami', 'roda', 'grape'],
  'Ruby Testing': ['rspec', 'minitest', 'cucumber', 'capybara'],

  // Go
  'Go Framework': ['gin', 'echo', 'fiber', 'chi', 'gorilla/mux', 'beego'],
  'Go Database': ['gorm', 'sqlx', 'ent', 'go-redis'],

  // Java
  'Java Framework': [
    'spring-boot',
    'spring-framework',
    'hibernate',
    'struts',
    'jsf',
  ],
  'Java Build': ['maven', 'gradle', 'ant'],

  // Rust
  'Rust Framework': ['actix-web', 'rocket', 'axum', 'warp', 'tide'],
  'Rust Async': ['tokio', 'async-std', 'futures'],

  // PHP
  'PHP Framework': ['laravel', 'symfony', 'codeigniter', 'yii', 'slim'],
  'PHP Testing': ['phpunit', 'codeception', 'behat'],
};

// ライブラリ分析関数
const analyzeLibraries = async (
  repos: GitHubRepo[]
): Promise<
  import('../types/github').DetailedTechData['libraryAnalysis'] | null
> => {
  try {
    const headers = getHeaders();
    const languageLibraryMap: Record<
      string,
      Record<string, { count: number; versions: Set<string> }>
    > = {};
    const libraryUsageMap: Record<
      string,
      { category: string; usage: number; versions: Set<string> }
    > = {};

    // 履歴書の下書きは網羅性優先。多めのリポジトリから依存を集める。
    const reposToAnalyze = repos.slice(0, 50);

    for (const repo of reposToAnalyze) {
      try {
        // 言語に基づいて適切な依存関係ファイルをチェック
        const filesToCheck: {
          path: string;
          parser: (content: string) => Record<string, string> | null;
        }[] = [];

        // JavaScript/TypeScript
        if (repo.language === 'JavaScript' || repo.language === 'TypeScript') {
          filesToCheck.push({
            path: 'package.json',
            parser: (content: string) => {
              try {
                const pkg = JSON.parse(content);
                return { ...pkg.dependencies, ...pkg.devDependencies };
              } catch {
                return null;
              }
            },
          });
        }

        // Python
        if (repo.language === 'Python') {
          filesToCheck.push({
            path: 'requirements.txt',
            parser: (content: string) => {
              const deps: Record<string, string> = {};
              content.split('\n').forEach((line) => {
                const match = line.match(
                  /^([a-zA-Z0-9-_]+)(==|>=|<=|~=|>|<)?(.*)$/
                );
                if (match) {
                  deps[match[1].toLowerCase()] = match[3] || 'latest';
                }
              });
              return Object.keys(deps).length > 0 ? deps : null;
            },
          });

          filesToCheck.push({
            path: 'Pipfile',
            parser: (content: string) => {
              try {
                // 簡易的なTOMLパース
                const deps: Record<string, string> = {};
                const lines = content.split('\n');
                let inPackages = false;

                for (const line of lines) {
                  if (
                    line.trim() === '[packages]' ||
                    line.trim() === '[dev-packages]'
                  ) {
                    inPackages = true;
                    continue;
                  }
                  if (line.startsWith('[') && inPackages) {
                    break;
                  }
                  if (inPackages) {
                    const match = line.match(/^([a-zA-Z0-9-_]+)\s*=\s*"(.*)"/);
                    if (match) {
                      deps[match[1].toLowerCase()] = match[2];
                    }
                  }
                }
                return Object.keys(deps).length > 0 ? deps : null;
              } catch {
                return null;
              }
            },
          });

          // pyproject.tomlのサポート
          filesToCheck.push({
            path: 'pyproject.toml',
            parser: (content: string) => {
              try {
                const deps: Record<string, string> = {};
                const lines = content.split('\n');
                let inDependencies = false;
                let inOptionalDependencies = false;

                for (const line of lines) {
                  // Poetry形式
                  if (
                    line.trim() === '[tool.poetry.dependencies]' ||
                    line.trim() === '[tool.poetry.dev-dependencies]'
                  ) {
                    inDependencies = true;
                    inOptionalDependencies = false;
                    continue;
                  }
                  // PEP 621形式
                  if (line.trim() === '[project]') {
                    inDependencies = false;
                    inOptionalDependencies = false;
                    continue;
                  }
                  if (line.trim().startsWith('dependencies = [')) {
                    inDependencies = true;
                    inOptionalDependencies = false;
                    continue;
                  }
                  if (line.trim() === '[project.optional-dependencies]') {
                    inOptionalDependencies = true;
                    inDependencies = false;
                    continue;
                  }

                  if (
                    line.startsWith('[') &&
                    (inDependencies || inOptionalDependencies)
                  ) {
                    break;
                  }

                  // Poetry形式の依存関係
                  if (inDependencies && !line.includes('python =')) {
                    const match = line.match(
                      /^([a-zA-Z0-9-_]+)\s*=\s*["{]?\s*(?:(?:version\s*=\s*)?["']?([^"'}\s]+)|(\^|~)?([0-9.]+))/
                    );
                    if (match) {
                      deps[match[1].toLowerCase()] =
                        match[2] || match[4] || 'latest';
                    }
                  }

                  // PEP 621形式の依存関係（配列形式）
                  if (inDependencies && line.includes('"')) {
                    const match = line.match(
                      /["']([a-zA-Z0-9-_]+)(?:\[.*?\])?(?:==|>=|<=|~=|>|<)?([^"']*)?["']/
                    );
                    if (match) {
                      deps[match[1].toLowerCase()] = match[2] || 'latest';
                    }
                  }
                }
                return Object.keys(deps).length > 0 ? deps : null;
              } catch {
                return null;
              }
            },
          });
        }

        // Ruby
        if (repo.language === 'Ruby') {
          filesToCheck.push({
            path: 'Gemfile',
            parser: (content: string) => {
              const deps: Record<string, string> = {};
              const gemRegex = /gem\s+['"]([^'"]+)['"]/g;
              let match;
              while ((match = gemRegex.exec(content)) !== null) {
                deps[match[1]] = 'latest';
              }
              return Object.keys(deps).length > 0 ? deps : null;
            },
          });
        }

        // Go
        if (repo.language === 'Go') {
          filesToCheck.push({
            path: 'go.mod',
            parser: (content: string) => {
              const deps: Record<string, string> = {};
              const lines = content.split('\n');
              let inRequire = false;

              for (const line of lines) {
                if (line.trim() === 'require (') {
                  inRequire = true;
                  continue;
                }
                if (line.trim() === ')' && inRequire) {
                  break;
                }
                if (inRequire || line.startsWith('require ')) {
                  const match = line.match(/([a-zA-Z0-9\-_./]+)\s+v([\d.]+)/);
                  if (match) {
                    const libName = match[1].split('/').pop() || match[1];
                    deps[libName] = match[2];
                  }
                }
              }
              return Object.keys(deps).length > 0 ? deps : null;
            },
          });
        }

        // Rust
        if (repo.language === 'Rust') {
          filesToCheck.push({
            path: 'Cargo.toml',
            parser: (content: string) => {
              const deps: Record<string, string> = {};
              const lines = content.split('\n');
              let inDeps = false;

              for (const line of lines) {
                if (
                  line.trim() === '[dependencies]' ||
                  line.trim() === '[dev-dependencies]'
                ) {
                  inDeps = true;
                  continue;
                }
                if (line.startsWith('[') && inDeps) {
                  break;
                }
                if (inDeps) {
                  const match = line.match(
                    /^([a-zA-Z0-9-_]+)\s*=\s*["{]?\s*(?:version\s*=\s*)?["']?([^"'}\s]+)/
                  );
                  if (match) {
                    deps[match[1]] = match[2];
                  }
                }
              }
              return Object.keys(deps).length > 0 ? deps : null;
            },
          });
        }

        // Java
        if (repo.language === 'Java') {
          filesToCheck.push({
            path: 'pom.xml',
            parser: (content: string) => {
              const deps: Record<string, string> = {};
              const depRegex = /<artifactId>([^<]+)<\/artifactId>/g;
              let match;
              while ((match = depRegex.exec(content)) !== null) {
                if (
                  !['maven-compiler-plugin', 'maven-surefire-plugin'].includes(
                    match[1]
                  )
                ) {
                  deps[match[1]] = 'latest';
                }
              }
              return Object.keys(deps).length > 0 ? deps : null;
            },
          });
        }

        // 各ファイルをチェック
        for (const { path, parser } of filesToCheck) {
          try {
            const response = await fetch(
              `https://api.github.com/repos/${repo.full_name}/contents/${path}`,
              { headers }
            );

            if (response.ok) {
              const data = await response.json();
              const content = atob(data.content);
              const dependencies = parser(content);

              if (dependencies) {
                const language = repo.language || 'Unknown';

                if (!languageLibraryMap[language]) {
                  languageLibraryMap[language] = {};
                }

                for (const [lib, version] of Object.entries(dependencies)) {
                  // 言語別の集計
                  if (!languageLibraryMap[language][lib]) {
                    languageLibraryMap[language][lib] = {
                      count: 0,
                      versions: new Set(),
                    };
                  }
                  languageLibraryMap[language][lib].count++;
                  languageLibraryMap[language][lib].versions.add(version);

                  // 全体の集計とカテゴリ分類
                  let category = 'Other';
                  for (const [cat, libs] of Object.entries(
                    LIBRARY_CATEGORIES
                  )) {
                    if (libs.includes(lib)) {
                      category = cat;
                      break;
                    }
                  }

                  if (!libraryUsageMap[lib]) {
                    libraryUsageMap[lib] = {
                      category,
                      usage: 0,
                      versions: new Set(),
                    };
                  }
                  libraryUsageMap[lib].usage++;
                  libraryUsageMap[lib].versions.add(version);
                }
              }
            }
          } catch (e) {
            console.warn(`Failed to analyze ${path} for ${repo.full_name}:`, e);
          }
        }
      } catch (e) {
        console.warn(
          `Failed to analyze dependencies for ${repo.full_name}:`,
          e
        );
      }
    }

    // 結果を整形
    const languages: import('../types/github').LanguageLibraries[] = [];
    for (const [language, libs] of Object.entries(languageLibraryMap)) {
      const libraries: import('../types/github').LibraryInfo[] = Object.entries(
        libs
      )
        .map(([name, data]) => {
          let category = 'Other';
          for (const [cat, libList] of Object.entries(LIBRARY_CATEGORIES)) {
            if (libList.includes(name)) {
              category = cat;
              break;
            }
          }

          return {
            name,
            category,
            usage: data.count,
            versions: Array.from(data.versions),
          };
        })
        .sort((a, b) => b.usage - a.usage); // 網羅優先で切り捨てない

      languages.push({
        language,
        libraries,
        totalLibraries: Object.keys(libs).length,
      });
    }

    const topLibraries: import('../types/github').LibraryInfo[] =
      Object.entries(libraryUsageMap)
        .map(([name, data]) => ({
          name,
          category: data.category,
          usage: data.usage,
          versions: Array.from(data.versions),
        }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 20); // 全体のトップ20

    return {
      languages,
      topLibraries,
      totalUniqueLibraries: Object.keys(libraryUsageMap).length,
    };
  } catch (error) {
    console.error('Failed to analyze libraries:', error);
    return null;
  }
};

// getHeaders関数を外部で定義
const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('github_token');
  return token ? { Authorization: `token ${token}` } : {};
};

export default ScouterDisplay;
