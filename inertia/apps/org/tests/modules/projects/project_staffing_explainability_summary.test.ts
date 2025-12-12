import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import ProjectStaffingExplainabilitySummary from '@/apps/org/modules/projects/components/project_staffing_explainability_summary.svelte'

describe('ProjectStaffingExplainabilitySummary', () => {
  it('summarizes reviewed, imported-only, and dispute member coverage', () => {
    render(ProjectStaffingExplainabilitySummary, {
      props: {
        members: [
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
    expect(screen.getByText('1 imported')).toBeInTheDocument()
    expect(screen.getByText('1 dispute')).toBeInTheDocument()
  })
})
