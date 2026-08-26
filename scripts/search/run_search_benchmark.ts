import { performance } from 'node:perf_hooks'

import {
  BENCHMARK_ORGANIZATION_ID,
  buildOrganizationBenchmarkCorpus,
  buildProjectBenchmarkCorpus,
  buildSkillBenchmarkCorpus,
  buildTalentBenchmarkCorpus,
  buildTaskBenchmarkCorpus,
  buildUserDirectoryBenchmarkCorpus,
  type SearchBenchmarkCorpus,
  type SearchBenchmarkQueryCase,
} from './search_benchmark_corpus.js'

import {
  evaluateSearchRanking,
  summarizeSearchLatencies,
  type SearchLatencySummary,
  type SearchRankingEvaluation,
  type SearchRankingEvaluationCase,
} from '#modules/search/domain/quality/search_quality_metrics'

interface SearchBenchmarkTarget {
  name: string
  indexName: string
  documentCount: number
  queryCases: SearchBenchmarkQueryCase[]
  resetIndex: () => Promise<void>
  seedIndex: () => Promise<void>
  search: (query: string, limit: number) => Promise<string[]>
}

interface SearchBenchmarkConfiguration {
  noiseDocumentsPerIndex: number
  warmupIterations: number
  measuredIterations: number
  concurrentWorkers: number
  resultCutoff: number
}

interface MeasuredRankingCase extends SearchRankingEvaluationCase {
  target: string
  query: string
}

interface SearchLatencyScenarioReport {
  concurrency: number
  overall: SearchLatencySummary
  byTarget: Record<string, SearchLatencySummary>
}

interface SearchBenchmarkAcceptance {
  ranking: {
    minimumMeanReciprocalRankAtK: number
    minimumMeanRecallAtK: number
    minimumMeanNdcgAtK: number
    passed: boolean
  }
  latency: {
    maximumSerialP95Ms: number
    maximumConcurrentP95Ms: number
    serialPassed: boolean
    concurrentPassed: boolean
  }
  passed: boolean
  enforced: boolean
}

process.env['NODE_ENV'] = 'test'
process.env['LOG_LEVEL'] = 'silent'

