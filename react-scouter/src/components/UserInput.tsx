import { useState, useEffect } from 'react';
import type { GitHubRateLimit } from '../types/github';

interface UserInputProps {
  onScan: (usernames: string[], deepMode: boolean) => void;
  isScanning: boolean;
  onShowResume: () => void;
  hasDetailedData: boolean;
}

const UserInput: React.FC<UserInputProps> = ({
  onScan,
  isScanning,
  onShowResume,
  hasDetailedData,
}) => {
  const [username, setUsername] = useState('torvalds');
  const [deepMode, setDeepMode] = useState(false);
  const [additionalUsernames, setAdditionalUsernames] = useState<string[]>([]);
  const [showMultipleAccounts, setShowMultipleAccounts] = useState(false);
  const [token, setToken] = useState('');
  const [tokenStatus, setTokenStatus] = useState('');
  const [, setRateLimit] = useState<GitHubRateLimit | null>(null);

  // Load token from localStorage on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
      setToken(savedToken);
      checkRateLimit(savedToken);
    } else {
      checkRateLimit('');
    }
  }, []);

  const getHeaders = (githubToken: string): HeadersInit => {
    return githubToken ? { Authorization: `token ${githubToken}` } : {};
  };

  const checkRateLimit = async (githubToken: string) => {
    try {
      const headers = getHeaders(githubToken);
      const response = await fetch('https://api.github.com/rate_limit', {
        headers,
      });
      const data: GitHubRateLimit = await response.json();
      setRateLimit(data);

      const remaining = data.rate.remaining;
      const limit = data.rate.limit;
      const reset = new Date(data.rate.reset * 1000);

      if (githubToken) {
        setTokenStatus(
          `認証済み: ${remaining}/${limit} 回 (${reset.toLocaleTimeString()}にリセット)`
        );
      } else {
        setTokenStatus(
          `未認証: ${remaining}/${limit} 回 (${reset.toLocaleTimeString()}にリセット)`
        );
      }
    } catch (error) {
      console.error('Rate limit check failed:', error);
      setTokenStatus('API制限チェックに失敗しました');
    }
  };

  const handleSaveToken = () => {
    const tokenValue = token.trim();
    if (!tokenValue) {
      setTokenStatus('トークンを入力してください');
      return;
    }

    if (
      !tokenValue.startsWith('ghp_') &&
      !tokenValue.startsWith('github_pat_')
    ) {
      setTokenStatus('無効なトークン形式です');
      return;
    }

    localStorage.setItem('github_token', tokenValue);
    setTokenStatus('トークンを保存しました');
    checkRateLimit(tokenValue);
  };

  const handleClearToken = () => {
    localStorage.removeItem('github_token');
    setToken('');
    setTokenStatus('トークンを削除しました');
    checkRateLimit('');
  };

  const handleScan = async () => {
    if (deepMode) {
      // DEEP分析: トークンの本人を private 込みで測る。login をトークンから解決。
      const tok = localStorage.getItem('github_token');
      if (!tok) {
        setTokenStatus('DEEP分析には repo スコープのトークンが必要です');
        return;
      }
      try {
        const res = await fetch('https://api.github.com/user', {
          headers: getHeaders(tok),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!data.login) throw new Error('no login');
        onScan([data.login], true);
      } catch {
        setTokenStatus(
          '認証に失敗（repo スコープのトークンか確認してください）'
        );
      }
      return;
    }

    const allUsernames = [username.trim(), ...additionalUsernames].filter(
      (u) => u.length > 0
    );

    if (allUsernames.length > 0) {
      onScan(allUsernames, false);
    }
  };

  const handleAddUsername = () => {
    setAdditionalUsernames([...additionalUsernames, '']);
  };

  const handleRemoveUsername = (index: number) => {
    const newUsernames = additionalUsernames.filter((_, i) => i !== index);
    setAdditionalUsernames(newUsernames);
  };

  const handleUpdateUsername = (index: number, value: string) => {
    const newUsernames = [...additionalUsernames];
    newUsernames[index] = value;
    setAdditionalUsernames(newUsernames);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isScanning) {
      handleScan();
    }
  };

  return (
    <div className="input-container">
      <div className="scan-section">
        <input
          type="text"
          value={deepMode ? '' : username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            deepMode
              ? '自分のアカウント（トークンから自動）'
              : 'GitHub Username'
          }
          className="username-input"
          disabled={deepMode}
        />
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="scan-button"
        >
          {isScanning ? 'SCANNING...' : 'SCAN'}
        </button>
      </div>

      <label
        className="deep-mode-toggle"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '8px',
          fontSize: '12px',
          color: deepMode ? '#36ff8b' : '#0f0',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={deepMode}
          onChange={(e) => setDeepMode(e.target.checked)}
        />
        🔒 DEEP分析（自己分析・Private含む）
        {deepMode && (
          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=Programmer%20Scouter%20deep"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#36ff8b', marginLeft: '4px' }}
          >
            repoスコープのトークン発行→
          </a>
        )}
      </label>

      <button
        onClick={() => setShowMultipleAccounts(!showMultipleAccounts)}
        className="toggle-multiple-button"
        style={{
          marginTop: '10px',
          fontSize: '12px',
          background: '#333',
          color: '#0f0',
          border: '1px solid #0f0',
          padding: '5px 10px',
          cursor: 'pointer',
          borderRadius: '3px',
        }}
      >
        {showMultipleAccounts ? '▼' : '▶'} 複数アカウント合算
      </button>

      {showMultipleAccounts && (
        <div
          className="multiple-accounts-section"
          style={{ marginTop: '10px' }}
        >
          <div style={{ fontSize: '11px', color: '#0f0', marginBottom: '5px' }}>
            企業アカウントなど追加のGitHubアカウントを入力
          </div>
          {additionalUsernames.map((username, index) => (
            <div key={index} style={{ display: 'flex', marginBottom: '5px' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUpdateUsername(index, e.target.value)}
                placeholder={`追加アカウント ${index + 1}`}
                className="username-input"
                style={{ flex: 1, marginRight: '5px' }}
              />
              <button
                onClick={() => handleRemoveUsername(index)}
                className="remove-button"
                style={{
                  background: '#ff0000',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  borderRadius: '3px',
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={handleAddUsername}
            className="add-account-button"
            style={{
              background: '#0f0',
              color: '#000',
              border: 'none',
              padding: '5px 15px',
              cursor: 'pointer',
              borderRadius: '3px',
              fontSize: '12px',
              marginTop: '5px',
            }}
          >
            + アカウントを追加
          </button>
        </div>
      )}

      <div className="token-section">
        <div className="token-title">GITHUB TOKEN SETTINGS</div>
        <div className="token-controls">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="token-input"
          />
          <button onClick={handleSaveToken} className="token-button">
            SAVE
          </button>
          <button onClick={handleClearToken} className="token-button clear">
            CLEAR
          </button>
        </div>
        <div className="token-status">{tokenStatus}</div>
        <div className="token-info">
          <a
            href="https://github.com/settings/tokens/new?scopes=public_repo,read:user,read:org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Generate token →
          </a>
          | Increases API limit from 60 to 5,000 requests/hour
        </div>
      </div>

      <button
        onClick={onShowResume}
        disabled={!hasDetailedData}
        className="detail-button"
        style={{ display: hasDetailedData ? 'block' : 'none' }}
      >
        技術履歴書を表示 / Show Tech Resume
      </button>
    </div>
  );
};

export default UserInput;
