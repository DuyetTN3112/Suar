import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import ProjectMemberSetupPreview from '@/apps/org/modules/projects/components/project_member_setup_preview.svelte'

describe('ProjectMemberSetupPreview', () => {
  it('renders selected member explainability alongside governance and delivery roles', () => {
    render(ProjectMemberSetupPreview, {
      props: {
        candidate: {
          userId: 'user-1',
          username: 'duyet',
          email: 'duyet@example.com',
          orgRole: 'org_member',
          reviewedSkillsCount: 2,
          importedSkillsCount: 1,
          underDisputeSkillsCount: 1,
          latestConfidenceSignal: 'high',
        },
        governanceRole: 'project_member',
        deliveryRoleName: 'Backend Lead',
      },
    })

    expect(screen.getByText('duyet')).toBeInTheDocument()
    expect(screen.getByText('duyet@example.com')).toBeInTheDocument()
    expect(screen.getByText('project_member')).toBeInTheDocument()
    expect(screen.getByText('Backend Lead')).toBeInTheDocument()
    expect(screen.getByText('2 reviewed · 1 imported')).toBeInTheDocument()
    expect(screen.getByText('Confidence High')).toBeInTheDocument()
    expect(screen.getByText('1 skill dispute')).toBeInTheDocument()
  })
})