try {
  await runSearchBenchmark()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[search-benchmark] ${message}`)
  process.exitCode = 1
}

async function runSearchBenchmark(): Promise<void> {
  const configuration = readConfiguration()
  const guard = await import('../../tests/helpers/test_datastore_guard.js')
  guard.applyTestDatastoreOverrides()
  await guard.assertSafeTestDatastores()
  assertDedicatedBenchmarkNamespace()

  const [{ searchClient }, targets] = await Promise.all([
    import('#platform/search/elasticsearch_client'),
    buildBenchmarkTargets(configuration.noiseDocumentsPerIndex),
  ])

  try {
    for (const target of targets) {
      await prepareTarget(target, searchClient)
    }

    await warmSearchTargets(targets, configuration)
    const rankingCases = await evaluateTargets(targets, configuration.resultCutoff)
    const quality = buildQualityReport(rankingCases, configuration.resultCutoff)
    const serialLatency = await measureLatencyScenario(targets, configuration, 1)
    const concurrentLatency =
      configuration.concurrentWorkers === 1
        ? serialLatency
        : await measureLatencyScenario(targets, configuration, configuration.concurrentWorkers)
    const acceptance = buildAcceptance(quality.overall, serialLatency, concurrentLatency)
    const [clusterInfo, clusterHealth] = await Promise.all([
      searchClient.info(),
      searchClient.cluster.health(),
    ])

    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      benchmarkKind: 'synthetic-local-search-baseline',
      environment: {
        nodeVersion: process.version,
        elasticsearchVersion: clusterInfo.version.number,
        clusterName: clusterHealth.cluster_name,
        clusterStatus: clusterHealth.status,
        elasticsearchNode: process.env['ELASTICSEARCH_NODE'],
        indexPrefix: process.env['ELASTICSEARCH_INDEX_PREFIX'],
      },
      methodology: {
        queryImplementation: 'production SearchIndexRepository.search methods',
        relevanceMetrics: ['precision@k', 'recall@k', 'MRR@k', 'nDCG@k'],
        latencyMeasurement: 'application wall clock around repository search',
        latencyPercentileMethod: 'nearest-rank',
        fixtureLimitation:
          'Synthetic corpus on a single local Elasticsearch node; not production traffic or a capacity claim.',
        configuration,
      },
      corpus: {
        targetCount: targets.length,
        documentCount: targets.reduce((total, target) => total + target.documentCount, 0),
        queryCaseCount: rankingCases.length,
        byTarget: Object.fromEntries(
          targets.map((target) => [
            target.name,
            {
              index: target.indexName,
              documentCount: target.documentCount,
              queryCaseCount: target.queryCases.length,
            },
          ])
        ),
      },
      quality: {
        overall: roundRankingEvaluation(quality.overall),
        byTarget: Object.fromEntries(
          Object.entries(quality.byTarget).map(([target, evaluation]) => [
            target,
            roundRankingEvaluation(evaluation),
          ])
        ),
        observedRankings: rankingCases.map((item) => ({
          id: item.id,
          target: item.target,
          query: item.query,
          returnedDocumentIds: item.returnedDocumentIds,
          judgments: item.judgments,
        })),
      },
      latency: {
        serial: roundLatencyScenario(serialLatency),
        concurrent: roundLatencyScenario(concurrentLatency),
      },
      acceptance,
    }

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)

    if (acceptance.enforced && !acceptance.passed) {
      throw new Error('Search benchmark did not meet the enforced quality or latency thresholds')
    }
  } finally {
    await searchClient.close()
  }
}

async function buildBenchmarkTargets(noiseDocumentCount: number): Promise<SearchBenchmarkTarget[]> {
  const [
    { OrganizationSearchIndexRepository },
    { ProjectSearchIndexRepository },
    { SkillSearchIndexRepository },
    { TalentSearchIndexRepository },
    { TaskSearchIndexRepository },
    { UserDirectorySearchIndexRepository },
  ] = await Promise.all([
    import('#modules/search/infra/repositories/entity-search/organizations/organization_search_index_repository'),
    import('#modules/search/infra/repositories/entity-search/projects/project_search_index_repository'),
    import('#modules/search/infra/repositories/entity-search/skills/skill_search_index_repository'),
    import('#modules/search/infra/repositories/entity-search/talents/talent_search_index_repository'),
    import('#modules/search/infra/repositories/entity-search/tasks/task_search_index_repository'),
    import('#modules/search/infra/repositories/entity-search/users/user_directory_search_index_repository'),
  ])

  const organizations = new OrganizationSearchIndexRepository()
  const projects = new ProjectSearchIndexRepository()
  const skills = new SkillSearchIndexRepository()
  const talents = new TalentSearchIndexRepository()
  const tasks = new TaskSearchIndexRepository()
  const users = new UserDirectorySearchIndexRepository()

  return [
    benchmarkTarget(
      'organizations',
      organizations,
      buildOrganizationBenchmarkCorpus(noiseDocumentCount),
      (hit) => hit.organizationId
    ),
    benchmarkTarget(
      'projects',
      projects,
      buildProjectBenchmarkCorpus(noiseDocumentCount),
      (hit) => hit.projectId
    ),
    benchmarkTarget(
      'skills',
      skills,
      buildSkillBenchmarkCorpus(noiseDocumentCount),
      (hit) => hit.skillId
    ),
    benchmarkTarget(
      'talents',
      talents,
      buildTalentBenchmarkCorpus(noiseDocumentCount),
      (hit) => hit.userId
    ),
    benchmarkTarget(
      'tasks',
      {
        ...tasks,
        indexName: tasks.indexName,
        resetIndex: () => tasks.resetIndex(),
        bulkUpsertDocuments: (documents) => tasks.bulkUpsertDocuments(documents),
        search: (input: { q: string; limit: number }) =>
          tasks.search({
            ...input,
            publicOnly: true,
            organizationId: BENCHMARK_ORGANIZATION_ID,
          }),
      },
      buildTaskBenchmarkCorpus(noiseDocumentCount),
      (hit) => hit.taskId
    ),
    benchmarkTarget(
      'users',
      users,
      buildUserDirectoryBenchmarkCorpus(noiseDocumentCount),
      (hit) => hit.userId
    ),
  ]
}

function benchmarkTarget<Document, Hit>(
  name: string,
  repository: {
    indexName: string
    resetIndex: () => Promise<void>
    bulkUpsertDocuments: (documents: Document[]) => Promise<void>
    search: (input: { q: string; limit: number }) => Promise<Hit[]>
  },
  corpus: SearchBenchmarkCorpus<Document>,
  readHitId: (hit: Hit) => string
): SearchBenchmarkTarget {
  return {
    name,
    indexName: repository.indexName,
    documentCount: corpus.documents.length,
    queryCases: corpus.queryCases,
    resetIndex: () => repository.resetIndex(),
    seedIndex: () => repository.bulkUpsertDocuments(corpus.documents),
    search: async (query, limit) => {
      const hits = await repository.search({ q: query, limit })
      return hits.map(readHitId)
    },
  }
}

async function prepareTarget(
  target: SearchBenchmarkTarget,
  searchClient: Awaited<typeof import('#platform/search/elasticsearch_client')>['searchClient']
): Promise<void> {
  await target.resetIndex()
  await target.seedIndex()
  await searchClient.indices.putSettings({
    index: target.indexName,
    settings: {
      number_of_replicas: 0,
    },
  })
  await searchClient.indices.refresh({ index: target.indexName })
  const count = await searchClient.count({ index: target.indexName })
  if (count.count !== target.documentCount) {
    throw new Error(
      `${target.name} benchmark index expected ${target.documentCount} documents but contains ${count.count}`
    )
  }
}

async function warmSearchTargets(
  targets: SearchBenchmarkTarget[],
  configuration: SearchBenchmarkConfiguration
): Promise<void> {
  for (let iteration = 0; iteration < configuration.warmupIterations; iteration += 1) {
    for (const target of targets) {
      for (const queryCase of target.queryCases) {
        await target.search(queryCase.query, configuration.resultCutoff)
      }
    }
  }
}

async function evaluateTargets(
  targets: SearchBenchmarkTarget[],
  resultCutoff: number
): Promise<MeasuredRankingCase[]> {
  const evaluationCases: MeasuredRankingCase[] = []
  for (const target of targets) {
    for (const queryCase of target.queryCases) {
      evaluationCases.push({
        id: `${target.name}:${queryCase.id}`,
        target: target.name,
        query: queryCase.query,
        returnedDocumentIds: await target.search(queryCase.query, resultCutoff),
        judgments: queryCase.judgments,
      })
    }
  }
  return evaluationCases
}

function buildQualityReport(
  rankingCases: MeasuredRankingCase[],
  resultCutoff: number
): {
  overall: SearchRankingEvaluation
  byTarget: Record<string, SearchRankingEvaluation>
} {
  const targetNames = [...new Set(rankingCases.map((item) => item.target))]
  return {
    overall: evaluateSearchRanking(rankingCases, { k: resultCutoff }),
    byTarget: Object.fromEntries(
      targetNames.map((target) => [
        target,
        evaluateSearchRanking(
          rankingCases.filter((item) => item.target === target),
          { k: resultCutoff }
        ),
      ])
    ),
  }
}

async function measureLatencyScenario(
  targets: SearchBenchmarkTarget[],
  configuration: SearchBenchmarkConfiguration,
  concurrency: number
): Promise<SearchLatencyScenarioReport> {
  const jobs = targets.flatMap((target) =>
    target.queryCases.flatMap((queryCase) =>
      Array.from({ length: configuration.measuredIterations }, () => ({
        target,
        query: queryCase.query,
      }))
    )
  )
  const samplesByTarget = new Map(targets.map((target) => [target.name, [] as number[]]))
  const allSamples: number[] = []

  await runWorkerPool(jobs, concurrency, async ({ target, query }) => {
    const startedAt = performance.now()
    await target.search(query, configuration.resultCutoff)
    const durationMs = performance.now() - startedAt
    allSamples.push(durationMs)
    const targetSamples = samplesByTarget.get(target.name)
    if (!targetSamples) {
      throw new Error(`Missing latency sample collection for ${target.name}`)
    }
    targetSamples.push(durationMs)
  })

  return {
    concurrency,
    overall: summarizeSearchLatencies(allSamples),
    byTarget: Object.fromEntries(
      [...samplesByTarget.entries()].map(([target, samples]) => [
        target,
        summarizeSearchLatencies(samples),
      ])
    ),
  }
}

async function runWorkerPool<Job>(
  jobs: readonly Job[],
  concurrency: number,
  runJob: (job: Job) => Promise<void>
): Promise<void> {
  let nextJobIndex = 0
  const workers = Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
    while (nextJobIndex < jobs.length) {
      const job = jobs[nextJobIndex]
      nextJobIndex += 1
      if (job) {
        await runJob(job)
      }
    }
  })
  await Promise.all(workers)
}

function buildAcceptance(
  quality: SearchRankingEvaluation,
  serialLatency: SearchLatencyScenarioReport,
  concurrentLatency: SearchLatencyScenarioReport
): SearchBenchmarkAcceptance {
  const minimumMeanReciprocalRankAtK = readNumber('SEARCH_BENCHMARK_MIN_MRR', 0.85, 0, 1)
  const minimumMeanRecallAtK = readNumber('SEARCH_BENCHMARK_MIN_RECALL', 0.9, 0, 1)
  const minimumMeanNdcgAtK = readNumber('SEARCH_BENCHMARK_MIN_NDCG', 0.8, 0, 1)
  const maximumSerialP95Ms = readNumber('SEARCH_BENCHMARK_MAX_SERIAL_P95_MS', 100, 1, 60_000)
  const maximumConcurrentP95Ms = readNumber(
    'SEARCH_BENCHMARK_MAX_CONCURRENT_P95_MS',
    250,
    1,
    60_000
  )
  const rankingPassed =
    quality.meanReciprocalRankAtK >= minimumMeanReciprocalRankAtK &&
    quality.meanRecallAtK >= minimumMeanRecallAtK &&
    quality.meanNdcgAtK >= minimumMeanNdcgAtK
  const serialPassed = serialLatency.overall.p95Ms <= maximumSerialP95Ms
  const concurrentPassed = concurrentLatency.overall.p95Ms <= maximumConcurrentP95Ms

  return {
    ranking: {
      minimumMeanReciprocalRankAtK,
      minimumMeanRecallAtK,
      minimumMeanNdcgAtK,
      passed: rankingPassed,
    },
    latency: {
      maximumSerialP95Ms,
      maximumConcurrentP95Ms,
      serialPassed,
      concurrentPassed,
    },
    passed: rankingPassed && serialPassed && concurrentPassed,
    enforced: process.env['SEARCH_BENCHMARK_ENFORCE'] === 'true',
  }
}

function readConfiguration(): SearchBenchmarkConfiguration {
  return {
    noiseDocumentsPerIndex: readInteger('SEARCH_BENCHMARK_NOISE_DOCUMENTS', 500, 0, 10_000),
    warmupIterations: readInteger('SEARCH_BENCHMARK_WARMUP_ITERATIONS', 5, 0, 100),
    measuredIterations: readInteger('SEARCH_BENCHMARK_ITERATIONS', 20, 1, 1_000),
    concurrentWorkers: readInteger('SEARCH_BENCHMARK_CONCURRENCY', 8, 1, 64),
    resultCutoff: readInteger('SEARCH_BENCHMARK_RESULT_CUTOFF', 5, 1, 100),
  }
}

function assertDedicatedBenchmarkNamespace(): void {
  const prefix = process.env['ELASTICSEARCH_INDEX_PREFIX'] ?? ''
  if (!/(^|[-_])test($|[-_])/i.test(prefix) || !/(^|[-_])benchmark($|[-_])/i.test(prefix)) {
    throw new Error(
      'ELASTICSEARCH_TEST_INDEX_PREFIX must contain separate "test" and "benchmark" ownership tokens'
    )
  }
}

function readInteger(name: string, fallback: number, minimum: number, maximum: number): number {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name])
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`)
  }
  return value
}

