import { useState } from 'react';
import UserInput from './UserInput';
import ScouterDisplay from './ScouterDisplay';
import ResumeModal from './ResumeModal';
import type { DetailedTechData, PowerLevelResult } from '../types/github';

interface LandingPageProps {
  onScan: (username: string) => void;
  isScanning: boolean;
  scanData: PowerLevelResult | null;
  username: string;
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
  username,
  onScanComplete,
  onScanError,
  onShowResume,
  hasDetailedData,
  isResumeOpen,
  onCloseResume,
  techData
}) => {
  const [showScanner, setShowScanner] = useState(false);

  const handleGetStarted = () => {
    setShowScanner(true);
    const scannerSection = document.getElementById('scanner-section');
    if (scannerSection) {
      scannerSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="hero-title-main">GitHub Power Scouter</span>
              <span className="hero-title-sub">v2.0</span>
            </h1>
            <p className="hero-description">
              某世界的漫画風のスカウターでGitHubユーザーの<br/>
              プログラミングスキルを分析し、<br/>
              <strong>エンジニア向け履歴書</strong>を自動生成
            </p>
            <div className="hero-features">
              <div className="hero-feature">
                <span className="feature-icon">🔍</span>
                <span>リアルタイム分析</span>
              </div>
              <div className="hero-feature">
                <span className="feature-icon">📊</span>
                <span>パワーレベル測定</span>
              </div>
              <div className="hero-feature">
                <span className="feature-icon">📄</span>
                <span>履歴書自動生成</span>
              </div>
            </div>
            <button className="cta-button" onClick={handleGetStarted}>
              <span className="cta-text">今すぐスキャンしてみる</span>
              <span className="cta-arrow">→</span>
            </button>
          </div>
          <div className="hero-visual">
            <div className="scouter-preview">
              <div className="scouter-frame">
                <div className="scan-animation"></div>
                <div className="power-display">
                  <div className="power-label">POWER LEVEL</div>
                  <div className="power-value">??????</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <h2 className="section-title">主要機能</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-large">🎯</div>
              <h3>高精度分析</h3>
              <p>
                GitHubのリポジトリ、コミット履歴、言語使用率、<br/>
                スター数など多角的な指標で総合的に分析
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">📈</div>
              <h3>パワーレベル算出</h3>
              <p>
                独自のアルゴリズムでプログラミングスキルを<br/>
                数値化。客観的なスキル評価が可能
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">📋</div>
              <h3>履歴書自動生成</h3>
              <p>
                日本の正式な履歴書フォーマットで<br/>
                エンジニア向けの技術履歴書を自動作成
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section className="how-to-use-section">
        <div className="how-to-use-container">
          <h2 className="section-title">使い方</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>GitHubユーザー名を入力</h3>
                <p>分析したいGitHubのユーザー名を入力してください</p>
              </div>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>スキャン実行</h3>
                <p>リアルタイムでリポジトリや活動データを分析</p>
              </div>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>結果表示・履歴書生成</h3>
                <p>パワーレベルを確認し、履歴書をダウンロード</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scanner Section */}
      <section 
        id="scanner-section" 
        className={`scanner-section ${showScanner ? 'active' : ''}`}
      >
        <div className="scanner-container">
          <h2 className="section-title">スキル分析を開始</h2>
          <div className="scanner-content">
            <div className="scanner-input">
              <UserInput 
                onScan={onScan}
                isScanning={isScanning}
                onShowResume={onShowResume}
                hasDetailedData={hasDetailedData}
              />
            </div>
            <div className="scanner-display">
              <ScouterDisplay 
                isScanning={isScanning}
                scanData={scanData}
                username={username}
                onScanComplete={onScanComplete}
                onScanError={onScanError}
              />
            </div>
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