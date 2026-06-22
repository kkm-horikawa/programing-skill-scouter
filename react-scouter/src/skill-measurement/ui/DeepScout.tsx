import { useState } from 'react';
import type { BadgeGroup } from '../badges/types';
import { scoutDeep, scoutPublic, type ScoutResult } from '../scout';
import {
  gateChecklist,
  GROUP_LABELS,
  nextRequirement,
  TIER_LABELS,
} from './labels';
import './DeepScout.css';

type Status = 'idle' | 'scanning' | 'done' | 'error';

const TOKEN_SCOPE_URL =
  'https://github.com/settings/tokens/new?scopes=repo&description=Programmer%20Scouter%20deep';

/**
 * 新エンジンの測定パネル。量ではなく設計の規律と作り込みで戦闘力と階級を出す。
 *
 * - ユーザー名を入れると、その人の公開リポジトリを測る（他者比較＝旧スカウターの置換）
 * - 空欄なら自分自身を private 込みで測る（repo スコープのトークンが必要）
 */
export default function DeepScout() {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState(
    () => localStorage.getItem('github_token') ?? ''
  );
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<ScoutResult | null>(null);
  const [error, setError] = useState('');

  const target = username.trim();
  const tokenValue = token.trim();

  const runScan = async () => {
    if (!target && !tokenValue) {
      setError(
        '自分を測るには repo スコープのトークンが必要です（他者ならユーザー名を入力）'
      );
      setStatus('error');
      return;
    }
    setStatus('scanning');
    setError('');
    setResult(null);
    try {
      if (tokenValue) localStorage.setItem('github_token', tokenValue);
      const scan = target
        ? scoutPublic(target, tokenValue || null)
        : scoutDeep(tokenValue);
      setResult(await scan);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : '測定に失敗しました');
      setStatus('error');
    }
  };

  return (
    <div className="ds-root">
      <div className="ds-intro">
        <h3 className="ds-title">新エンジン測定（実力）</h3>
        <p className="ds-desc">
          コミット数や star ではなく、<strong>設計の規律と作り込み</strong>{' '}
          で実力を測ります。
          <br />
          ユーザー名を入れるとその人の<strong>公開リポジトリ</strong>
          を測定（他者比較）。空欄なら自分を <strong>private 込み</strong>
          で測定します。
        </p>
        <a
          className="ds-tokenlink"
          href={TOKEN_SCOPE_URL}
          target="_blank"
          rel="noreferrer"
        >
          repo スコープのトークンを発行 →
        </a>
      </div>

      <div className="ds-controls">
        <input
          className="ds-token"
          type="text"
          placeholder="ユーザー名（空欄なら自分・private込み）"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="ds-token"
          type="password"
          placeholder="トークン（自分は必須／他者は任意）"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button
          className="ds-scan"
          onClick={runScan}
          disabled={status === 'scanning'}
        >
          {status === 'scanning' ? '測定中…' : '測定する'}
        </button>
      </div>

      {status === 'error' && <p className="ds-error">{error}</p>}
      {status === 'done' && result && <DeepScoutResult result={result} />}
    </div>
  );
}

function DeepScoutResult({ result }: { result: ScoutResult }) {
  const { score, spine, badges } = result;
  const rows = gateChecklist(spine);
  const next = nextRequirement(spine);
  const groups = Object.entries(badges.byGroup) as Array<
    [BadgeGroup, { earned: number; total: number }]
  >;

  return (
    <div className="ds-result">
      <div className="ds-power">
        <div className="ds-power-label">戦闘力</div>
        <div className="ds-power-value">{score.power.toLocaleString()}</div>
        <div className="ds-tier">
          階級 <strong>{TIER_LABELS[spine.tier]}</strong>
          <span className="ds-tier-code">{spine.tier}</span>
        </div>
        <div className="ds-axes">
          規律 craft <strong>{spine.craftTier}</strong> ／ 採用 reach{' '}
          <strong>{spine.reachTier}</strong>（高い方を採用）
        </div>
      </div>

      {spine.reachTier > spine.craftTier && (
        <div className="ds-note">
          外部からの採用（star/follower/fork）が {spine.reachTier}{' '}
          に到達。ツール痕跡が無くても世界が使う成果は実力として評価します。
        </div>
      )}
      {spine.cappedBy && (
        <div className="ds-cap">⚠ 降格キャップ: {spine.cappedBy}</div>
      )}

      <div className="ds-section">
        <h4>ゲート（階級＝桁を決める。量では上がらない）</h4>
        <ul className="ds-gates">
          {rows.map((r) => (
            <li key={r.tier} className={r.cleared ? 'ds-on' : 'ds-off'}>
              <span className="ds-mark">{r.cleared ? '✅' : '⬜'}</span>
              <span className="ds-glabel">
                {r.label}
                <span className="ds-gcode">{r.tier}</span>
              </span>
              <span className="ds-greq">{r.requirement}</span>
            </li>
          ))}
        </ul>
        {next && <p className="ds-next">次の階級へ：{next}</p>}
      </div>

      <div className="ds-section">
        <h4>バッジ（{badges.earned.size} 獲得・帯内ランクに反映）</h4>
        <ul className="ds-badges">
          {groups.map(([group, tally]) => (
            <li key={group}>
              <span className="ds-blabel">{GROUP_LABELS[group]}</span>
              <span className="ds-bbar">
                <span
                  className="ds-bfill"
                  style={{
                    width: `${tally.total ? (tally.earned / tally.total) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className="ds-bnum">
                {tally.earned}/{tally.total}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
