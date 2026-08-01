import { test } from '@japa/runner'

import {
  evaluateSearchRanking,
  summarizeSearchLatencies,
} from '#modules/search/domain/search_quality_metrics'

test.group('Search quality metrics', () => {
  test('calculates MRR, precision, recall, and graded nDCG at a fixed cutoff', ({ assert }) => {
    const evaluation = evaluateSearchRanking(
      [
        {
          id: 'exact-navigation',
          returnedDocumentIds: ['irrelevant', 'relevant-secondary', 'relevant-best'],
          judgments: [
            { documentId: 'relevant-best', relevance: 3 },
            { documentId: 'relevant-secondary', relevance: 1 },
          ],
        },
      ],
      { k: 3 }
    )

    assert.equal(evaluation.caseCount, 1)
    assert.approximately(evaluation.meanPrecisionAtK, 2 / 3, 0.000_001)
    assert.equal(evaluation.meanRecallAtK, 1)
    assert.equal(evaluation.meanReciprocalRankAtK, 0.5)
    assert.approximately(evaluation.meanNdcgAtK, 0.541_34, 0.000_01)
  })

  test('treats missing judgments as irrelevant and reports a zero-hit query', ({ assert }) => {
    const evaluation = evaluateSearchRanking(
      [
        {
          id: 'zero-hit',
          returnedDocumentIds: ['unjudged'],
          judgments: [{ documentId: 'expected', relevance: 3 }],
        },
      ],
      { k: 5 }
    )

    assert.equal(evaluation.meanPrecisionAtK, 0)
    assert.equal(evaluation.meanRecallAtK, 0)
    assert.equal(evaluation.meanReciprocalRankAtK, 0)
    assert.equal(evaluation.meanNdcgAtK, 0)
  })

  test('uses nearest-rank p50, p95, and p99 latency percentiles', ({ assert }) => {
    const summary = summarizeSearchLatencies([10, 1, 3, 2, 4, 5, 6, 7, 8, 9])

    assert.equal(summary.sampleCount, 10)
    assert.equal(summary.minimumMs, 1)
    assert.equal(summary.maximumMs, 10)
    assert.equal(summary.meanMs, 5.5)
    assert.equal(summary.p50Ms, 5)
    assert.equal(summary.p95Ms, 10)
    assert.equal(summary.p99Ms, 10)
  })

  test('rejects invalid cutoffs, ratings, and latency samples', ({ assert }) => {
    assert.throws(
      () => evaluateSearchRanking([], { k: 0 }),
      'Search ranking cutoff must be a positive safe integer'
    )
    assert.throws(
      () =>
        evaluateSearchRanking(
          [
            {
              id: 'invalid',
              returnedDocumentIds: [],
              judgments: [{ documentId: 'doc', relevance: -1 }],
            },
          ],
          { k: 5 }
        ),
      'Search ranking case "invalid" has an invalid judgment'
    )
    assert.throws(
      () => summarizeSearchLatencies([Number.NaN]),
      'Search latency samples must be finite non-negative numbers'
    )
  })
})