function readNumber(name: string, fallback: number, minimum: number, maximum: number): number {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name])
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be a number between ${minimum} and ${maximum}`)
  }
  return value
}

function roundRankingEvaluation(evaluation: SearchRankingEvaluation): SearchRankingEvaluation {
  return {
    ...evaluation,
    meanPrecisionAtK: round(evaluation.meanPrecisionAtK),
    meanRecallAtK: round(evaluation.meanRecallAtK),
    meanReciprocalRankAtK: round(evaluation.meanReciprocalRankAtK),
    meanNdcgAtK: round(evaluation.meanNdcgAtK),
    cases: evaluation.cases.map((item) => ({
      ...item,
      precisionAtK: round(item.precisionAtK),
      recallAtK: round(item.recallAtK),
      reciprocalRankAtK: round(item.reciprocalRankAtK),
      ndcgAtK: round(item.ndcgAtK),
    })),
  }
}

function roundLatencyScenario(scenario: SearchLatencyScenarioReport): SearchLatencyScenarioReport {
  return {
    concurrency: scenario.concurrency,
    overall: roundLatencySummary(scenario.overall),
    byTarget: Object.fromEntries(
      Object.entries(scenario.byTarget).map(([target, summary]) => [
        target,
        roundLatencySummary(summary),
      ])
    ),
  }
}

function roundLatencySummary(summary: SearchLatencySummary): SearchLatencySummary {
  return {
    sampleCount: summary.sampleCount,
    minimumMs: round(summary.minimumMs),
    maximumMs: round(summary.maximumMs),
    meanMs: round(summary.meanMs),
    p50Ms: round(summary.p50Ms),
    p95Ms: round(summary.p95Ms),
    p99Ms: round(summary.p99Ms),
  }
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}
