/* eslint-disable @unicorn/filename-case */

import { test } from '@japa/runner'

import {
  validateFilterSearchTestMatrixManifest,
  type FilterSearchTestMatrixArtifact,
  type FilterSearchTestMatrixManifest,
} from '../validate_filter_search_test_matrix.js'

const CASE_ID = 'TC-FST-002'
const TEST_PATH = 'app/modules/search/tests/backend/integration/search_center_keyword_only.spec.ts'
const ROLE_PLAY_PATH =
  'inertia/apps/user/tests/e2e/filter_search_taxonomy/search_center_keyword_only_roleplay.spec.ts'
const SCREENSHOT_PATH = 'scripts/filtering/fixtures/matrix-validator-screenshot.json'

function screenshotArtifact(
  overrides: Partial<FilterSearchTestMatrixArtifact> = {}
): FilterSearchTestMatrixArtifact {
  return {
    id: 'artifact-screenshot-1',
    kind: 'screenshot',
    caseIds: [CASE_ID],
    path: SCREENSHOT_PATH,
    evidenceOwner: 'WP-26E',
    sha256: 'sha256-fixture',
    aclPolicyId: 'acl-test-only',
    retentionPolicyId: 'retention-test-only',
    scenarioId: 'TC-FST-002',
    journeyId: 'RP-FST-02',
    checkpointId: 'checkpoint-keyword',
    detailedCaseIds: [CASE_ID],
    releaseClass: 'initial_required',
    releaseManifestId: 'release-test-1',
    applicabilityRecordId: 'applicability-test-1',
    requiredLayers: ['U', 'IT', 'RP', 'VS'],
    observedLayers: ['U', 'IT', 'RP', 'VS'],
    negativePathIds: ['NEG-SEARCH-001'],
    actor: 'ACT-USER',
    organizationIdAlias: 'ORG-SUAR',
    route: '/search',
    contextId: 'search.blended.global',
    viewport: '1440x900',
    deviceScaleFactor: 1,
    browser: 'chromium',
    browserVersion: 'fixture',
    operatingSystem: 'linux',
    locale: 'en-US',
    colorScheme: 'light',
    fontManifestHash: 'font-fixture',
    dataClassification: 'internal',
    seedId: 'seed-search-1',
    expectedObservation: 'Search result is rendered',
    semanticAssertions: ['result-visible'],
    screenshotPath: SCREENSHOT_PATH,
    screenshotSha256: 'sha256-fixture',
    visualEvidenceMode: 'evidence_only',
    baselinePath: null,
    baselineSha256: null,
    baselineApprovalId: null,
    baselineNotApplicableReason: 'No approved visual baseline in validator fixture',
    backendEvidenceRefs: ['backend-search-1'],
    auditEvidenceRefs: ['audit-search-1'],
    testFile: TEST_PATH,
    command: 'pnpm exec playwright test search-center',
    environment: 'test-fixture',
    sampleOrSeed: 'seed-search-1',
    result: 'passed',
    commit: 'fixture-commit',
    runId: 'fixture-run',
    timestamp: '2026-08-09T00:00:00.000Z',
    closureAuthority: 'WP-26F',
    reviewerSignOffRefs: ['reviewer-fixture'],
    ...overrides,
  }
}

function validManifest(): FilterSearchTestMatrixManifest {
  return {
    version: 1,
    releaseId: 'release-test-1',
    approver: 'QA-COORDINATOR',
    closureAuthority: 'WP-26F',
    matrixCaseIds: [CASE_ID],
    cases: [
      {
        id: CASE_ID,
        applicability: 'required',
        owner: 'WP-17',
        evidenceOwner: 'WP-26E',
        closureRecordId: 'closure-test-1',
        requiredLayers: ['U', 'IT', 'RP', 'VS'],
        testReferences: [TEST_PATH],
        rolePlayReferences: [ROLE_PLAY_PATH],
        screenshotReferences: [SCREENSHOT_PATH],
      },
    ],
    artifacts: [
      {
        id: 'artifact-test-1',
        kind: 'test',
        caseIds: [CASE_ID],
        path: TEST_PATH,
        evidenceOwner: 'WP-26E',
        releaseManifestId: 'release-test-1',
        requiredLayers: ['U', 'IT', 'RP', 'VS'],
        command: 'pnpm test --filter search-center',
        environment: 'test-fixture',
        sampleOrSeed: 'seed-search-1',
        commit: 'fixture-commit',
        runId: 'fixture-run-test',
        timestamp: '2026-08-09T00:00:00.000Z',
        result: 'passed',
      },
      {
        id: 'artifact-roleplay-1',
        kind: 'role_play',
        caseIds: [CASE_ID],
        path: ROLE_PLAY_PATH,
        evidenceOwner: 'WP-26E',
        releaseManifestId: 'release-test-1',
        requiredLayers: ['U', 'IT', 'RP', 'VS'],
        command: 'pnpm exec playwright test search-center',
        environment: 'test-fixture',
        sampleOrSeed: 'seed-search-1',
        commit: 'fixture-commit',
        runId: 'fixture-run-roleplay',
        timestamp: '2026-08-09T00:00:00.000Z',
        result: 'passed',
      },
      screenshotArtifact(),
    ],
  }
}

