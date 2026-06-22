import { useState } from 'react';
import type { BadgeGroup } from '../badges/types';
import { scoutDeep, type ScoutResult } from '../scout';
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
 * deep 自己診断パネル。本人のトークンで private 含む代表作を測り、
 * 量ではなく規律・作り込みで戦闘力と階級を出す。公開スカウトとは別モード。
 */
export default function DeepScout() {
  const [token, setToken] = useState(
    () => localStorage.getItem('github_token') ?? ''
  );
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<ScoutResult | null>(null);
  const [error, setError] = useState('');

  const runScan = async () => {
    const value = token.trim();
    if (!value) {
      setError('repo スコープのトークンが必要です');
      setStatus('error');
      return;
    }
    setStatus('scanning');
    setError('');
    setResult(null);
    try {
      localStorage.setItem('github_token', value);
      setResult(await scoutDeep(value));
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : '測定に失敗しました');
      setStatus('error');
    }
  };

  return (
    <div className="ds-root">
      <div className="ds-intro">
        <h3 className="ds-title">deep 自己診断</h3>
        <p className="ds-desc">
          あなたの <strong>private を含む代表作</strong>{' '}
          を読み、コミット数ではなく設計の規律と作り込みで実力を測ります。
          本人のトークンが要るので、測れるのは自分自身だけです。
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
          type="password"
          placeholder="ghp_... または github_pat_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button
          className="ds-scan"
          onClick={runScan}
          disabled={status === 'scanning'}
        >
          {status === 'scanning' ? '測定中…' : '自己診断する'}
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
      </div>

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
