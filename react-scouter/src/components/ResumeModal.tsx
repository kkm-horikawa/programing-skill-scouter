import React, { useState, useEffect } from 'react';
import type { DetailedTechData } from '../types/github';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  techData: DetailedTechData | null;
}

interface EditableData {
  furigana: string;
  name: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  age: string;
  gender: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  contactPostalCode: string;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  personalNote: string;
  customExperiences: Array<{year: string; month: string; content: string}>;
  customQualifications: Array<{year: string; month: string; content: string}>;
  customGithubExperiences: Array<{content: string}>;
  resumeDate: string;
  customSkills: Array<{category: string; content: string}>;
}

const ResumeModal: React.FC<ResumeModalProps> = ({ isOpen, onClose, techData }) => {
  const [editableData, setEditableData] = useState<EditableData>({
    furigana: '',
    name: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    age: '',
    gender: '',
    postalCode: '',
    address: '',
    phone: '',
    email: '',
    contactPostalCode: '',
    contactAddress: '',
    contactPhone: '',
    contactEmail: '',
    personalNote: '',
    customExperiences: [],
    customQualifications: [],
    customGithubExperiences: [],
    resumeDate: '',
    customSkills: []
  });

  const [isEditing, setIsEditing] = useState(false);

  // ローカルストレージから保存されたデータを読み込む
  useEffect(() => {
    if (techData) {
      const savedData = localStorage.getItem(`resume-${techData.username}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setEditableData(parsed);
      } else {
        // デフォルト値を設定
        const currentDate = new Date();
        
        // GitHubデータからスキルのデフォルト値を作成
        const defaultSkills = [];
        
        // 主要プログラミング言語
        if (techData.languages.length > 0) {
          defaultSkills.push({
            category: '主要プログラミング言語',
            content: techData.languages.map(lang => `${lang.name} (${lang.percentage}%)`).join(', ')
          });
        }
        
        // フレームワーク・ライブラリ
        if (Array.from(techData.techStack.frameworks).length > 0) {
          defaultSkills.push({
            category: 'フレームワーク・ライブラリ',
            content: Array.from(techData.techStack.frameworks).join(', ')
          });
        }
        
        // 開発・運用ツール
        if (Array.from(techData.techStack.devops).length > 0) {
          defaultSkills.push({
            category: '開発・運用ツール',
            content: Array.from(techData.techStack.devops).join(', ')
          });
        }

        // GitHubデータから技術経歴の豊富なデフォルト値を作成
        const defaultGithubExperiences = [
          { content: `【GitHubアカウント情報】\nユーザー名: @${techData.username}\nGitHub Power Level: ${techData.powerLevel.toLocaleString()}\nアカウント作成: ${techData.profile?.created_at ? new Date(techData.profile.created_at).getFullYear() + '年' : '不明'}\nプロフィール: ${techData.profile?.bio || 'プロフィール情報なし'}` },
          
          { content: `【リポジトリ実績】\n公開リポジトリ数: ${techData.stats.repos}件\n獲得Star総数: ${techData.stats.stars}件\nフォロワー数: ${techData.stats.followers}人\nフォロー数: ${techData.stats.following}人\nGist数: ${techData.stats.gists}件` },
          
          { content: `【プロフィールREADME情報】\n${techData.profileReadme?.hasReadme ? 
            `プロフィールREADME: 設定済み\n${techData.profileReadme.sections.introduction ? '自己紹介セクション有り\n' : ''}${techData.profileReadme.sections.skills ? 'スキルセクション有り\n' : ''}${techData.profileReadme.sections.projects ? 'プロジェクトセクション有り\n' : ''}${techData.profileReadme.sections.contact ? 'コンタクトセクション有り' : ''}` :
            'プロフィールREADME: 未設定'
          }` },
          
          { content: `【アチーブメント・実績】\n${techData.achievements && techData.achievements.length > 0 ? 
            techData.achievements.slice(0, 3).map(achievement => 
              `${achievement.name} (${achievement.tier}): ${achievement.description}`
            ).join('\n') + (techData.achievements.length > 3 ? `\n他 ${techData.achievements.length - 3}件のアチーブメント` : '') :
            'GitHub Achievementsデータ未取得または未解放'
          }` },
          
          { content: `【主要リポジトリ実績】\n${techData.topRepositories && techData.topRepositories.length > 0 ?
            techData.topRepositories.slice(0, 3).map(repo => 
              `${repo.name}: ⭐${repo.stargazers_count} 🍴${repo.forks_count}\n言語: ${repo.language || '不明'}\n${repo.description || '説明なし'}`
            ).join('\n\n') :
            '主要リポジトリ情報未取得'
          }` },
          
          { content: `【組織・所属情報】\n${techData.organizations && techData.organizations.length > 0 ?
            `所属組織数: ${techData.organizations.length}件\n` + techData.organizations.slice(0, 3).map(org => org.login).join(', ') + 
            (techData.organizations.length > 3 ? ` 他${techData.organizations.length - 3}件` : '') :
            '組織所属情報なし'
          }` },
          
          { content: `【コントリビューション活動】\n総コントリビューション数: ${techData.contributionDetails?.totalContributions || techData.stats.contributions}件\n最長連続コントリビューション: ${techData.contributionDetails?.longestStreak || '不明'}日\n現在の連続記録: ${techData.contributionDetails?.currentStreak || '不明'}日\n最もアクティブな曜日: ${techData.contributionDetails?.mostActiveDay || '不明'}` },
          
          { content: `【アカウント指標】\nアカウント年数: ${techData.accountMetrics?.accountAge ? Math.floor(techData.accountMetrics.accountAge / 365) + '年' : '不明'}\n初回コミット: ${techData.accountMetrics?.firstCommitDate || '不明'}\n最終アクティブ: ${techData.accountMetrics?.lastActiveDate || '不明'}\n総コミット数: ${techData.accountMetrics?.totalCommits || '不明'}件\n総PR数: ${techData.accountMetrics?.totalPullRequests || '不明'}件\n総Issue数: ${techData.accountMetrics?.totalIssues || '不明'}件` },
          
          { content: `【主要プログラミング言語】\n${techData.languages.length > 0 ? 
            techData.languages.map(lang => `${lang.name}: ${lang.percentage}% (${(lang.bytes / 1024).toFixed(1)}KB)`).join('\n') : 
            '言語データなし'
          }` },
          
          { content: `【技術スタック詳細】\nフレームワーク・ライブラリ: ${Array.from(techData.techStack.frameworks).length > 0 ? Array.from(techData.techStack.frameworks).join(', ') : 'なし'}\n開発・運用ツール: ${Array.from(techData.techStack.devops).length > 0 ? Array.from(techData.techStack.devops).join(', ') : 'なし'}\nテスト関連: ${Array.from(techData.techStack.testing).length > 0 ? Array.from(techData.techStack.testing).join(', ') : 'なし'}\nデータベース: ${Array.from(techData.techStack.databases || []).length > 0 ? Array.from(techData.techStack.databases || []).join(', ') : 'なし'}` },
          
          { content: `【外部連携・プロフィール拡張情報】\n所在地: ${techData.profile?.location || '未設定'}\n会社・組織: ${techData.profile?.company || '未設定'}\nブログ・Website: ${techData.profile?.blog || '未設定'}\nTwitter: ${techData.profile?.twitter_username ? '@' + techData.profile.twitter_username : '未設定'}\nメール公開: ${techData.profile?.email ? '設定済み' : '非公開'}` }
        ].filter(item => item.content && !item.content.includes('データなし') && !item.content.includes('未取得'));
        
        setEditableData({
          furigana: techData.username.toLowerCase(),
          name: techData.username,
          birthYear: '',
          birthMonth: '',
          birthDay: '',
          age: '',
          gender: '',
          postalCode: '',
          address: '',
          phone: '',
          email: '',
          contactPostalCode: '',
          contactAddress: '',
          contactPhone: '',
          contactEmail: '',
          personalNote: `ソフトウェアエンジニアとして、GitHub上での実績（Power Level: ${techData.powerLevel.toLocaleString()}）を活かし、チーム開発やOSS貢献を通じて技術力向上に努めてまいります。\n\n主要な技術領域: ${techData.languages.slice(0, 2).map(lang => lang.name).join('、')}を中心とした開発`,
          customExperiences: [], // 初期は空
          customQualifications: [], // 初期は空
          customGithubExperiences: defaultGithubExperiences, // GitHubデータからのデフォルト値
          resumeDate: `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${currentDate.getDate()}日現在`,
          customSkills: defaultSkills // GitHubデータからのデフォルト値
        });
      }
    }
  }, [techData]);

  // 一時保存機能
  const handleSave = () => {
    if (techData) {
      localStorage.setItem(`resume-${techData.username}`, JSON.stringify(editableData));
      alert('履歴書が一時保存されました');
    }
  };

  // 編集データの更新
  const updateEditableData = (field: keyof EditableData, value: string | string[] | Array<{year: string; month: string; content: string}> | Array<{category: string; content: string}> | Array<{content: string}>) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  // 経歴・資格の行を更新
  const updateExperienceRow = (index: number, field: 'year' | 'month' | 'content', value: string) => {
    const newExperiences = [...(editableData.customExperiences || [])];
    newExperiences[index] = { ...newExperiences[index], [field]: value };
    updateEditableData('customExperiences', newExperiences);
  };

  const updateQualificationRow = (index: number, field: 'year' | 'month' | 'content', value: string) => {
    const newQualifications = [...(editableData.customQualifications || [])];
    newQualifications[index] = { ...newQualifications[index], [field]: value };
    updateEditableData('customQualifications', newQualifications);
  };

  // GitHub経歴の行を更新
  const updateGithubExperienceRow = (index: number, field: 'content', value: string) => {
    const newGithubExperiences = [...(editableData.customGithubExperiences || [])];
    newGithubExperiences[index] = { ...newGithubExperiences[index], [field]: value };
    updateEditableData('customGithubExperiences', newGithubExperiences);
  };

  // スキル行を更新
  const updateSkillRow = (index: number, field: 'category' | 'content', value: string) => {
    const newSkills = [...(editableData.customSkills || [])];
    newSkills[index] = { ...newSkills[index], [field]: value };
    updateEditableData('customSkills', newSkills);
  };

  // 行を追加
  const addExperienceRow = () => {
    updateEditableData('customExperiences', [...(editableData.customExperiences || []), { year: '', month: '', content: '' }]);
  };

  const addQualificationRow = () => {
    updateEditableData('customQualifications', [...(editableData.customQualifications || []), { year: '', month: '', content: '' }]);
  };

  const addGithubExperienceRow = () => {
    updateEditableData('customGithubExperiences', [...(editableData.customGithubExperiences || []), { content: '' }]);
  };

  const addSkillRow = () => {
    updateEditableData('customSkills', [...(editableData.customSkills || []), { category: '', content: '' }]);
  };

  // 行を削除
  const removeExperienceRow = (index: number) => {
    const newExperiences = (editableData.customExperiences || []).filter((_, i) => i !== index);
    updateEditableData('customExperiences', newExperiences);
  };

  const removeQualificationRow = (index: number) => {
    const newQualifications = (editableData.customQualifications || []).filter((_, i) => i !== index);
    updateEditableData('customQualifications', newQualifications);
  };

  const removeGithubExperienceRow = (index: number) => {
    const newGithubExperiences = (editableData.customGithubExperiences || []).filter((_, i) => i !== index);
    updateEditableData('customGithubExperiences', newGithubExperiences);
  };

  const removeSkillRow = (index: number) => {
    const newSkills = (editableData.customSkills || []).filter((_, i) => i !== index);
    updateEditableData('customSkills', newSkills);
  };

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
          <button className="edit-button" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? '✅ 完了' : '✏️ 編集'}
          </button>
          <button className="save-button" onClick={handleSave}>
            💾 一時保存
          </button>
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
                <span className="date-label">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableData.resumeDate}
                      onChange={(e) => updateEditableData('resumeDate', e.target.value)}
                      className="editable-input date-input"
                      placeholder="年　月　日現在"
                    />
                  ) : (
                    editableData.resumeDate || '年　　月　　日現在'
                  )}
                </span>
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
                <div className="info-content furigana">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableData.furigana}
                      onChange={(e) => updateEditableData('furigana', e.target.value)}
                      className="editable-input furigana-input"
                    />
                  ) : (
                    editableData.furigana
                  )}
                </div>
              </div>
              
              <div className="info-row">
                <label>氏名</label>
                <div className="info-content name">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableData.name}
                      onChange={(e) => updateEditableData('name', e.target.value)}
                      className="editable-input name-input"
                    />
                  ) : (
                    editableData.name
                  )}
                </div>
              </div>
              
              <div className="info-row birth-gender-row">
                <label>生年月日</label>
                <div className="birth-section">
                  <span className="birth-input-group">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editableData.birthYear}
                        onChange={(e) => updateEditableData('birthYear', e.target.value)}
                        className="editable-input year-input"
                        placeholder="西暦"
                      />
                    ) : (
                      <span className="year-input">{editableData.birthYear || '　　　　'}</span>
                    )}年
                    {isEditing ? (
                      <input
                        type="text"
                        value={editableData.birthMonth}
                        onChange={(e) => updateEditableData('birthMonth', e.target.value)}
                        className="editable-input month-input"
                        placeholder="月"
                      />
                    ) : (
                      <span className="month-input">{editableData.birthMonth || '　　'}</span>
                    )}月
                    {isEditing ? (
                      <input
                        type="text"
                        value={editableData.birthDay}
                        onChange={(e) => updateEditableData('birthDay', e.target.value)}
                        className="editable-input day-input"
                        placeholder="日"
                      />
                    ) : (
                      <span className="day-input">{editableData.birthDay || '　　'}</span>
                    )}日生
                    （満{isEditing ? (
                      <input
                        type="text"
                        value={editableData.age}
                        onChange={(e) => updateEditableData('age', e.target.value)}
                        className="editable-input age-input"
                        placeholder="歳"
                      />
                    ) : (
                      <span className="age-input">{editableData.age || '　　'}</span>
                    )}歳）
                  </span>
                </div>
                <label className="gender-label">性別</label>
                <div className="gender-section">
                  {isEditing ? (
                    <select
                      value={editableData.gender}
                      onChange={(e) => updateEditableData('gender', e.target.value)}
                      className="editable-select gender-select"
                    >
                      <option value="">選択してください</option>
                      <option value="男性">男性</option>
                      <option value="女性">女性</option>
                      <option value="その他">その他</option>
                      <option value="無回答">無回答</option>
                    </select>
                  ) : (
                    <span className="gender-options">
                      <span className="gender-option">{editableData.gender === '男性' ? '☑' : '□'} 男性</span>
                      <span className="gender-option">{editableData.gender === '女性' ? '☑' : '□'} 女性</span>
                      <span className="gender-option">{editableData.gender === 'その他' ? '☑' : '□'} その他</span>
                      <span className="gender-option">{editableData.gender === '無回答' ? '☑' : '□'} 無回答</span>
                    </span>
                  )}
                </div>
              </div>
              
              <div className="info-row furigana-row">
                <label>ふりがな</label>
                <div className="info-content furigana"></div>
              </div>
              
              <div className="info-row address-row">
                <label>現住所</label>
                <div className="info-content address">
                  <div className="address-fields">
                    <div className="postal-code-field">
                      〒{isEditing ? (
                        <input
                          type="text"
                          value={editableData.postalCode}
                          onChange={(e) => updateEditableData('postalCode', e.target.value)}
                          className="editable-input postal-code-input"
                          placeholder="000-0000"
                          maxLength={8}
                        />
                      ) : (
                        editableData.postalCode || '　　　－　　　　'
                      )}
                    </div>
                    <div className="address-field">
                      {isEditing ? (
                        <textarea
                          value={editableData.address}
                          onChange={(e) => updateEditableData('address', e.target.value)}
                          className="editable-textarea address-textarea"
                          placeholder="住所を入力してください（改行可能）"
                          rows={2}
                        />
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: editableData.address.replace(/\n/g, '<br/>') }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="info-row contact-row">
                <label>電話</label>
                <div className="info-content contact">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableData.phone}
                      onChange={(e) => updateEditableData('phone', e.target.value)}
                      className="editable-input phone-input"
                      placeholder="電話番号"
                    />
                  ) : (
                    editableData.phone
                  )}
                </div>
                <label>E-mail</label>
                <div className="info-content contact">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableData.email}
                      onChange={(e) => updateEditableData('email', e.target.value)}
                      className="editable-input email-input"
                      placeholder="メールアドレス"
                    />
                  ) : (
                    editableData.email
                  )}
                </div>
              </div>
              
              <div className="info-row furigana-row">
                <label>ふりがな</label>
                <div className="info-content furigana"></div>
              </div>
              
              <div className="info-row address-row">
                <label>連絡先</label>
                <div className="info-content address">
                  <div className="address-fields">
                    <div className="postal-code-field">
                      〒{isEditing ? (
                        <input
                          type="text"
                          value={editableData.contactPostalCode}
                          onChange={(e) => updateEditableData('contactPostalCode', e.target.value)}
                          className="editable-input postal-code-input"
                          placeholder="000-0000"
                          maxLength={8}
                        />
                      ) : (
                        editableData.contactPostalCode || '　　　－　　　　'
                      )}
                    </div>
                    <div className="address-field">
                      {isEditing ? (
                        <textarea
                          value={editableData.contactAddress}
                          onChange={(e) => updateEditableData('contactAddress', e.target.value)}
                          className="editable-textarea address-textarea"
                          placeholder="連絡先住所を入力してください（現住所以外に連絡を希望する場合のみ記入・改行可能）"
                          rows={2}
                        />
                      ) : (
                        <div>
                          {editableData.contactAddress ? 
                            <div dangerouslySetInnerHTML={{ __html: editableData.contactAddress.replace(/\n/g, '<br/>') }} /> :
                            '（現住所以外に連絡を希望する場合のみ記入）'
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="info-row contact-row">
                <label>電話</label>
                <div className="info-content contact">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableData.contactPhone}
                      onChange={(e) => updateEditableData('contactPhone', e.target.value)}
                      className="editable-input phone-input"
                      placeholder="連絡先電話番号"
                    />
                  ) : (
                    editableData.contactPhone
                  )}
                </div>
                <label>E-mail</label>
                <div className="info-content contact">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableData.contactEmail}
                      onChange={(e) => updateEditableData('contactEmail', e.target.value)}
                      className="editable-input email-input"
                      placeholder="連絡先メールアドレス"
                    />
                  ) : (
                    editableData.contactEmail
                  )}
                </div>
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
                  {/* 動的に技術経歴を表示（左ページは最初の5行まで） */}
                  {(editableData.customExperiences || []).slice(0, 5).map((exp, index) => (
                    <tr key={index}>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={exp.year}
                            onChange={(e) => updateExperienceRow(index, 'year', e.target.value)}
                            className="editable-input table-year-input"
                            placeholder="年"
                          />
                        ) : (
                          exp.year
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={exp.month}
                            onChange={(e) => updateExperienceRow(index, 'month', e.target.value)}
                            className="editable-input table-month-input"
                            placeholder="月"
                          />
                        ) : (
                          exp.month
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="table-content-edit">
                            <textarea
                              value={exp.content}
                              onChange={(e) => updateExperienceRow(index, 'content', e.target.value)}
                              className="editable-textarea table-content-textarea"
                              placeholder="技術経歴・開発経験を入力（改行可能）"
                              rows={2}
                            />
                            <button
                              type="button"
                              onClick={() => removeExperienceRow(index)}
                              className="remove-row-btn"
                              title="行を削除"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: exp.content.replace(/\n/g, '<br/>') }} />
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* データがない場合のメッセージ */}
                  {(editableData.customExperiences || []).length === 0 && !isEditing && (
                    <tr>
                      <td></td>
                      <td></td>
                      <td style={{color: '#999', fontStyle: 'italic'}}>技術経歴がまだ入力されていません</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="table-controls">
                <button
                  type="button"
                  onClick={addExperienceRow}
                  className="add-row-btn"
                  disabled={!isEditing}
                >
                  + 経歴を追加
                </button>
              </div>
              <div className="note">※「性別」欄は、記載は任意です。未記載とすることも可能です。</div>
            </div>
          </div>

          {/* 右ページ */}
          <div className="resume-page resume-right">
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
                  {(editableData.customQualifications || []).map((qual, index) => (
                    <tr key={index}>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={qual.year}
                            onChange={(e) => updateQualificationRow(index, 'year', e.target.value)}
                            className="editable-input table-year-input"
                            placeholder="年"
                          />
                        ) : (
                          qual.year
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={qual.month}
                            onChange={(e) => updateQualificationRow(index, 'month', e.target.value)}
                            className="editable-input table-month-input"
                            placeholder="月"
                          />
                        ) : (
                          qual.month
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="table-content-edit">
                            <textarea
                              value={qual.content}
                              onChange={(e) => updateQualificationRow(index, 'content', e.target.value)}
                              className="editable-textarea table-content-textarea"
                              placeholder="技術資格・認定を入力（改行可能）"
                              rows={2}
                            />
                            <button
                              type="button"
                              onClick={() => removeQualificationRow(index)}
                              className="remove-row-btn"
                              title="行を削除"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: qual.content.replace(/\n/g, '<br/>') }} />
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* データがない場合のメッセージ */}
                  {(editableData.customQualifications || []).length === 0 && !isEditing && (
                    <tr>
                      <td></td>
                      <td></td>
                      <td style={{color: '#999', fontStyle: 'italic'}}>技術資格・認定がまだ入力されていません</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="table-controls">
                <button
                  type="button"
                  onClick={addQualificationRow}
                  className="add-row-btn"
                  disabled={!isEditing}
                >
                  + 資格を追加
                </button>
              </div>
            </div>

            {/* GitHub技術情報・実績セクション */}
            <div className="github-section">
              <table className="experience-table">
                <thead>
                  <tr>
                    <th className="github-info-col">GitHub技術情報・開発実績（GitHubデータより自動抽出）</th>
                  </tr>
                </thead>
                <tbody>
                  {/* GitHubデータから取得した技術情報を表示 */}
                  {(editableData.customGithubExperiences || []).map((exp, index) => (
                    <tr key={index}>
                      <td>
                        {isEditing ? (
                          <div className="table-content-edit">
                            <textarea
                              value={exp.content}
                              onChange={(e) => updateGithubExperienceRow(index, 'content', e.target.value)}
                              className="editable-textarea table-content-textarea"
                              placeholder="GitHub技術情報・実績を入力（改行可能）"
                              rows={2}
                            />
                            <button
                              type="button"
                              onClick={() => removeGithubExperienceRow(index)}
                              className="remove-row-btn"
                              title="行を削除"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: exp.content.replace(/\n/g, '<br/>') }} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-controls">
                <button
                  type="button"
                  onClick={addGithubExperienceRow}
                  className="add-row-btn"
                  disabled={!isEditing}
                >
                  + GitHub情報を追加
                </button>
              </div>
            </div>

            {/* 使用技術・特技・アピールポイント等セクション */}
            <div className="skills-section">
              <div className="section-header">使用技術・特技・アピールポイントなど</div>
              <div className="skills-content">
                {(editableData.customSkills || []).length === 0 && !isEditing ? (
                  <div style={{color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '20px'}}>
                    スキル・アピールポイントがまだ入力されていません
                  </div>
                ) : (
                  (editableData.customSkills || []).map((skill, index) => (
                    <div key={index} className="skill-category">
                      <div className="skill-item">
                        <strong>
                          {isEditing ? (
                            <input
                              type="text"
                              value={skill.category}
                              onChange={(e) => updateSkillRow(index, 'category', e.target.value)}
                              className="editable-input skill-category-input"
                              placeholder="カテゴリ名（例：主要プログラミング言語）"
                            />
                          ) : (
                            skill.category
                          )}:
                        </strong>
                        <br/>
                        {isEditing ? (
                          <div className="skill-content-edit">
                            <textarea
                              value={skill.content}
                              onChange={(e) => updateSkillRow(index, 'content', e.target.value)}
                              className="editable-textarea skills-textarea"
                              placeholder="内容を入力してください（改行可能）"
                              rows={2}
                            />
                            <button
                              type="button"
                              onClick={() => removeSkillRow(index)}
                              className="remove-row-btn skill-remove-btn"
                              title="スキルを削除"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: skill.content.replace(/\n/g, '<br/>') }} />
                        )}
                      </div>
                      {index < (editableData.customSkills || []).length - 1 && <br/>}
                    </div>
                  ))
                )}
              </div>
              <div className="table-controls">
                <button
                  type="button"
                  onClick={addSkillRow}
                  className="add-row-btn"
                  disabled={!isEditing}
                >
                  + スキル・アピールポイントを追加
                </button>
              </div>
            </div>

            {/* 本人希望記入欄セクション */}
            <div className="personal-note-section">
              <div className="section-header">本人希望記入欄（特に給料・職種・勤務時間・勤務地・その他についての希望などがあれば記入）</div>
              <div className="personal-note-content">
                {isEditing ? (
                  <textarea
                    value={editableData.personalNote}
                    onChange={(e) => updateEditableData('personalNote', e.target.value)}
                    className="editable-textarea personal-note-textarea"
                    placeholder="本人希望記入欄の内容を入力してください"
                    rows={6}
                  />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: editableData.personalNote.replace(/\n/g, '<br/>') }} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeModal;