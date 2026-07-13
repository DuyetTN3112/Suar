export const SEARCH_RRF_RANK_CONSTANT = 60

export interface WeightedRankSignal {
  rank: number
  weight: number
}

/**
 * Combines independent ranked lists without comparing provider-specific raw scores.
 *
 * Weighted RRF score = Σ weight / (rankConstant + rank)
 */
export function weightedReciprocalRankFusion(
  signals: readonly WeightedRankSignal[],
  rankConstant: number = SEARCH_RRF_RANK_CONSTANT
): number {
  if (!Number.isSafeInteger(rankConstant) || rankConstant < 1) {
    throw new RangeError('RRF rank constant must be a positive safe integer')
  }
  if (signals.length === 0) {
    throw new RangeError('RRF requires at least one ranked signal')
  }

  return signals.reduce((score, signal) => {
    if (!Number.isSafeInteger(signal.rank) || signal.rank < 1) {
      throw new RangeError('RRF signal rank must be a positive safe integer')
    }
    if (!Number.isFinite(signal.weight) || signal.weight <= 0) {
      throw new RangeError('RRF signal weight must be a finite positive number')
    }
    return score + signal.weight / (rankConstant + signal.rank)
  }, 0)
}
