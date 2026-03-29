import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProjectRolesTab from '@/apps/org/modules/projects/components/project_roles_tab.svelte'

vi.mock('axios')
vi.mock('svelte-sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const mockedAxios = vi.mocked(axios)

describe('ProjectRolesTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    mockedAxios.get.mockImplementation((url: string) => {
      if (url === '/api/v1/projects/project-1/professional-roles') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'role-1',
                code: 'backend_lead',
                name: 'Backend Lead',
                description: 'Lead backend staffing role',
                isActive: true,
                skills: [
                  {
                    id: 'role-skill-1',
                    skill: { id: 'skill-ts', skillName: 'TypeScript' },
                    minimumLevel: {
                      id: 'lvl-1',
                      ordinal: 4,
                      code: 'l4',
                      displayName: 'Mid',
                    },
                    targetLevel: {
                      id: 'lvl-2',
                      ordinal: 8,
                      code: 'l8',
                      displayName: 'Senior',
                    },
                    assessmentCeilingLevel: null,
                    isMandatory: true,
                    importance: 'critical',
                    weight: 1,
                  },
                ],
                sourceTemplateId: null,
              },
            ],
          },
        })
      }

      if (url === '/api/v1/projects/project-1/skills') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'project-skill-ts',
                skill: { id: 'skill-ts', skillName: 'TypeScript', categoryCode: 'technology' },
                isActive: true,
              },
              {
                id: 'project-skill-api',
                skill: { id: 'skill-api', skillName: 'API Design', categoryCode: 'engineering' },
                isActive: true,
              },
            ],
          },
        })
      }

      if (url === '/api/v1/professional-role-templates') {
        return Promise.resolve({ data: { data: [] } })
      }

      if (url === '/api/v1/proficiency-scales') {
        return Promise.resolve({ data: { data: { levels: [] } } })
      }

      if (url === '/api/v1/projects/project-1/professional-roles/role-1/candidates') {
        return Promise.resolve({
          data: {
            data: {
              candidates: [
                {
                  userId: 'user-1',
                  username: 'duyet',
                  email: 'duyet@example.com',
                  source: 'project_member',
                  matchScore: 92,
                  matchedSkills: 3,
                  totalRequiredSkills: 4,
                  skillGaps: ['Leadership'],
                  reviewedSkillsCount: 2,
                  importedSkillsCount: 1,
                  underDisputeSkillsCount: 1,
                  latestConfidenceSignal: 'high',
                },
              ],
            },
          },
        })
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`))
    })
  })

  it('shows explainability badges in staffing candidates dialog', async () => {
    render(ProjectRolesTab, {
      props: {
        projectId: 'project-1',
        canEdit: false,
        projectMembers: [],
      },
    })

    const candidatesButton = await screen.findByRole('button', { name: /Ứng viên/i })
    await fireEvent.click(candidatesButton)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Tạo task/i })).toHaveAttribute(
        'href',
        '/projects/project-1/tasks?project_id=project-1&roleId=role-1&create=1&taskType=feature_development'
      )
    })

    await screen.findByText(/Ứng viên phù hợp cho vai trò/i)

    await waitFor(() => {
      expect(screen.getByText('2 reviewed · 1 imported')).toBeInTheDocument()
      expect(screen.getByText('Confidence High')).toBeInTheDocument()
      expect(screen.getByText('1 skill dispute')).toBeInTheDocument()
    })
  })

  it('does not offer role skills that are already assigned when adding a role skill', async () => {
    render(ProjectRolesTab, {
      props: {
        projectId: 'project-1',
        canEdit: true,
        projectMembers: [],
      },
    })

    const addSkillButton = await screen.findByRole('button', { name: /Thêm Skill/i })
    await fireEvent.click(addSkillButton)

    const skillSelect = await screen.findByLabelText('Chọn Skill từ Catalog')

    expect(skillSelect).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'TypeScript' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'API Design' })).toBeInTheDocument()
  })
})
