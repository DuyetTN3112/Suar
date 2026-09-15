import type { ReferenceFilterRecord } from '#modules/filtering/tests/backend/contract/support/reference_filter_evaluator'

const unknown = { kind: 'unknown' } as const
const missing = { kind: 'missing' } as const

export const referenceConformanceRecords: readonly ReferenceFilterRecord[] = [
  {
    id: 'r1',
    fields: {
      tenant: 'org-a',
      status: 'open',
      title: 'TypeScript search platform',
      skills: ['TypeScript', 'typescript', 'Redis'],
      score: 10,
      createdAt: '2026-07-31T00:00:00.000Z',
      active: true,
      category: {
        kind: 'hierarchy',
        termIds: ['media:film'],
        ancestorIds: ['media', 'creative'],
      },
      applications: {
        kind: 'relation',
        records: [
          { id: 'a1', fields: { status: 'accepted', score: 9 } },
          { id: 'a2', fields: { status: 'pending', score: 4 } },
        ],
      },
    },
  },
  {
    id: 'r2',
    fields: {
      tenant: 'org-a',
      status: 'open',
      title: 'Frontend TypeScript role',
      skills: ['typescript'],
      score: 20,
      createdAt: '2026-07-20T00:00:00.000Z',
      active: true,
      category: {
        kind: 'hierarchy',
        termIds: ['media:book'],
        ancestorIds: ['media', 'creative'],
      },
      applications: {
        kind: 'relation',
        records: [{ id: 'a3', fields: { status: 'rejected', score: 2 } }],
      },
    },
  },
  {
    id: 'r3',
    fields: {
      tenant: 'org-a',
      status: 'closed',
      title: 'Known empty metadata record',
      skills: [],
      score: 20,
      createdAt: missing,
      active: false,
      category: missing,
      applications: { kind: 'relation', records: [] },
    },
  },
  {
    id: 'r4',
    fields: {
      tenant: 'org-a',
      status: 'open',
      title: 'Unknown skills record',
      skills: unknown,
      score: 30,
      createdAt: '2026-08-02T00:00:00.000Z',
      active: unknown,
      category: unknown,
      applications: { kind: 'relation', records: [] },
    },
  },
  {
    id: 'r5',
    fields: {
      tenant: 'org-a',
      status: 'open',
      title: 'Vue PostgreSQL TypeScript discovery',
      skills: ['vue', 'typescript', 'postgresql'],
      score: 20,
      createdAt: '2026-08-01T12:00:00.000Z',
      active: unknown,
      category: {
        kind: 'hierarchy',
        termIds: ['media:film'],
        ancestorIds: ['media', 'creative'],
      },
      applications: {
        kind: 'relation',
        records: [{ id: 'a4', fields: { status: 'accepted', score: 7 } }],
      },
    },
  },
  {
    id: 'r6',
    fields: {
      tenant: 'org-a',
      status: 'archived',
      title: 'Redis operations archive',
      skills: ['redis'],
      score: 5,
      createdAt: '2025-01-01T00:00:00.000Z',
      active: false,
      category: {
        kind: 'hierarchy',
        termIds: ['operations:database'],
        ancestorIds: ['operations'],
      },
      applications: missing,
    },
  },
  ...['r7', 'r8', 'r9', 'r10'].map((id, index) => ({
    id,
    fields: {
      tenant: 'org-secret',
      status: index % 2 === 0 ? 'open' : 'closed',
      title: `Private acquisition ${index}`,
      skills: ['secret-skill', 'typescript'],
      score: 100 + index,
      createdAt: '2026-07-31T00:00:00.000Z',
      active: true,
      category: {
        kind: 'hierarchy' as const,
        termIds: ['secret:category'],
        ancestorIds: ['secret'],
      },
      applications: { kind: 'relation' as const, records: [] },
    },
  })),
]
