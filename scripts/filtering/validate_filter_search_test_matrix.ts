import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

export type FilterSearchTestMatrixApplicability = 'required' | 'deferred'

export interface FilterSearchLayerApplicabilityOverride {
  layer: string
  reason: string
  evidenceOwner: string
  qaApprover: string
  date: string
  releaseId: string
}

export interface FilterSearchTestMatrixCase {
  id: string
  applicability: FilterSearchTestMatrixApplicability
  owner: string
  evidenceOwner: string
  closureRecordId: string
  layerApplicabilityOverrides?: FilterSearchLayerApplicabilityOverride[]
  requiredLayers: string[]
  testReferences: string[]
  rolePlayReferences: string[]
  screenshotReferences: string[]
  reason?: string
}

export interface FilterSearchTestMatrixArtifact {
  id: string
  kind: 'test' | 'role_play' | 'screenshot'
  caseIds: string[]
  path: string
  evidenceOwner: string
  sha256?: string
  aclPolicyId?: string
  retentionPolicyId?: string
  scenarioId?: string
  journeyId?: string
  checkpointId?: string
  detailedCaseIds?: string[]
  releaseClass?: string
  releaseManifestId: string
  applicabilityRecordId?: string
  requiredLayers?: string[]
  observedLayers?: string[]
  negativePathIds?: string[]
  actor?: string
  organizationIdAlias?: string
  route?: string
  contextId?: string
  viewport?: string
  deviceScaleFactor?: number
  browser?: string
  browserVersion?: string
  operatingSystem?: string
  locale?: string
  colorScheme?: string
  fontManifestHash?: string
  dataClassification?: string
  seedId?: string
  expectedObservation?: string
  semanticAssertions?: string[]
  screenshotPath?: string
  screenshotSha256?: string
  visualEvidenceMode?: 'baseline_regression' | 'evidence_only'
  baselinePath?: string | null
  baselineSha256?: string | null
  baselineApprovalId?: string | null
  baselineNotApplicableReason?: string | null
  backendEvidenceRefs?: string[]
  auditEvidenceRefs?: string[]
  testFile?: string
  commit?: string
  runId?: string
  timestamp?: string
  closureAuthority?: string
  reviewerSignOffRefs?: string[]
  /** Execution metadata for test and role-play artifacts. */
  command?: string
  environment?: string
  sampleOrSeed?: string
  result?: 'passed' | 'failed' | 'skipped'
}

export interface FilterSearchTestMatrixManifest {
  version: 1
  releaseId: string
  approver: string
  closureAuthority: string
  matrixCaseIds: string[]
  cases: FilterSearchTestMatrixCase[]
  artifacts: FilterSearchTestMatrixArtifact[]
}

export type FilterSearchTestMatrixIssueCode =
  | 'manifest_invalid'
  | 'case_owner_missing'
  | 'case_evidence_owner_missing'
  | 'case_closure_record_missing'
  | 'layer_override_invalid'
  | 'case_layers_missing'
  | 'case_tests_missing'
  | 'case_role_play_missing'
  | 'case_screenshots_missing'
  | 'reference_missing'
  | 'matrix_case_missing'
  | 'case_id_orphan'
  | 'case_id_duplicate'
  | 'deferred_reason_missing'
  | 'artifact_orphan'
  | 'artifact_unjoined'
  | 'artifact_owner_missing'
  | 'artifact_metadata_missing'
  | 'artifact_metadata_invalid'
  | 'artifact_contract_mismatch'
  | 'reference_not_file'
  | 'artifact_kind_mismatch'
  | 'artifact_id_duplicate'
  | 'artifact_result_invalid'
  | 'artifact_layer_mismatch'
  | 'artifact_identity_invalid'

export interface FilterSearchTestMatrixIssue {
  code: FilterSearchTestMatrixIssueCode
  message: string
  caseId?: string
  reference?: string
}

export interface FilterSearchTestMatrixValidationReport {
  valid: boolean
  issues: FilterSearchTestMatrixIssue[]
}

