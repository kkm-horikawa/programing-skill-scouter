import { useState, useEffect } from 'react';
import type { GitHubRateLimit } from '../types/github';

interface UserInputProps {
  onScan: (username: string) => void;
  isScanning: boolean;
  onShowResume: () => void;
  hasDetailedData: boolean;
}

const UserInput: React.FC<UserInputProps> = ({
  onScan,
  isScanning,
  onShowResume,
  hasDetailedData
}) => {
  const [username, setUsername] = useState('torvalds');
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
    return githubToken ? { 'Authorization': `token ${githubToken}` } : {};
  };

  const checkRateLimit = async (githubToken: string) => {
    try {
      const headers = getHeaders(githubToken);
      const response = await fetch('https://api.github.com/rate_limit', { headers });
      const data: GitHubRateLimit = await response.json();
      setRateLimit(data);
      
      const remaining = data.rate.remaining;
      const limit = data.rate.limit;
      const reset = new Date(data.rate.reset * 1000);
      
      if (githubToken) {
        setTokenStatus(`認証済み: ${remaining}/${limit} 回 (${reset.toLocaleTimeString()}にリセット)`);
      } else {
        setTokenStatus(`未認証: ${remaining}/${limit} 回 (${reset.toLocaleTimeString()}にリセット)`);
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
    
    if (!tokenValue.startsWith('ghp_') && !tokenValue.startsWith('github_pat_')) {
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

  const handleScan = () => {
    if (username.trim()) {
      onScan(username.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isScanning) {
      handleScan();
    }
  };

  return (
    <div className="input-container">
      <h2 className="title">GitHub Power Scouter</h2>
      
      <div className="scan-section">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="GitHub Username"
          className="username-input"
        />
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="scan-button"
        >
          {isScanning ? 'SCANNING...' : 'SCAN'}
        </button>
      </div>

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
            href="https://github.com/settings/tokens/new?scopes=public_repo,read:user"
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