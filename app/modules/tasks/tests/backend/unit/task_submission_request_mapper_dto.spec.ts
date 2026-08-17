import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildTaskSubmissionDTO } from '#modules/tasks/controllers/mappers/request/task-submissions/task_submission_request'

function fakeCtx(body: Record<string, unknown>, params: Record<string, unknown> = { taskId: 'task-1' }) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    params,
    request: {
      only(keys: string[]) {
        const picked: Record<string, unknown> = {}
        for (const key of keys) {
          if (Object.hasOwn(body, key)) picked[key] = body[key]
        }
        return picked
      },
    },
  } as never
}


function expectFieldIssue(
  assert: AssertContract,
  callback: () => unknown,
  path: string,
  message: string
): void {
  let thrown: unknown
  try {
    callback()
  } catch (error) {
    thrown = error
  }

  if (!thrown) {
    assert.fail(`Expected ValidationException for ${path}`)
  }

  assert.instanceOf(thrown, ValidationException)
  assert.deepEqual((thrown as ValidationException).issues[0], {
    code: 'E_VALIDATION',
    path,
    message,
  })
}


interface AssertContract {
  fail(message?: string): never
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instanceOf(value: unknown, cls: new (...args: any[]) => unknown): void
  deepEqual(actual: unknown, expected: unknown, message?: string): void
}


test.group('', () => {
  test('accepts canonical and legacy aliases for valid submission fields', ({ assert }) => {
    const dto = buildTaskSubmissionDTO(
      fakeCtx({
        summary: 'Submitted work',
        implementationNotes: 'Canonical alias',
        known_limitations: 'Legacy alias',
        testNotes: 'Ran unit tests',
        demo_url: 'https://example.test/demo',
        repositoryUrl: 'https://example.test/repo',
        pull_request_url: 'https://example.test/pr',
        evidences: [
          {
            evidenceType: 'pull_request',
            url: 'https://example.test/evidence',
            title: 'PR',
            description: 'Ready for review',
          },
        ],
      }),
      true
    )

    assert.deepEqual(dto, {
      task_id: 'task-1',
      summary: 'Submitted work',
      implementation_notes: 'Canonical alias',
      known_limitations: 'Legacy alias',
      test_notes: 'Ran unit tests',
      demo_url: 'https://example.test/demo',
      repository_url: 'https://example.test/repo',
      pull_request_url: 'https://example.test/pr',
      submit: true,
      evidences: [
        {
          evidence_type: 'pull_request',
          url: 'https://example.test/evidence',
          title: 'PR',
          description: 'Ready for review',
        },
      ],
    })
  })

  test('rejects non-string summary runtime values instead of coercing them', ({ assert }) => {
    for (const value of [{ text: 'bad' }, ['bad'], 42, true, false]) {
      expectFieldIssue(assert, () => buildTaskSubmissionDTO(fakeCtx({ summary: value }), false), 'summary', 'summary is required')
    }
  })

  test('rejects optional text fields with the wrong runtime type', ({ assert }) => {
    const invalidCases = [
      ['implementationNotes', 'implementation_notes'],
      ['implementation_notes', 'implementation_notes'],
      ['knownLimitations', 'known_limitations'],
      ['known_limitations', 'known_limitations'],
      ['testNotes', 'test_notes'],
      ['test_notes', 'test_notes'],
      ['demoUrl', 'demo_url'],
      ['demo_url', 'demo_url'],
      ['repositoryUrl', 'repository_url'],
      ['repository_url', 'repository_url'],
      ['pullRequestUrl', 'pull_request_url'],
      ['pull_request_url', 'pull_request_url'],
    ] as const

    for (const [inputKey, issuePath] of invalidCases) {
      expectFieldIssue(
        assert,
        () => buildTaskSubmissionDTO(fakeCtx({ summary: 'ok', [inputKey]: 42 }), false),
        issuePath,
        `${issuePath} must be a string`
      )
    }
  })

  test('rejects evidence collections that exceed the submission mapper cap', ({ assert }) => {
    expectFieldIssue(
      assert,
      () =>
        buildTaskSubmissionDTO(
          fakeCtx({
            summary: 'ok',
            evidences: Array.from({ length: 26 }, (_, index) => ({
              evidenceType: 'pull_request',
              url: `https://example.test/evidence-${index}`,
            })),
          }),
          true
        ),
      'evidences',
      'evidences cannot exceed 25 items'
    )
  })

  test('rejects overlong submission text fields with canonical issue paths', ({ assert }) => {
    expectFieldIssue(
      assert,
      () => buildTaskSubmissionDTO(fakeCtx({ summary: 'a'.repeat(4001) }), false),
      'summary',
      'summary cannot exceed 4000 characters'
    )

    expectFieldIssue(
      assert,
      () =>
        buildTaskSubmissionDTO(
          fakeCtx({
            summary: 'ok',
            implementationNotes: 'a'.repeat(8001),
          }),
          false
        ),
      'implementation_notes',
      'implementation_notes cannot exceed 8000 characters'
    )

    expectFieldIssue(
      assert,
      () =>
        buildTaskSubmissionDTO(
          fakeCtx({
            summary: 'ok',
            evidences: [
              {
                evidenceType: 'pull_request',
                url: 'https://example.test/evidence',
                title: 'a'.repeat(501),
              },
            ],
          }),
          true
        ),
      'evidences.0.title',
      'evidences.0.title cannot exceed 500 characters'
    )
  })


})
