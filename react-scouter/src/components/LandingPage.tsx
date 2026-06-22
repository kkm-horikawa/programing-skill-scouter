import UserInput from './UserInput';
import ScouterDisplay from './ScouterDisplay';
import ResumeModal from './ResumeModal';
import type { DetailedTechData, PowerLevelResult } from '../types/github';

interface LandingPageProps {
  onScan: (usernames: string[]) => void;
  isScanning: boolean;
  scanData: PowerLevelResult | null;
  usernames: string[];
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
              onScanComplete={onScanComplete}
              onScanError={onScanError}
            />
          </div>
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
