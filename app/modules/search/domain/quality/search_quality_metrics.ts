export interface SearchRelevanceJudgment {
  documentId: string
  relevance: number
}

export interface SearchRankingEvaluationCase {
  id: string
  returnedDocumentIds: readonly string[]
  judgments: readonly SearchRelevanceJudgment[]
}

export interface SearchRankingCaseMetrics {
  id: string
  precisionAtK: number
  recallAtK: number
  reciprocalRankAtK: number
  ndcgAtK: number
  relevantDocumentCount: number
  relevantHitCount: number
}

export interface SearchRankingEvaluation {
  k: number
  caseCount: number
  meanPrecisionAtK: number
  meanRecallAtK: number
  meanReciprocalRankAtK: number
  meanNdcgAtK: number
  cases: SearchRankingCaseMetrics[]
}

export interface SearchLatencySummary {
  sampleCount: number
  minimumMs: number
  maximumMs: number
  meanMs: number
  p50Ms: number
  p95Ms: number
  p99Ms: number
}

interface SearchRankingEvaluationOptions {
  k: number
  relevantRatingThreshold?: number
}

export function evaluateSearchRanking(
  evaluationCases: readonly SearchRankingEvaluationCase[],
  options: SearchRankingEvaluationOptions
): SearchRankingEvaluation {
  const k = requirePositiveInteger('Search ranking cutoff', options.k)
  const relevantRatingThreshold = options.relevantRatingThreshold ?? 1
  if (!Number.isFinite(relevantRatingThreshold) || relevantRatingThreshold < 0) {
    throw new RangeError('Relevant rating threshold must be a finite non-negative number')
  }

  const cases = evaluationCases.map((evaluationCase) =>
    evaluateSearchRankingCase(evaluationCase, k, relevantRatingThreshold)
  )

  return {
    k,
    caseCount: cases.length,
    meanPrecisionAtK: mean(cases.map((item) => item.precisionAtK)),
    meanRecallAtK: mean(cases.map((item) => item.recallAtK)),
    meanReciprocalRankAtK: mean(cases.map((item) => item.reciprocalRankAtK)),
    meanNdcgAtK: mean(cases.map((item) => item.ndcgAtK)),
    cases,
  }
}

export function summarizeSearchLatencies(samplesMs: readonly number[]): SearchLatencySummary {
  if (samplesMs.length === 0) {
    throw new RangeError('Search latency summary requires at least one sample')
  }

  const sortedSamples = samplesMs.map(validateLatencySample).sort((left, right) => left - right)
  const minimumMs = sortedSamples[0]
  const maximumMs = sortedSamples[sortedSamples.length - 1]
  if (minimumMs === undefined || maximumMs === undefined) {
    throw new RangeError('Search latency summary requires at least one sample')
  }

  return {
    sampleCount: sortedSamples.length,
    minimumMs,
    maximumMs,
    meanMs: mean(sortedSamples),
    p50Ms: nearestRankPercentile(sortedSamples, 0.5),
    p95Ms: nearestRankPercentile(sortedSamples, 0.95),
    p99Ms: nearestRankPercentile(sortedSamples, 0.99),
  }
}

function evaluateSearchRankingCase(
  evaluationCase: SearchRankingEvaluationCase,
  k: number,
  relevantRatingThreshold: number
): SearchRankingCaseMetrics {
  const ratings = new Map<string, number>()
  for (const judgment of evaluationCase.judgments) {
    if (!judgment.documentId || !Number.isFinite(judgment.relevance) || judgment.relevance < 0) {
      throw new RangeError(`Search ranking case "${evaluationCase.id}" has an invalid judgment`)
    }
    ratings.set(judgment.documentId, judgment.relevance)
  }

  const relevantDocumentCount = [...ratings.values()].filter(
    (rating) => rating >= relevantRatingThreshold
  ).length
  const topDocumentIds = evaluationCase.returnedDocumentIds.slice(0, k)
  const relevantRanks: number[] = []
  const rankedRatings: number[] = []

  for (const [index, documentId] of topDocumentIds.entries()) {
    const rating = ratings.get(documentId) ?? 0
    rankedRatings.push(rating)
    if (rating >= relevantRatingThreshold) {
      relevantRanks.push(index + 1)
    }
  }

  const idealRatings = [...ratings.values()].sort((left, right) => right - left).slice(0, k)
  const idealDcg = discountedCumulativeGain(idealRatings)

  return {
    id: evaluationCase.id,
    precisionAtK: relevantRanks.length / k,
    recallAtK: relevantDocumentCount === 0 ? 0 : relevantRanks.length / relevantDocumentCount,
    reciprocalRankAtK: relevantRanks[0] ? 1 / relevantRanks[0] : 0,
    ndcgAtK: idealDcg === 0 ? 0 : discountedCumulativeGain(rankedRatings) / idealDcg,
    relevantDocumentCount,
    relevantHitCount: relevantRanks.length,
  }
}

function discountedCumulativeGain(ratings: readonly number[]): number {
  return ratings.reduce((total, rating, index) => {
    const gain = 2 ** rating - 1
    return total + gain / Math.log2(index + 2)
  }, 0)
}

function nearestRankPercentile(sortedSamples: readonly number[], percentile: number): number {
  const rank = Math.max(1, Math.ceil(percentile * sortedSamples.length))
  const sample = sortedSamples[rank - 1]
  if (sample === undefined) {
    throw new RangeError('Search latency percentile requires at least one sample')
  }
  return sample
}

function validateLatencySample(sample: number): number {
  if (!Number.isFinite(sample) || sample < 0) {
    throw new RangeError('Search latency samples must be finite non-negative numbers')
  }
  return sample
}

function requirePositiveInteger(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive safe integer`)
  }
  return value
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0
  }
  return values.reduce((total, value) => total + value, 0) / values.length
}
