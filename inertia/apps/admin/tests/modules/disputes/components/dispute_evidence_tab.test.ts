import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import DisputeEvidenceTab from '@/apps/admin/modules/disputes/components/dispute_evidence_tab.svelte'

describe('DisputeEvidenceTab', () => {
  it('shows latest case-file evidence snapshot beside live evidences', () => {
    render(DisputeEvidenceTab, {
      props: {
        evidences: [
          {
            id: 'live-evidence-1',
            evidenceType: 'pull_request',
            url: 'https://example.com/pr/1',
            title: 'Live PR',
            description: 'Uploaded during dispute exchange.',
          },
        ],
        latestCaseFile: {
          case_version: 2,
          completeness_score: 88,
          evidences_snapshot: [
            { title: 'Snapshot PR', evidence_type: 'pull_request' },
            { title: 'Snapshot demo', evidence_type: 'demo' },
          ],
        },
      },
    })

    expect(screen.getByText('Snapshot evidence trong dossier')).toBeInTheDocument()
    expect(screen.getByText('Hồ sơ vụ việc v2')).toBeInTheDocument()
    expect(screen.getByText('Snapshot PR')).toBeInTheDocument()
    expect(screen.getByText('Snapshot demo')).toBeInTheDocument()
    expect(screen.getByText('Live PR')).toBeInTheDocument()
  })

  it('paginates long live evidence lists', () => {
    render(DisputeEvidenceTab, {
      props: {
        evidences: Array.from({ length: 11 }, (_, index) => ({
          id: `evidence-${index + 1}`,
          evidenceType: 'pull_request',
          url: `https://example.com/pr/${index + 1}`,
          title: `Live evidence ${index + 1}`,
          description: null,
        })),
        latestCaseFile: null,
      },
    })

    expect(screen.getByText('1-10 / 11')).toBeInTheDocument()
    expect(screen.getByText('Live evidence 1')).toBeInTheDocument()
    expect(screen.queryByText('Live evidence 11')).not.toBeInTheDocument()
  })
})