type ManifestInput = FilterSearchTestMatrixManifest | string

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const stringArray = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => typeof item === 'string' && item.trim().length > 0)

const exactLayerSetMatch = (expected: string[], actual: unknown): boolean => {
  if (!stringArray(actual) || actual.length !== expected.length) return false

  const expectedSet = new Set(expected)
  const actualSet = new Set(actual)
  return (
    expectedSet.size === actualSet.size && [...expectedSet].every((layer) => actualSet.has(layer))
  )
}

const canonicalScenarioId = /^TC-FST-\d{3}$/
const canonicalJourneyId = /^RP-FST-\d{2}$/

const readManifest = (input: ManifestInput): unknown => {
  if (typeof input !== 'string') {
    return input
  }

  const source = input.trim()
  if (source.startsWith('{')) {
    return JSON.parse(source)
  }

  return JSON.parse(readFileSync(resolve(source), 'utf8'))
}

const addReferenceIssues = (
  issues: FilterSearchTestMatrixIssue[],
  caseId: string,
  references: string[],
  rootDir: string,
  artifacts: FilterSearchTestMatrixArtifact[],
  expectedKind: FilterSearchTestMatrixArtifact['kind'],
  referencedArtifactPaths: Set<string>,
  requiresPassedResult: boolean
) => {
  for (const reference of references) {
    const target = resolve(rootDir, reference)
    let outsideRoot = isAbsolute(reference) || relative(rootDir, target).startsWith('../')
    if (!outsideRoot && existsSync(target)) {
      outsideRoot = relative(realpathSync(rootDir), realpathSync(target)).startsWith('../')
    }

    if (outsideRoot || !existsSync(target)) {
      issues.push({
        code: 'reference_missing',
        caseId,
        reference,
        message: `Case ${caseId} references missing file: ${reference}`,
      })
    } else if (!statSync(target).isFile()) {
      issues.push({
        code: 'reference_not_file',
        caseId,
        reference,
        message: `Case ${caseId} references a non-file path: ${reference}`,
      })
    }

    const artifact = artifacts.find((entry) => entry.path === reference)
    if (!artifact || !artifact.caseIds.includes(caseId)) {
      issues.push({
        code: 'artifact_unjoined',
        caseId,
        reference,
        message: `Case ${caseId} reference is not joined to an owned artifact: ${reference}`,
      })
    } else {
      referencedArtifactPaths.add(reference)
      if (artifact.kind !== expectedKind) {
        issues.push({
          code: 'artifact_kind_mismatch',
          caseId,
          reference,
          message: `Case ${caseId} reference has artifact kind ${artifact.kind}, expected ${expectedKind}.`,
        })
      }
      if (requiresPassedResult && artifact.result !== 'passed') {
        issues.push({
          code: 'artifact_result_invalid',
          caseId,
          reference,
          message: `Required case ${caseId} cannot use artifact ${artifact.id} with result ${String(artifact.result)} as closure evidence.`,
        })
      }
    }
  }
}

