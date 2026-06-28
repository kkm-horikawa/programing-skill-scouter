import UserInput from './UserInput';
import ScouterDisplay from './ScouterDisplay';
import ResumeModal from './ResumeModal';
import type { DetailedTechData, PowerLevelResult } from '../types/github';

// 規律（craft）軸で見ている「作り込みの痕跡」6グループ。
// skill-measurement/badges の6グループに対応。
const CRAFT_GROUPS = [
  {
    title: 'Git運用',
    desc: 'プルリクでのレビューやブランチ保護など、ひとりよがりにならない進め方',
  },
  {
    title: 'コード品質',
    desc: 'Linter・フォーマッタ・型の設定など、読みやすさを保つ仕組み',
  },
  {
    title: 'テスト',
    desc: '雛形だけで終わらない、意味のあるテストが書かれているか',
  },
  {
    title: 'CI',
    desc: 'プッシュのたびに自動でチェックが回る仕組みがあるか',
  },
  {
    title: 'ビルド・配布',
    desc: 'リリース・コンテナ化・ドキュメントなど、人に届けるための作り込み',
  },
  {
    title: 'セキュリティ',
    desc: '依存関係の管理や秘密情報の扱いに配慮があるか',
  },
];

// 技術階級（craft tier）。規律の積み上がりで上がる。上から強い順。
const CRAFT_TIERS = [
  {
    label: 'エキスパート',
    desc: '世界規模で使われる成果。誰もが知る伝説級はここに入ります',
  },
  {
    label: '上級',
    desc: 'パッケージとして公開し、第三者が使える形まで仕上げている',
  },
  {
    label: '上級見習い',
    desc: 'リリースや配布、ドキュメントまで手が回っている',
  },
  {
    label: '中級',
    desc: 'レビュー運用と自動化が定着し、プロフィールも整っている',
  },
  {
    label: '中級見習い',
    desc: 'CI・テスト・Linterを実際に回している',
  },
  {
    label: '初級',
    desc: 'おもちゃではない、実際に動くコードがある',
  },
  {
    label: '休眠',
    desc: 'まだ評価できる成果が見当たらない状態',
  },
];

interface LandingPageProps {
  onScan: (
    usernames: string[],
    deepMode: boolean,
    orgLogins?: string[]
  ) => void;
  isScanning: boolean;
  scanData: PowerLevelResult | null;
  usernames: string[];
  deepMode: boolean;
  orgLogins: string[];
  onScanComplete: (data: PowerLevelResult, techData: DetailedTechData) => void;
  onScanError: () => void;
  onShowResume: () => void;
  hasDetailedData: boolean;
  isResumeOpen: boolean;
  onCloseResume: () => void;
  techData: DetailedTechData | null;
}

