import type { SpineTier } from '../gates';

/** 階級の日本語ラベル。スカウター画像（SVG）の RANK 表示に使う。 */
export const TIER_LABELS: Record<SpineTier, string> = {
  S0: '休眠',
  S1: '初級',
  S2: '中級見習い',
  S3: '中級',
  S4: '上級見習い',
  S5: '上級',
  S6: '上級+',
  S7: 'エキスパート',
};
