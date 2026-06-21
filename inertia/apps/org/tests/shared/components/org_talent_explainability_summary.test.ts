import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import OrgTalentExplainabilitySummary from '@/apps/org/shared/components/org_talent_explainability_summary.svelte'

describe('OrgTalentExplainabilitySummary', () => {
  it('renders organization-wide reviewed/imported/dispute coverage', () => {
    render(OrgTalentExplainabilitySummary, {
      props: {
        totalMembers: 8,
        reviewedMembers: 5,
        importedOnlyMembers: 2,
        underDisputeMembers: 1,
      },
    })

    expect(screen.getByText('5/8 đã review')).toBeInTheDocument()
    expect(screen.getByText('2 imported')).toBeInTheDocument()
    expect(screen.getByText('1 dispute')).toBeInTheDocument()
  })
})