const LandingPage: React.FC<LandingPageProps> = ({
  onScan,
  isScanning,
  scanData,
  usernames,
  deepMode,
  orgLogins,
  onScanComplete,
  onScanError,
  onShowResume,
  hasDetailedData,
  isResumeOpen,
  onCloseResume,
  techData,
}) => {
  return (
    <div className="landing-page">
      {/* ファーストビューにスキャン画面を同居させる */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="hero-title-main">Programmer Scouter</span>
              <span className="hero-title-sub">
                某世界的漫画風スカウターでGitHubの実力を測定
              </span>
            </h1>
            <p className="hero-description">
              コミット数ではなく<strong>設計の規律と採用</strong>で評価。
              <br />
              結果はSVGダウンロード＆<strong>履歴書を自動生成</strong>。
            </p>
            <UserInput
              onScan={onScan}
              isScanning={isScanning}
              onShowResume={onShowResume}
              hasDetailedData={hasDetailedData}
            />
          </div>
          <div className="hero-visual">
            <ScouterDisplay
              isScanning={isScanning}
              scanData={scanData}
              usernames={usernames}
              deepMode={deepMode}
              orgLogins={orgLogins}
              onScanComplete={onScanComplete}
              onScanError={onScanError}
            />
          </div>
        </div>
      </section>

      {/* どうやって測っているか */}
      <section className="measure-explainer">
        <div className="measure-explainer-inner">
          <h2 className="section-title">
            どうやって「戦闘力」を測っているのか
          </h2>
          <p className="measure-lead">
            AIにまとめて書かせれば、コミットもスターも数だけは増やせる時代です。
            だからこのスカウターは「数」では強さを測りません。
            代わりに、コードに残る<strong>作り方の規律</strong>と、
            世界が実際にその成果を使ったかという<strong>採用</strong>、
            この二つの軸で実力を見ます。
          </p>

          <div className="axis-grid">
            <div className="axis-card axis-craft">
              <span className="axis-tag">軸その1</span>
              <h3>規律 ── 土台の階級を決める</h3>
              <p>
                あなたの代表的なリポジトリを開いて、テスト・CI・レビュー（プルリク）・
                リリース・公開といった「ちゃんと作っている痕跡」を探します。
                痕跡が積み上がるほど階級が上がります。
                <strong>
                  コミットやプルリクをいくつ積んでも、この階級は1段も上がりません。
                </strong>
              </p>
              <p className="axis-note">
                逆に、規模のあるリポジトリなのにテストもCIもなく、巨大な一括コミットと
                「Update」だけのメッセージが並ぶ——いわゆる丸投げの痕跡が強いものは、
                階級を初級まで引き下げます。
              </p>
            </div>

            <div className="axis-card axis-reach">
              <span className="axis-tag">軸その2</span>
              <h3>採用 ── 上限なしの上積み</h3>
              <p>
                スター、フォーク、フォロワー。 これは
                <strong>他人が実際に使い、評価した</strong>という、
                後から盛りにくいシグナルです。ここだけは上限なく戦闘力に加算されます。
                実際に使われた証であるフォークを、スターより重く見ています。
              </p>
              <p className="axis-note">
                プルリクの数といった「活動量」は、業務リポジトリへの乱発で簡単に膨らみ、
                実力とは結びつかないため、あえて評価に入れていません。
              </p>
            </div>
          </div>

          <p className="measure-formula">
            <span>規律で決まる土台</span>
            <span className="formula-op">＋</span>
            <span>採用の上積み</span>
            <span className="formula-op">＝</span>
            <span className="formula-result">戦闘力</span>
          </p>

          <div className="craft-detail">
            <h3 className="block-title">規律として見ている6つの観点</h3>
            <div className="craft-grid">
              {CRAFT_GROUPS.map((g) => (
                <div className="craft-item" key={g.title}>
                  <h4>{g.title}</h4>
                  <p>{g.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="tier-block">
            <h3 className="block-title">
              規律が積み上がると上がる「技術階級」
            </h3>
            <p className="tier-lead">
              スキャン結果には、戦闘力とは別に、純粋な作り込みの度合いを示す技術階級も並びます。
            </p>
            <div className="tier-ladder">
              {CRAFT_TIERS.map((t, i) => (
                <div className="tier-row" key={t.label}>
                  <span className="tier-step">{CRAFT_TIERS.length - i}</span>
                  <span className="tier-name">{t.label}</span>
                  <span className="tier-desc">{t.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="measure-footnote">
            評価は「全リポジトリの量」ではなく、代表的な数本（公開の上位5本・非公開の上位2本）の
            作り込みで判断します。使うのはGitHubの公開情報だけで、あなたのデータを保存することはありません。
            自分のトークンで分析すれば、非公開リポジトリも含めた自己診断ができます。
          </p>
        </div>
      </section>

      {/* Resume Modal */}
      <ResumeModal
        isOpen={isResumeOpen}
        onClose={onCloseResume}
        techData={techData}
      />
    </div>
  );
};

export default LandingPage;
