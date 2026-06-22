import { describe, expect, it } from 'vitest';
import { TIER_LABELS } from './labels';

describe('TIER_LABELS', () => {
  it('全階級に日本語ラベルがある', () => {
    expect(TIER_LABELS.S0).toBe('休眠');
    expect(TIER_LABELS.S3).toBe('中級');
    expect(TIER_LABELS.S7).toBe('エキスパート');
  });
});
