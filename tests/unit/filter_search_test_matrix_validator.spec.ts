import { test } from '@japa/runner'

import {
  validateFilterSearchTestMatrixManifest,
  type FilterSearchTestMatrixManifest,
} from '../../scripts/filtering/validate_filter_search_test_matrix.js'

const validManifest = (): FilterSearchTestMatrixManifest => ({
  version: 1,
  releaseId: 'FST-TEST',
  approver: 'FST-COORD',
  closureAuthority: 'QA-FST',
  matrixCaseIds: ['TC-FST-001'],
  cases: [
    {
      id: 'TC-FST-001',
      applicability: 'required',
      owner: 'WP-26E',
      evidenceOwner: 'WP-26E',
      closureRecordId: 'closure-FST-TEST-001',
      requiredLayers: ['U', 'RP', 'VS'],
      testReferences: ['scripts/filtering/validate_filter_search_test_matrix.ts'],
      rolePlayReferences: ['scripts/filtering/fixtures/matrix_validator_roleplay.spec.ts'],
      screenshotReferences: ['scripts/filtering/fixtures/matrix-validator-screenshot.json'],
    },
  ],
  artifacts: [
    {
      id: 'test-artifact',
      kind: 'test',
      caseIds: ['TC-FST-001'],
      path: 'scripts/filtering/validate_filter_search_test_matrix.ts',
      evidenceOwner: 'WP-26E',
      releaseManifestId: 'FST-TEST',
      requiredLayers: ['U', 'RP', 'VS'],
      command: 'pnpm test --filter search-center',
      environment: 'test-fixture',
      sampleOrSeed: 'seed-FST-TEST-001',
      commit: 'test-commit',
      runId: 'run-FST-TEST-test',
      timestamp: '2026-08-09T00:00:00.000Z',
      result: 'passed',
    },
    {
      id: 'roleplay-artifact',
      kind: 'role_play',
      caseIds: ['TC-FST-001'],
      path: 'scripts/filtering/fixtures/matrix_validator_roleplay.spec.ts',
      evidenceOwner: 'WP-26E',
      releaseManifestId: 'FST-TEST',
      requiredLayers: ['U', 'RP', 'VS'],
      journeyId: 'RP-FST-02',
      command: 'pnpm exec playwright test matrix-validator-roleplay',
      environment: 'test-fixture',
      sampleOrSeed: 'seed-FST-TEST-001',
      commit: 'test-commit',
      runId: 'run-FST-TEST-roleplay',
      timestamp: '2026-08-09T00:00:00.000Z',
      result: 'passed',
    },
    {
      id: 'screenshot-artifact',
      kind: 'screenshot',
      caseIds: ['TC-FST-001'],
      path: 'scripts/filtering/fixtures/matrix-validator-screenshot.json',
      evidenceOwner: 'WP-26E',
      scenarioId: 'TC-FST-001',
      journeyId: 'RP-FST-02',
      checkpointId: 'CP-FST-TEST-001',
      detailedCaseIds: ['TC-FST-001'],
      releaseClass: 'initial_required',
      releaseManifestId: 'FST-TEST',
      applicabilityRecordId: 'app-FST-TEST-001',
      requiredLayers: ['U', 'RP', 'VS'],
      observedLayers: ['evidence-U-001', 'evidence-RP-001', 'evidence-VS-001'],
      negativePathIds: ['NEG-FST-TEST-001'],
      actor: 'ACT-USER',
      organizationIdAlias: 'org-test',
      route: '/test/filter',
      contextId: 'context-test',
      viewport: '1280x720',
      deviceScaleFactor: 1,
      browser: 'chromium',
      browserVersion: 'test',
      operatingSystem: 'linux',
      locale: 'en-US',
      colorScheme: 'light',
      fontManifestHash: 'font-hash',
      dataClassification: 'synthetic-test',
      seedId: 'seed-FST-TEST-001',
      expectedObservation: 'The filtered result remains visible.',
      semanticAssertions: ['heading-visible'],
      screenshotPath: 'scripts/filtering/fixtures/matrix-validator-screenshot.json',
      screenshotSha256: 'hash',
      visualEvidenceMode: 'evidence_only',
      baselinePath: null,
      baselineSha256: null,
      baselineApprovalId: null,
      baselineNotApplicableReason: 'Dynamic test fixture state.',
      backendEvidenceRefs: ['backend-FST-TEST-001'],
      auditEvidenceRefs: ['audit-FST-TEST-001'],
      testFile: 'scripts/filtering/fixtures/matrix_validator_roleplay.spec.ts',
      command: 'pnpm exec playwright test matrix-validator-roleplay',
      environment: 'test-fixture',
      sampleOrSeed: 'seed-FST-TEST-001',
      result: 'passed',
      commit: 'test-commit',
      runId: 'run-FST-TEST-001',
      timestamp: '2026-08-09T00:00:00.000Z',
      closureAuthority: 'QA-FST',
      reviewerSignOffRefs: ['review-FST-TEST-001'],
      sha256: 'hash',
      aclPolicyId: 'restricted-test-evidence',
      retentionPolicyId: 'test-evidence-30d',
    },
  ],
})

const firstCase = (manifest: FilterSearchTestMatrixManifest) => {
  const value = manifest.cases[0]
  if (!value) throw new Error('test manifest must contain one case')
  return value
}

const firstArtifact = (manifest: FilterSearchTestMatrixManifest) => {
  const value = manifest.artifacts[0]
  if (!value) throw new Error('test manifest must contain one artifact')
  return value
}

const secondArtifact = (manifest: FilterSearchTestMatrixManifest) => {
  const value = manifest.artifacts[1]
  if (!value) throw new Error('test manifest must contain two artifacts')
  return value
}

test.group('Filter/search test-matrix validator', () => {
  test('accepts a complete machine-readable case manifest', ({ assert }) => {
    const report = validateFilterSearchTestMatrixManifest(validManifest())

    assert.isTrue(report.valid)
    assert.isEmpty(report.issues)
  })

  test('rejects failed or skipped artifacts as required closure evidence', ({ assert }) => {
    const manifest = validManifest()
    firstArtifact(manifest).result = 'failed'
    secondArtifact(manifest).result = 'skipped'
    const screenshot = manifest.artifacts[2]
    if (!screenshot) throw new Error('test manifest must contain a screenshot artifact')
    screenshot.result = 'failed'

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.equal(
      report.issues.filter((issue) => issue.code === 'artifact_result_invalid').length,
      3
    )
  })

  test('rejects a test artifact without a release-manifest join', ({ assert }) => {
    const manifest = validManifest()
    delete (firstArtifact(manifest) as Partial<(typeof manifest.artifacts)[number]>).releaseManifestId

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'artifact_metadata_missing'
    )
  })

  test('rejects a role-play artifact joined to another release', ({ assert }) => {
    const manifest = validManifest()
    secondArtifact(manifest).releaseManifestId = 'different-release'

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'artifact_contract_mismatch'
    )
  })

  test('rejects an unknown artifact result value', ({ assert }) => {
    const manifest = validManifest()
    ;(firstArtifact(manifest) as unknown as { result: string }).result = 'done'

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'artifact_result_invalid'
    )
  })

  test('rejects non-canonical scenario and journey identities', ({ assert }) => {
    const manifest = validManifest()
    firstArtifact(manifest).scenarioId = 'scenario-search'
    secondArtifact(manifest).journeyId = 'journey-search'
    const screenshot = manifest.artifacts[2]
    if (!screenshot) throw new Error('test manifest must contain a screenshot artifact')
    screenshot.journeyId = 'RP-FST-2'

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.equal(
      report.issues.filter((issue) => issue.code === 'artifact_identity_invalid').length,
      3
    )
  })

  test('rejects a required case missing owner, layers, tests, RP, or screenshots', ({ assert }) => {
    const manifest = validManifest()
    manifest.cases[0] = {
      ...firstCase(manifest),
      owner: '',
      requiredLayers: [],
      testReferences: [],
      rolePlayReferences: [],
      screenshotReferences: [],
    }
    manifest.artifacts = []

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.sameMembers(
      report.issues.map((issue) => issue.code),
      [
        'case_owner_missing',
        'case_layers_missing',
        'case_tests_missing',
        'case_role_play_missing',
        'case_screenshots_missing',
      ]
    )
  })

  test('rejects missing referenced files', ({ assert }) => {
    const manifest = validManifest()
    firstCase(manifest).testReferences = ['scripts/filtering/fixtures/not-found.test.ts']

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'reference_missing'
    )
  })

  test('rejects orphan case IDs in either direction', ({ assert }) => {
    const manifest = validManifest()
    manifest.matrixCaseIds = ['TC-FST-001', 'TC-FST-002']
    firstCase(manifest).id = 'TC-FST-003'
    manifest.artifacts = []

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.sameMembers(
      report.issues.map((issue) => issue.code),
      [
        'matrix_case_missing',
        'case_id_orphan',
        'matrix_case_missing',
        'artifact_unjoined',
        'artifact_unjoined',
        'artifact_unjoined',
      ]
    )
  })

  test('rejects duplicate IDs in the matrix case list', ({ assert }) => {
    const manifest = validManifest()
    manifest.matrixCaseIds = ['TC-FST-001', 'TC-FST-001']

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'case_id_duplicate'
    )
  })

  test('rejects an evidence artifact that is not joined to a matrix case', ({ assert }) => {
    const manifest = validManifest()
    manifest.artifacts = [
      {
        id: 'orphan-artifact',
        kind: 'test',
        caseIds: ['TC-FST-999'],
        path: 'scripts/filtering/fixtures/matrix-validator.test.ts',
        evidenceOwner: 'WP-26E',
        releaseManifestId: 'FST-TEST',
        command: 'pnpm test --filter orphan',
        environment: 'test-fixture',
        sampleOrSeed: 'seed-FST-TEST-001',
        commit: 'test-commit',
        runId: 'run-FST-TEST-orphan',
        timestamp: '2026-08-09T00:00:00.000Z',
        result: 'passed',
      },
    ]

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'artifact_orphan'
    )
  })

  test('rejects an unreferenced artifact and a reference with the wrong artifact kind', ({
    assert,
  }) => {
    const manifest = validManifest()
    firstCase(manifest).screenshotReferences = [
      'scripts/filtering/validate_filter_search_test_matrix.ts',
    ]
    manifest.artifacts.push({
      id: 'unreferenced-artifact',
      kind: 'test',
      caseIds: ['TC-FST-001'],
      path: 'scripts/filtering/fixtures/matrix-validator-screenshot.json',
      evidenceOwner: 'WP-26E',
    })

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'artifact_kind_mismatch'
    )
    assert.include(
      report.issues.map((issue) => issue.code),
      'artifact_orphan'
    )
  })

  test('rejects duplicate artifact identity and missing release authority', ({ assert }) => {
    const manifest = validManifest()
    manifest.approver = ''
    manifest.artifacts.push({
      ...firstArtifact(manifest),
      id: secondArtifact(manifest).id,
    })

    const missingAuthorityReport = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(missingAuthorityReport.valid)
    assert.include(
      missingAuthorityReport.issues.map((issue) => issue.code),
      'manifest_invalid'
    )

    manifest.approver = 'FST-COORD'
    const duplicateArtifactReport = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(duplicateArtifactReport.valid)
    assert.include(
      duplicateArtifactReport.issues.map((issue) => issue.code),
      'artifact_id_duplicate'
    )
  })

  test('rejects deferred rows without reason and owner', ({ assert }) => {
    const manifest = validManifest()
    manifest.cases[0] = {
      ...firstCase(manifest),
      applicability: 'deferred',
      owner: '',
      testReferences: [],
      rolePlayReferences: [],
      screenshotReferences: [],
      reason: '',
    }
    manifest.artifacts = []

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.sameMembers(
      report.issues.map((issue) => issue.code),
      ['case_owner_missing', 'deferred_reason_missing']
    )
  })

  test('requires one case evidence owner and closure record', ({ assert }) => {
    const manifest = validManifest()
    const currentCase = firstCase(manifest)
    currentCase.evidenceOwner = ''
    currentCase.closureRecordId = ''

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'case_evidence_owner_missing'
    )
    assert.include(
      report.issues.map((issue) => issue.code),
      'case_closure_record_missing'
    )
  })

  test('rejects test and role-play artifacts without execution metadata', ({ assert }) => {
    const manifest = validManifest()
    delete manifest.artifacts[0]?.command
    delete manifest.artifacts[1]?.sampleOrSeed

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.equal(
      report.issues.filter((issue) => issue.code === 'artifact_metadata_missing').length,
      2
    )
  })

  test('rejects non-ISO execution timestamps', ({ assert }) => {
    const manifest = validManifest()
    const artifact = firstArtifact(manifest)
    artifact.timestamp = 'not-a-timestamp'

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'artifact_metadata_invalid'
    )
  })

  test('requires screenshot release, layer, provenance, and reviewer evidence fields', ({
    assert,
  }) => {
    const manifest = validManifest()
    const screenshot = manifest.artifacts[2]
    if (!screenshot) throw new Error('test manifest must contain a screenshot artifact')
    screenshot.releaseManifestId = ''
    screenshot.observedLayers = []
    screenshot.backendEvidenceRefs = []
    screenshot.reviewerSignOffRefs = []

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'artifact_metadata_missing'
    )
  })

  test('enforces conditional screenshot visual evidence mode fields', ({ assert }) => {
    const evidenceOnlyManifest = validManifest()
    const evidenceOnlyScreenshot = evidenceOnlyManifest.artifacts[2]
    if (!evidenceOnlyScreenshot) throw new Error('test manifest must contain a screenshot artifact')
    evidenceOnlyScreenshot.baselinePath = 'forbidden-baseline.png'

    const evidenceOnlyReport = validateFilterSearchTestMatrixManifest(evidenceOnlyManifest)

    assert.isFalse(evidenceOnlyReport.valid)
    assert.include(
      evidenceOnlyReport.issues.map((issue) => issue.code),
      'artifact_metadata_invalid'
    )

    const baselineManifest = validManifest()
    const baselineScreenshot = baselineManifest.artifacts[2]
    if (!baselineScreenshot) throw new Error('test manifest must contain a screenshot artifact')
    baselineScreenshot.visualEvidenceMode = 'baseline_regression'
    baselineScreenshot.baselineNotApplicableReason = 'not-null'
    baselineScreenshot.baselinePath = 'baseline.png'
    baselineScreenshot.baselineSha256 = 'baseline-hash'
    baselineScreenshot.baselineApprovalId = 'approval-FST-TEST-001'

    const baselineReport = validateFilterSearchTestMatrixManifest(baselineManifest)

    assert.isFalse(baselineReport.valid)
    assert.include(
      baselineReport.issues.map((issue) => issue.code),
      'artifact_metadata_invalid'
    )
  })

  test('joins screenshot evidence to release, case ownership, and the referenced file', ({
    assert,
  }) => {
    const manifest = validManifest()
    const screenshot = manifest.artifacts[2]
    if (!screenshot) throw new Error('test manifest must contain a screenshot artifact')
    screenshot.releaseManifestId = 'different-release'
    screenshot.detailedCaseIds = ['TC-FST-999']
    screenshot.evidenceOwner = 'different-owner'
    screenshot.closureAuthority = 'different-authority'
    screenshot.screenshotPath = 'different/path.png'
    screenshot.screenshotSha256 = 'different-hash'

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'artifact_contract_mismatch'
    )
  })

  test('rejects screenshot evidence whose required layers do not match the case', ({ assert }) => {
    const manifest = validManifest()
    const screenshot = manifest.artifacts[2]
    if (!screenshot) throw new Error('test manifest must contain a screenshot artifact')
    screenshot.requiredLayers = ['U', 'RP']

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'artifact_layer_mismatch'
    )
  })

  test('rejects test and role-play evidence whose required layers do not match the case', ({
    assert,
  }) => {
    const manifest = validManifest()
    delete firstArtifact(manifest).requiredLayers
    secondArtifact(manifest).requiredLayers = ['U', 'RP']

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.equal(
      report.issues.filter((issue) => issue.code === 'artifact_layer_mismatch').length,
      2
    )
  })

  test('rejects an incomplete layer applicability override', ({ assert }) => {
    const manifest = validManifest()
    firstCase(manifest).layerApplicabilityOverrides = [
      {
        layer: 'AX',
        reason: '',
        evidenceOwner: 'WP-26E',
        qaApprover: 'QA-FST',
        date: '2026-08-09',
        releaseId: 'FST-TEST',
      },
    ]

    const report = validateFilterSearchTestMatrixManifest(manifest)

    assert.isFalse(report.valid)
    assert.include(
      report.issues.map((issue) => issue.code),
      'layer_override_invalid'
    )
  })
})