export const validateFilterSearchTestMatrixManifest = (
  input: ManifestInput,
  options: { rootDir?: string } = {}
): FilterSearchTestMatrixValidationReport => {
  const issues: FilterSearchTestMatrixIssue[] = []
  let raw: unknown

  try {
    raw = readManifest(input)
  } catch (error) {
    return {
      valid: false,
      issues: [
        {
          code: 'manifest_invalid',
          message: `Manifest could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    }
  }

  if (
    !isRecord(raw) ||
    raw['version'] !== 1 ||
    !nonEmptyString(raw['releaseId']) ||
    !nonEmptyString(raw['approver']) ||
    !nonEmptyString(raw['closureAuthority']) ||
    !stringArray(raw['matrixCaseIds']) ||
    !Array.isArray(raw['cases']) ||
    !Array.isArray(raw['artifacts'])
  ) {
    return {
      valid: false,
      issues: [
        {
          code: 'manifest_invalid',
          message: 'Manifest requires version 1, releaseId, matrixCaseIds, and cases.',
        },
      ],
    }
  }

  const matrixCaseIds = new Set(raw['matrixCaseIds'])
  if (matrixCaseIds.size !== raw['matrixCaseIds'].length) {
    issues.push({ code: 'case_id_duplicate', message: 'matrixCaseIds contains duplicate IDs.' })
  }
  const seenCaseIds = new Set<string>()
  const artifacts: FilterSearchTestMatrixArtifact[] = []
  const referencedArtifactPaths = new Set<string>()
  const artifactIds = new Set<string>()
  const artifactPaths = new Set<string>()

  for (const artifactValue of raw['artifacts']) {
    if (
      !isRecord(artifactValue) ||
      !nonEmptyString(artifactValue['id']) ||
      !nonEmptyString(artifactValue['path']) ||
      !nonEmptyString(artifactValue['evidenceOwner']) ||
      !stringArray(artifactValue['caseIds']) ||
      !['test', 'role_play', 'screenshot'].includes(String(artifactValue['kind']))
    ) {
      issues.push({
        code: 'manifest_invalid',
        message: 'Every artifact requires id, kind, caseIds, path and evidenceOwner.',
      })
      continue
    }

    const artifact = artifactValue as unknown as FilterSearchTestMatrixArtifact
    if (artifactIds.has(artifact.id)) {
      issues.push({
        code: 'artifact_id_duplicate',
        reference: artifact.path,
        message: `Artifact ID is duplicated: ${artifact.id}.`,
      })
    }
    if (artifactPaths.has(artifact.path)) {
      issues.push({
        code: 'artifact_orphan',
        reference: artifact.path,
        message: `Artifact path is duplicated: ${artifact.path}.`,
      })
    }
    artifactIds.add(artifact.id)
    artifactPaths.add(artifact.path)
    artifacts.push(artifact)

    if (
      artifact.scenarioId !== undefined &&
      (!nonEmptyString(artifact.scenarioId) || !canonicalScenarioId.test(artifact.scenarioId))
    ) {
      issues.push({
        code: 'artifact_identity_invalid',
        reference: artifact.path,
        message: `Artifact ${artifact.id} requires a canonical TC-FST-### scenarioId.`,
      })
    }
    if (
      (artifact.kind === 'role_play' || artifact.kind === 'screenshot') &&
      artifact.journeyId !== undefined &&
      (!nonEmptyString(artifact.journeyId) || !canonicalJourneyId.test(artifact.journeyId))
    ) {
      issues.push({
        code: 'artifact_identity_invalid',
        reference: artifact.path,
        message: `Artifact ${artifact.id} requires a canonical RP-FST-## journeyId.`,
      })
    }

    if (!nonEmptyString(artifact.releaseManifestId)) {
      issues.push({
        code: 'artifact_metadata_missing',
        reference: artifact.path,
        message: `Artifact ${artifact.id} requires a releaseManifestId join.`,
      })
    } else if (artifact.releaseManifestId !== raw['releaseId']) {
      issues.push({
        code: 'artifact_contract_mismatch',
        reference: artifact.path,
        message: `Artifact ${artifact.id} belongs to release ${artifact.releaseManifestId}, not ${raw['releaseId']}.`,
      })
    }

    const requiredExecutionMetadata = [
      'command',
      'environment',
      'sampleOrSeed',
      'commit',
      'runId',
      'timestamp',
      'result',
    ] as const
    if (requiredExecutionMetadata.some((field) => !nonEmptyString(artifact[field]))) {
      issues.push({
        code: 'artifact_metadata_missing',
        reference: artifact.path,
        message: `Artifact ${artifact.id} requires command, environment, sample/seed, commit, run, timestamp, and result metadata.`,
      })
    } else if (Number.isNaN(Date.parse(artifact.timestamp ?? ''))) {
      issues.push({
        code: 'artifact_metadata_invalid',
        reference: artifact.path,
        message: `Artifact ${artifact.id} requires an ISO-compatible execution timestamp.`,
      })
    }
    if (artifact.result !== 'passed' && artifact.result !== 'failed' && artifact.result !== 'skipped') {
      issues.push({
        code: 'artifact_result_invalid',
        reference: artifact.path,
        message: `Artifact ${artifact.id} requires result passed, failed, or skipped.`,
      })
    }

    if (artifact.caseIds.some((caseId) => !matrixCaseIds.has(caseId))) {
      issues.push({
        code: 'artifact_orphan',
        reference: artifact.path,
        message: `Artifact ${artifact.id} references a case outside matrixCaseIds.`,
      })
    }
    if (
      artifact.kind === 'screenshot' &&
      (!nonEmptyString(artifact.sha256) ||
        !nonEmptyString(artifact.aclPolicyId) ||
        !nonEmptyString(artifact.retentionPolicyId))
    ) {
      issues.push({
        code: 'artifact_metadata_missing',
        reference: artifact.path,
        message: `Screenshot artifact ${artifact.id} requires hash, ACL and retention metadata.`,
      })
    }
  }

  for (const caseValue of raw['cases']) {
    if (!isRecord(caseValue) || !nonEmptyString(caseValue['id'])) {
      issues.push({ code: 'manifest_invalid', message: 'Every case requires a non-empty id.' })
      continue
    }

    const caseId = caseValue['id']
    if (seenCaseIds.has(caseId)) {
      issues.push({
        code: 'case_id_duplicate',
        caseId,
        message: `Case ID is duplicated: ${caseId}`,
      })
    }
    seenCaseIds.add(caseId)

    if (!matrixCaseIds.has(caseId)) {
      issues.push({
        code: 'case_id_orphan',
        caseId,
        message: `Case ID is not in matrixCaseIds: ${caseId}`,
      })
    }

    if (!nonEmptyString(caseValue['owner'])) {
      issues.push({
        code: 'case_owner_missing',
        caseId,
        message: `Case ${caseId} requires an owner.`,
      })
    }
    if (!nonEmptyString(caseValue['evidenceOwner'])) {
      issues.push({
        code: 'case_evidence_owner_missing',
        caseId,
        message: `Case ${caseId} requires one evidence owner.`,
      })
    }
    if (!nonEmptyString(caseValue['closureRecordId'])) {
      issues.push({
        code: 'case_closure_record_missing',
        caseId,
        message: `Case ${caseId} requires one closure record.`,
      })
    }
    if (!stringArray(caseValue['requiredLayers'])) {
      issues.push({
        code: 'case_layers_missing',
        caseId,
        message: `Case ${caseId} requires at least one layer.`,
      })
    }
    const deferredCase = caseValue['applicability'] === 'deferred'
    if (!deferredCase && !stringArray(caseValue['testReferences'])) {
      issues.push({
        code: 'case_tests_missing',
        caseId,
        message: `Case ${caseId} requires test references.`,
      })
    }
    if (!deferredCase && !stringArray(caseValue['rolePlayReferences'])) {
      issues.push({
        code: 'case_role_play_missing',
        caseId,
        message: `Case ${caseId} requires RP references.`,
      })
    }
    if (!deferredCase && !stringArray(caseValue['screenshotReferences'])) {
      issues.push({
        code: 'case_screenshots_missing',
        caseId,
        message: `Case ${caseId} requires screenshot references.`,
      })
    }

    if (caseValue['applicability'] !== 'required' && caseValue['applicability'] !== 'deferred') {
      issues.push({
        code: 'manifest_invalid',
        caseId,
        message: `Case ${caseId} has invalid applicability.`,
      })
    }
    if (caseValue['applicability'] === 'deferred' && !nonEmptyString(caseValue['reason'])) {
      issues.push({
        code: 'deferred_reason_missing',
        caseId,
        message: `Deferred case ${caseId} requires a reason.`,
      })
    }

    const overrides = caseValue['layerApplicabilityOverrides']
    if (overrides !== undefined) {
      if (!Array.isArray(overrides)) {
        issues.push({
          code: 'layer_override_invalid',
          caseId,
          message: `Case ${caseId} has invalid layer applicability overrides.`,
        })
      } else {
        for (const override of overrides) {
          if (
            !isRecord(override) ||
            !nonEmptyString(override['layer']) ||
            !nonEmptyString(override['reason']) ||
            !nonEmptyString(override['evidenceOwner']) ||
            !nonEmptyString(override['qaApprover']) ||
            !nonEmptyString(override['date']) ||
            override['releaseId'] !== raw['releaseId']
          ) {
            issues.push({
              code: 'layer_override_invalid',
              caseId,
              message: `Case ${caseId} has an incomplete or cross-release layer applicability override.`,
            })
          }
        }
      }
    }

    const caseRequiredLayers = stringArray(caseValue['requiredLayers'])
      ? caseValue['requiredLayers']
      : null
    const testAndRolePlayArtifacts = artifacts.filter(
      (artifact) =>
        (artifact.kind === 'test' || artifact.kind === 'role_play') &&
        artifact.caseIds.includes(caseId)
    )
    if (caseRequiredLayers) {
      for (const artifact of testAndRolePlayArtifacts) {
        if (!exactLayerSetMatch(caseRequiredLayers, artifact.requiredLayers)) {
          issues.push({
            code: 'artifact_layer_mismatch',
            caseId,
            reference: artifact.path,
            message: `${artifact.kind} artifact ${artifact.id} must map the case required layers exactly.`,
          })
        }
      }
    }

    const screenshotArtifacts = artifacts.filter(
      (artifact) => artifact.kind === 'screenshot' && artifact.caseIds.includes(caseId)
    )
    for (const artifact of screenshotArtifacts) {
      const requiredScreenshotStrings = [
        'scenarioId',
        'journeyId',
        'checkpointId',
        'releaseClass',
        'applicabilityRecordId',
        'actor',
        'organizationIdAlias',
        'route',
        'contextId',
        'viewport',
        'browser',
        'browserVersion',
        'operatingSystem',
        'locale',
        'colorScheme',
        'fontManifestHash',
        'dataClassification',
        'seedId',
        'expectedObservation',
        'screenshotPath',
        'screenshotSha256',
        'testFile',
        'commit',
        'runId',
        'timestamp',
        'closureAuthority',
      ] as const
      const requiredScreenshotArrays = [
        'detailedCaseIds',
        'requiredLayers',
        'observedLayers',
        'negativePathIds',
        'semanticAssertions',
        'backendEvidenceRefs',
        'auditEvidenceRefs',
        'reviewerSignOffRefs',
      ] as const
      const hasMissingString = requiredScreenshotStrings.some(
        (field) => !nonEmptyString(artifact[field])
      )
      const hasMissingArray = requiredScreenshotArrays.some(
        (field) => !stringArray(artifact[field])
      )
      const validDeviceScaleFactor =
        typeof artifact.deviceScaleFactor === 'number' &&
        Number.isFinite(artifact.deviceScaleFactor) &&
        artifact.deviceScaleFactor > 0
      const validVisualEvidenceMode =
        artifact.visualEvidenceMode === 'baseline_regression' ||
        artifact.visualEvidenceMode === 'evidence_only'

      if (
        hasMissingString ||
        hasMissingArray ||
        !validDeviceScaleFactor ||
        !validVisualEvidenceMode
      ) {
        issues.push({
          code: 'artifact_metadata_missing',
          caseId,
          reference: artifact.path,
          message: `Screenshot artifact ${artifact.id} is missing required release evidence metadata.`,
        })
        continue
      }

      const detailedCaseIds = artifact.detailedCaseIds ?? []
      if (
        !detailedCaseIds.includes(caseId) ||
        detailedCaseIds.some((detailedCaseId) => !matrixCaseIds.has(detailedCaseId)) ||
        artifact.evidenceOwner !== caseValue['evidenceOwner'] ||
        artifact.closureAuthority !== raw['closureAuthority'] ||
        artifact.screenshotPath !== artifact.path ||
        artifact.screenshotSha256 !== artifact.sha256
      ) {
        issues.push({
          code: 'artifact_contract_mismatch',
          caseId,
          reference: artifact.path,
          message: `Screenshot artifact ${artifact.id} does not join the release, case ownership, or artifact identity contract.`,
        })
      }

      if (caseRequiredLayers) {
        if (!exactLayerSetMatch(caseRequiredLayers, artifact.requiredLayers)) {
          issues.push({
            code: 'artifact_layer_mismatch',
            caseId,
            reference: artifact.path,
            message: `Screenshot artifact ${artifact.id} must map the case required layers exactly.`,
          })
        }
      }

      if (artifact.visualEvidenceMode === 'baseline_regression') {
        if (
          !nonEmptyString(artifact.baselinePath) ||
          !nonEmptyString(artifact.baselineSha256) ||
          !nonEmptyString(artifact.baselineApprovalId) ||
          artifact.baselineNotApplicableReason !== null
        ) {
          issues.push({
            code: 'artifact_metadata_invalid',
            caseId,
            reference: artifact.path,
            message: `Baseline screenshot artifact ${artifact.id} requires an approved baseline and null non-applicability reason.`,
          })
        }
      } else if (
        artifact.baselinePath !== null ||
        artifact.baselineSha256 !== null ||
        artifact.baselineApprovalId !== null ||
        !nonEmptyString(artifact.baselineNotApplicableReason)
      ) {
        issues.push({
          code: 'artifact_metadata_invalid',
          caseId,
          reference: artifact.path,
          message: `Evidence-only screenshot artifact ${artifact.id} must not carry baseline metadata and requires a reason.`,
        })
      }
    }

    const rootDir = options.rootDir ?? process.cwd()
    for (const [field, expectedKind] of [
      ['testReferences', 'test'],
      ['rolePlayReferences', 'role_play'],
      ['screenshotReferences', 'screenshot'],
    ] as const) {
      if (stringArray(caseValue[field])) {
        addReferenceIssues(
          issues,
          caseId,
          caseValue[field],
          rootDir,
          artifacts,
          expectedKind,
          referencedArtifactPaths,
          caseValue['applicability'] === 'required'
        )
      }
    }
  }

  for (const artifact of artifacts) {
    if (!referencedArtifactPaths.has(artifact.path)) {
      issues.push({
        code: 'artifact_orphan',
        reference: artifact.path,
        message: `Artifact ${artifact.id} is not referenced by a matrix case.`,
      })
    }
  }

  for (const matrixCaseId of matrixCaseIds) {
    if (!seenCaseIds.has(matrixCaseId)) {
      issues.push({
        code: 'matrix_case_missing',
        caseId: matrixCaseId,
        message: `Matrix case ID has no manifest case: ${matrixCaseId}`,
      })
    }
  }

  return { valid: issues.length === 0, issues }
}

const runCli = () => {
  const manifestIndex = process.argv.indexOf('--manifest')
  const manifestPath = manifestIndex >= 0 ? process.argv[manifestIndex + 1] : undefined
  if (!manifestPath) {
    console.error('Usage: validate_filter_search_test_matrix.ts --manifest <path>')
    process.exitCode = 2
    return
  }

  const report = validateFilterSearchTestMatrixManifest(manifestPath)
  if (!report.valid) {
    for (const issue of report.issues) console.error(`${issue.code}: ${issue.message}`)
    process.exitCode = 1
    return
  }

  process.stdout.write('Filter/search test matrix manifest is valid.\n')
}

if (process.argv[1]?.endsWith('validate_filter_search_test_matrix.ts')) {
  runCli()
}
