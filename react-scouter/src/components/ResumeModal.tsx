import type { DetailedTechData } from '../types/github';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  techData: DetailedTechData | null;
}

const ResumeModal: React.FC<ResumeModalProps> = ({ isOpen, onClose, techData }) => {
  if (!isOpen || !techData) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownload = () => {
    // PDFダウンロード機能を実装
    if (typeof window !== 'undefined' && window.print) {
      window.print();
    }
  };


  return (
    <div className="resume-modal" onClick={handleBackdropClick}>
      <div className="resume-content">
        <div className="resume-controls">
          <button className="download-button" onClick={handleDownload}>
            📄 PDF保存
          </button>
          <span className="close-button" onClick={onClose}>&times;</span>
        </div>
        
        {/* 見開き履歴書のレイアウト */}
        <div className="resume-pages">
          {/* 左ページ */}
          <div className="resume-page resume-left">
            {/* ヘッダー */}
            <div className="resume-header">
              <h1 className="resume-title">履歴書</h1>
              <div className="date-section">
                <span className="date-label">年　　月　　日現在</span>
                <div className="photo-placeholder">
                  <div className="photo-frame">
                    <div className="photo-text">写真を貼る位置</div>
                    <div className="photo-note">
                      写真を貼る必要が<br/>
                      ある場合に<br/>
                      <small>1. 縦 36～40mm</small><br/>
                      <small>横 24～30mm</small><br/>
                      <small>2. 本人単身胸から上</small><br/>
                      <small>3. 脱帽のうえ正面</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 個人情報セクション */}
            <div className="personal-info-section">
              <div className="info-row furigana-row">
                <label>ふりがな</label>
                <div className="info-content furigana">{techData.username.toLowerCase()}</div>
              </div>
              
              <div className="info-row">
                <label>氏名</label>
                <div className="info-content name">{techData.username}</div>
              </div>
              
              <div className="info-row birth-gender-row">
                <label>生年月日</label>
                <div className="birth-section">
                  <span className="birth-input-group">
                    <span className="year-input">　　　　</span>年
                    <span className="month-input">　　</span>月
                    <span className="day-input">　　</span>日生
                    （満<span className="age-input">　　</span>歳）
                  </span>
                </div>
                <label className="gender-label">性別</label>
                <div className="gender-section">
                  <span className="gender-options">
                    <span className="gender-option">□ 男性</span>
                    <span className="gender-option">□ 女性</span>
                    <span className="gender-option">□ その他</span>
                    <span className="gender-option">□ 無回答</span>
                  </span>
                </div>
              </div>
              
              <div className="info-row furigana-row">
                <label>ふりがな</label>
                <div className="info-content furigana"></div>
              </div>
              
              <div className="info-row address-row">
                <label>現住所</label>
                <div className="info-content address">〒　　　－　　　　</div>
              </div>
              
              <div className="info-row contact-row">
                <label>電話</label>
                <div className="info-content contact"></div>
                <label>E-mail</label>
                <div className="info-content contact"></div>
              </div>
              
              <div className="info-row furigana-row">
                <label>ふりがな</label>
                <div className="info-content furigana"></div>
              </div>
              
              <div className="info-row address-row">
                <label>連絡先</label>
                <div className="info-content address">〒　　　－　　　　（現住所以外に連絡を希望する場合のみ記入）</div>
              </div>
              
              <div className="info-row contact-row">
                <label>電話</label>
                <div className="info-content contact"></div>
                <label>E-mail</label>
                <div className="info-content contact"></div>
              </div>
            </div>

            {/* 技術経歴・開発経験セクション */}
            <div className="experience-section">
              <table className="experience-table">
                <thead>
                  <tr>
                    <th className="year-col">年</th>
                    <th className="month-col">月</th>
                    <th className="experience-col">技術経歴・開発経験（各項目について詳しく）</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 動的に技術経歴を表示 */}
                  <tr>
                    <td></td>
                    <td></td>
                    <td>GitHub アカウント開設・OSS活動開始</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td>主要技術スタック: {Array.from(techData.techStack.frameworks).slice(0, 3).join(', ')}</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td>使用言語: {techData.languages.map(lang => lang.name).join(', ')}</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td>公開リポジトリ数: {techData.stats.repos}件 (Star総数: {techData.stats.stars})</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td>最近30日間のコントリビューション: {techData.stats.contributions}件</td>
                  </tr>
                  {/* 空行 */}
                  {Array.from({ length: 8 }, (_, i) => (
                    <tr key={i}>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="note">※「性別」欄は、記載は任意です。未記載とすることも可能です。</div>
            </div>
          </div>

          {/* 右ページ */}
          <div className="resume-page resume-right">
            {/* 技術経歴・開発経験（続き）セクション */}
            <div className="experience-section">
              <table className="experience-table">
                <thead>
                  <tr>
                    <th className="year-col">年</th>
                    <th className="month-col">月</th>
                    <th className="experience-col">技術経歴・開発経験（各項目について詳しく）</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }, (_, i) => (
                    <tr key={i}>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 技術資格・認定セクション */}
            <div className="qualifications-section">
              <table className="qualifications-table">
                <thead>
                  <tr>
                    <th className="year-col">年</th>
                    <th className="month-col">月</th>
                    <th className="qualification-col">技術資格・認定</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td></td>
                    <td></td>
                    <td>GitHub Power Level: {techData.powerLevel.toLocaleString()}</td>
                  </tr>
                  {Array.from(techData.techStack.devops).slice(0, 3).map((tech, index) => (
                    <tr key={`devops-${index}`}>
                      <td></td>
                      <td></td>
                      <td>{tech} 実務経験</td>
                    </tr>
                  ))}
                  {Array.from(techData.techStack.testing).slice(0, 2).map((tech, index) => (
                    <tr key={`testing-${index}`}>
                      <td></td>
                      <td></td>
                      <td>{tech} テスト経験</td>
                    </tr>
                  ))}
                  {/* 空行で埋める */}
                  {Array.from({ length: Math.max(0, 5 - Math.min(3, Array.from(techData.techStack.devops).length) - Math.min(2, Array.from(techData.techStack.testing).length)) }, (_, i) => (
                    <tr key={`empty-${i}`}>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 使用技術・特技・アピールポイント等セクション */}
            <div className="skills-section">
              <div className="section-header">使用技術・特技・アピールポイントなど</div>
              <div className="skills-content">
                <div className="skill-category">
                  <strong>主要プログラミング言語:</strong><br/>
                  {techData.languages.length > 0 ? 
                    techData.languages.map((lang, index) => (
                      <span key={index}>{lang.name} ({lang.percentage}%){index < techData.languages.length - 1 ? ', ' : ''}</span>
                    )) : 
                    '未検出'
                  }
                </div>
                <br/>
                <div className="skill-category">
                  <strong>フレームワーク・ライブラリ:</strong><br/>
                  {Array.from(techData.techStack.frameworks).length > 0 ? 
                    Array.from(techData.techStack.frameworks).join(', ') : 
                    '未検出'
                  }
                </div>
                <br/>
                <div className="skill-category">
                  <strong>開発・運用ツール:</strong><br/>
                  {Array.from(techData.techStack.devops).length > 0 ? 
                    Array.from(techData.techStack.devops).join(', ') : 
                    '未検出'
                  }
                </div>
              </div>
            </div>

            {/* 本人希望記入欄セクション */}
            <div className="personal-note-section">
              <div className="section-header">本人希望記入欄（特に給料・職種・勤務時間・勤務地・その他についての希望などがあれば記入）</div>
              <div className="personal-note-content">
                <p>ソフトウェアエンジニアとして、GitHub上での実績（Power Level: {techData.powerLevel.toLocaleString()}）を活かし、
                チーム開発やOSS貢献を通じて技術力向上に努めてまいります。</p>
                <br/>
                <p>主要な技術領域: {techData.languages.slice(0, 2).map(lang => lang.name).join('、')}を中心とした開発</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeModal;