import { describe, expect, it } from 'vitest';
import { demoProjection, projectionSeries } from './climate-demo';

describe('illustrative projections', () => {
  it('keeps the baseline at 1.1 in 2020', () => expect(demoProjection('SSP2-4.5', 2020)).toBe(1.1));
  it('returns the scenario example at the end of the century', () => expect(demoProjection('SSP2-4.5', 2100)).toBe(2.7));
  it('limits plotted years to the selected horizon', () => expect(projectionSeries(2050).map(row => row.year)).toEqual([2020, 2030, 2040, 2050]));
});