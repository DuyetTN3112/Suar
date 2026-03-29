import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import OrgTalentsResultExplainabilitySummary from '@/apps/org/shared/components/org_talents_result_explainability_summary.svelte'

describe('OrgTalentsResultExplainabilitySummary', () => {
  it('summarizes explainability coverage for current org talent results', () => {
    render(OrgTalentsResultExplainabilitySummary, {
      props: {
        talents: [
          {
            reviewed_skills_count: 2,
            imported_skills_count: 1,
            under_dispute_skills_count: 1,
          },
          {
            reviewed_skills_count: 0,
            imported_skills_count: 3,
            under_dispute_skills_count: 0,
          },
          {
            reviewed_skills_count: 1,
            imported_skills_count: 0,
            under_dispute_skills_count: 0,
          },
        ],
      },
    })

    expect(screen.getByText('2/3 đã review')).toBeInTheDocument()
    expect(screen.getByText('1 kỹ năng đã nhập')).toBeInTheDocument()
    expect(screen.getByText('1 tranh chấp')).toBeInTheDocument()
  })
})