function issueCodes(manifest: FilterSearchTestMatrixManifest): string[] {
  return validateFilterSearchTestMatrixManifest(manifest, { rootDir: process.cwd() }).issues.map(
    ({ code }) => code
  )
}

function firstCase(manifest: FilterSearchTestMatrixManifest) {
  const value = manifest.cases[0]
  if (!value) throw new Error('Validator fixture case is missing')
  return value
}

function artifactAt(manifest: FilterSearchTestMatrixManifest, index: number) {
  const value = manifest.artifacts[index]
  if (!value) throw new Error(`Validator fixture artifact ${index} is missing`)
  return value
}

test.group('Filter/search matrix validator', () => {
  test('accepts a complete joined fixture manifest', ({ assert }) => {
    const report = validateFilterSearchTestMatrixManifest(validManifest())
    assert.isTrue(report.valid)
    assert.deepEqual(report.issues, [])
  })

  test('requires every artifact referenced by a required case to have passed', ({ assert }) => {
    const manifest = validManifest()
    artifactAt(manifest, 0).result = 'failed'
    artifactAt(manifest, 1).result = 'skipped'
    artifactAt(manifest, 2).result = 'failed'

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.equal(
      report.issues.filter((issue) => issue.code === 'artifact_result_invalid').length,
      3
    )

    const deferredManifest = validManifest()
    const deferredCase = firstCase(deferredManifest)
    deferredCase.applicability = 'deferred'
    deferredCase.reason = 'Evidence is scheduled for a later release train'
    artifactAt(deferredManifest, 0).result = 'failed'
    artifactAt(deferredManifest, 1).result = 'skipped'
    artifactAt(deferredManifest, 2).result = 'failed'
    assert.isTrue(validateFilterSearchTestMatrixManifest(deferredManifest).valid)
  })

  test('rejects an artifact result outside the runtime result enum', ({ assert }) => {
    const manifest = validManifest()
    ;(artifactAt(manifest, 0) as unknown as { result: string }).result = 'done'

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'artifact_result_invalid'
    )
  })

  test('rejects malformed top-level manifests', ({ assert }) => {
    const manifest = validManifest() as unknown as Record<string, unknown>
    delete manifest['version']
    assert.include(
      issueCodes(manifest as unknown as FilterSearchTestMatrixManifest),
      'manifest_invalid'
    )
  })

  test('rejects duplicate matrix case IDs', ({ assert }) => {
    const manifest = validManifest()
    manifest.matrixCaseIds.push(CASE_ID)
    assert.include(issueCodes(manifest), 'case_id_duplicate')
  })

  test('rejects duplicate case records', ({ assert }) => {
    const manifest = validManifest()
    manifest.cases.push(firstCase(manifest))
    assert.include(issueCodes(manifest), 'case_id_duplicate')
  })

  test('rejects a case absent from the matrix ID list', ({ assert }) => {
    const manifest = validManifest()
    firstCase(manifest).id = 'TC-FST-999'
    assert.include(issueCodes(manifest), 'case_id_orphan')
    assert.include(issueCodes(manifest), 'matrix_case_missing')
  })

  test('requires case ownership and closure metadata', ({ assert }) => {
    const manifest = validManifest()
    delete (manifest.cases[0] as Partial<(typeof manifest.cases)[number]>).owner
    delete (manifest.cases[0] as Partial<(typeof manifest.cases)[number]>).evidenceOwner
    delete (manifest.cases[0] as Partial<(typeof manifest.cases)[number]>).closureRecordId
    const codes = issueCodes(manifest)
    assert.include(codes, 'case_owner_missing')
    assert.include(codes, 'case_evidence_owner_missing')
    assert.include(codes, 'case_closure_record_missing')
  })

  test('requires all case evidence reference arrays', ({ assert }) => {
    const manifest = validManifest()
    firstCase(manifest).testReferences = []
    firstCase(manifest).rolePlayReferences = []
    firstCase(manifest).screenshotReferences = []
    const codes = issueCodes(manifest)
    assert.include(codes, 'case_tests_missing')
    assert.include(codes, 'case_role_play_missing')
    assert.include(codes, 'case_screenshots_missing')
  })

  test('requires a reason for deferred cases', ({ assert }) => {
    const manifest = validManifest()
    firstCase(manifest).applicability = 'deferred'
    assert.include(issueCodes(manifest), 'deferred_reason_missing')
  })

  test('allows a deferred case to carry no evidence references yet', ({ assert }) => {
    const manifest = validManifest()
    const deferredCase = firstCase(manifest)
    deferredCase.applicability = 'deferred'
    deferredCase.reason = 'Capability is outside this release train'
    deferredCase.testReferences = []
    deferredCase.rolePlayReferences = []
    deferredCase.screenshotReferences = []
    manifest.artifacts = []

    const report = validateFilterSearchTestMatrixManifest(manifest)
    assert.isTrue(report.valid)
    assert.deepEqual(report.issues, [])
  })

  test('rejects missing referenced files', ({ assert }) => {
    const manifest = validManifest()
    firstCase(manifest).testReferences = ['missing-test.ts']
    assert.include(issueCodes(manifest), 'reference_missing')
  })

  test('rejects unjoined references', ({ assert }) => {
    const manifest = validManifest()
    firstCase(manifest).testReferences = [ROLE_PLAY_PATH]
    assert.include(issueCodes(manifest), 'artifact_kind_mismatch')
  })

  test('rejects orphan artifacts', ({ assert }) => {
    const manifest = validManifest()
    manifest.artifacts.push({
      id: 'orphan-test-artifact',
      kind: 'test',
      caseIds: [CASE_ID],
      path: 'scripts/filtering/validate_filter_search_test_matrix.ts',
      evidenceOwner: 'WP-26E',
      releaseManifestId: 'release-test-1',
      requiredLayers: ['U', 'IT', 'RP', 'VS'],
    })
    assert.include(issueCodes(manifest), 'artifact_orphan')
  })

  test('rejects incomplete screenshot metadata', ({ assert }) => {
    const manifest = validManifest()
    delete artifactAt(manifest, 2).sha256
    assert.include(issueCodes(manifest), 'artifact_metadata_missing')
  })

  test('rejects test and role-play evidence whose required layers do not match the case', ({
    assert,
  }) => {
    const manifest = validManifest()
    artifactAt(manifest, 0).requiredLayers = ['U']
    artifactAt(manifest, 1).requiredLayers = ['U', 'RP']

    const codes = issueCodes(manifest)

    assert.equal(codes.filter((code) => code === 'artifact_layer_mismatch').length, 2)
  })

  test('rejects screenshot ownership and identity drift', ({ assert }) => {
    const manifest = validManifest()
    const screenshot = artifactAt(manifest, 2)
    screenshot.evidenceOwner = 'OTHER-OWNER'
    screenshot.releaseManifestId = 'other-release'
    assert.include(issueCodes(manifest), 'artifact_contract_mismatch')
  })

  test('rejects duplicate artifact IDs and paths', ({ assert }) => {
    const manifest = validManifest()
    manifest.artifacts.push({
      ...artifactAt(manifest, 0),
      path: artifactAt(manifest, 1).path,
    })
    const codes = issueCodes(manifest)
    assert.include(codes, 'artifact_id_duplicate')
    assert.include(codes, 'artifact_orphan')
  })

  test('rejects screenshot artifacts with invalid visual mode metadata', ({ assert }) => {
    const manifest = validManifest()
    const screenshot = artifactAt(manifest, 2)
    screenshot.visualEvidenceMode = 'baseline_regression'
    assert.include(issueCodes(manifest), 'artifact_metadata_invalid')
  })

  test('rejects cross-release layer applicability overrides', ({ assert }) => {
    const manifest = validManifest()
    firstCase(manifest).layerApplicabilityOverrides = [
      {
        layer: 'AX',
        reason: 'fixture',
        evidenceOwner: 'WP-26E',
        qaApprover: 'QA-COORDINATOR',
        date: '2026-08-09',
        releaseId: 'other-release',
      },
    ]
    assert.include(issueCodes(manifest), 'layer_override_invalid')
  })

})
